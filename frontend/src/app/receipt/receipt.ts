import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';
import { Sale } from '../models';

@Component({
  selector: 'app-receipt',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './receipt.html',
  styleUrl: './receipt.css'
})
export class Receipt implements OnInit {
  readonly api = inject(ApiService);
  private route = inject(ActivatedRoute);

  sale = signal<Sale | null>(null);
  notFound = signal(false);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getSale(id).subscribe({
      next: s => this.sale.set(s),
      error: () => this.notFound.set(true)
    });
  }
}