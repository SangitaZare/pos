import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { Product, SaleSummary } from './models';
import { API_BASE } from './api.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/pos`)
    .withAutomaticReconnect()
    .build();

  /** true while the SignalR connection is open (used for the "Live" badge) */
  readonly connected = signal(false);

  readonly stockUpdated$ = new Subject<{ productId: number; quantity: number }>();
  readonly saleCreated$ = new Subject<SaleSummary>();
  readonly productChanged$ = new Subject<Product>();
  readonly productDeleted$ = new Subject<number>();

  constructor() {
    this.connection.on('StockUpdated', (productId: number, quantity: number) =>
      this.stockUpdated$.next({ productId, quantity }));

    this.connection.on('SaleCreated', (sale: SaleSummary) =>
      this.saleCreated$.next(sale));

    this.connection.on('ProductChanged', (product: Product) =>
      this.productChanged$.next(product));

    this.connection.on('ProductDeleted', (id: number) =>
      this.productDeleted$.next(id));

    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onclose(() => this.connected.set(false));
  }

  async start(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.connection.start();
        this.connected.set(true);
        console.log('SignalR connected');
      } catch (err) {
        this.connected.set(false);
        console.error('SignalR connection failed', err);
      }
    }
  }
}
