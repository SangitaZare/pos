import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../api.service';
import { RealtimeService } from '../realtime.service';
import { CartLine, Product, Sale } from '../models';

@Component({
  selector: 'app-pos',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './pos.html',
  styleUrl: './pos.css'
})
export class Pos implements OnInit, OnDestroy {
  readonly api = inject(ApiService);
  private realtime = inject(RealtimeService);
  private subs = new Subscription();

  products = signal<Product[]>([]);
  cart = signal<CartLine[]>([]);
  paymentMethod = signal('Cash');
  error = signal('');
  busy = signal(false);
  lastSale = signal<Sale | null>(null);
  live = signal('');

  total = computed(() =>
    this.cart().reduce((sum, l) => sum + l.product.price * l.quantity, 0));

  ngOnInit() {
    this.api.getProducts().subscribe(p => this.products.set(p));
    this.realtime.start();

    // Real-time: another cashier sold something, or stock was changed
    this.subs.add(this.realtime.stockUpdated$.subscribe(e => {
      this.products.update(list => list.map(p =>
        p.id === e.productId ? { ...p, stockQuantity: e.quantity } : p));
      this.live.set('Stock updated live');
    }));

    this.subs.add(this.realtime.productChanged$.subscribe(changed => {
      this.products.update(list => list.some(p => p.id === changed.id)
        ? list.map(p => p.id === changed.id ? changed : p)
        : [...list, changed]);
    }));

    this.subs.add(this.realtime.productDeleted$.subscribe(id => {
      this.products.update(list => list.filter(p => p.id !== id));
      this.cart.update(lines => lines.filter(l => l.product.id !== id));
    }));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  isLow(p: Product) {
    return p.stockQuantity <= p.lowStockThreshold;
  }

  add(product: Product) {
    const lines = this.cart();
    const line = lines.find(l => l.product.id === product.id);
    const inCart = line?.quantity ?? 0;

    if (inCart >= product.stockQuantity) {
      this.error.set(`Only ${product.stockQuantity} of ${product.name} in stock.`);
      return;
    }
    this.error.set('');

    this.cart.set(line
      ? lines.map(l => l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l)
      : [...lines, { product, quantity: 1 }]);
  }

  decrease(line: CartLine) {
    this.error.set('');
    this.cart.update(lines => line.quantity <= 1
      ? lines.filter(l => l.product.id !== line.product.id)
      : lines.map(l => l.product.id === line.product.id ? { ...l, quantity: l.quantity - 1 } : l));
  }

  remove(line: CartLine) {
    this.cart.update(lines => lines.filter(l => l.product.id !== line.product.id));
  }

  checkout() {
    if (!this.cart().length || this.busy()) return;
    this.busy.set(true);
    this.error.set('');

    this.api.createSale({
      paymentMethod: this.paymentMethod(),
      items: this.cart().map(l => ({ productId: l.product.id, quantity: l.quantity }))
    }).subscribe({
      next: sale => {
        this.lastSale.set(sale);
        this.cart.set([]);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(typeof err.error === 'string' ? err.error : 'Checkout failed. Please try again.');
        this.busy.set(false);
      }
    });
  }

  newSale() {
    this.lastSale.set(null);
  }
}