import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../api.service';
import { RealtimeService } from '../realtime.service';
import { Product, SaleSummary } from '../models';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  private api = inject(ApiService);
  readonly realtime = inject(RealtimeService);
  private subs = new Subscription();

  today = new Date();
  products = signal<Product[]>([]);
  sales = signal<SaleSummary[]>([]);          // newest first
  newSaleId = signal<number | null>(null);    // highlights the row that just arrived
  restocking = signal<number | null>(null);

  // ---- numbers for the tiles -------------------------------------------
  todaySales = computed(() =>
    this.sales().filter(s => new Date(s.createdAt).toDateString() === this.today.toDateString()));

  revenue = computed(() => this.todaySales().reduce((sum, s) => sum + s.totalAmount, 0));
  salesCount = computed(() => this.todaySales().length);
  itemsSold = computed(() => this.todaySales().reduce((sum, s) => sum + s.itemCount, 0));
  average = computed(() => this.salesCount() ? this.revenue() / this.salesCount() : 0);

  lowStock = computed(() =>
    this.products()
      .filter(p => p.stockQuantity <= p.lowStockThreshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity));

  byPayment = computed(() => {
    const totals = new Map<string, number>();
    for (const s of this.todaySales()) {
      totals.set(s.paymentMethod, (totals.get(s.paymentMethod) ?? 0) + s.totalAmount);
    }
    const sum = this.revenue() || 1;
    return [...totals]
      .map(([method, total]) => ({ method, total, pct: Math.round((total / sum) * 100) }))
      .sort((a, b) => b.total - a.total);
  });

  // running total after each sale, drawn as a small line under the revenue figure
  spark = computed(() => {
    const oldestFirst = [...this.todaySales()].reverse();
    let running = 0;
    const totals = oldestFirst.map(s => (running += s.totalAmount));
    if (totals.length < 2) return null;

    const w = 240, h = 48, max = totals[totals.length - 1];
    const points = totals.map((v, i) => [(i / (totals.length - 1)) * w, h - (v / max) * (h - 6) - 3]);
    const line = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const last = points[points.length - 1];
    return { line, area: `0,${h} ${line} ${w},${h}`, x: last[0], y: last[1] };
  });

  // ---- load data, then listen for live events --------------------------
  ngOnInit() {
    this.api.getProducts().subscribe(p => this.products.set(p));

    this.api.getRecentSales(100).subscribe(list =>
      this.sales.set(list.map(s => ({
        id: s.id,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt,
        itemCount: s.items.reduce((n, i) => n + i.quantity, 0)
      }))));

    this.realtime.start();

    // The server sends "SaleCreated" after every checkout
    this.subs.add(this.realtime.saleCreated$.subscribe(sale => {
      this.sales.update(list =>
        list.some(s => s.id === sale.id) ? list : [sale, ...list].slice(0, 100));
      this.newSaleId.set(sale.id);
      setTimeout(() => this.newSaleId.set(null), 2500);
    }));

    this.subs.add(this.realtime.stockUpdated$.subscribe(e =>
      this.products.update(list =>
        list.map(p => p.id === e.productId ? { ...p, stockQuantity: e.quantity } : p))));

    this.subs.add(this.realtime.productChanged$.subscribe(changed =>
      this.products.update(list =>
        list.some(p => p.id === changed.id)
          ? list.map(p => p.id === changed.id ? changed : p)
          : [...list, changed])));

    this.subs.add(this.realtime.productDeleted$.subscribe(id =>
      this.products.update(list => list.filter(p => p.id !== id))));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  restock(product: Product) {
    this.restocking.set(product.id);
    // The new quantity comes back through the "StockUpdated" event, so nothing to update here
    this.api.adjustStock(product.id, 10).subscribe({
      next: () => this.restocking.set(null),
      error: () => this.restocking.set(null)
    });
  }
}
