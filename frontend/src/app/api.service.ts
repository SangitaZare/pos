import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSaleRequest, Product, Sale } from './models';

export const API_BASE = 'https://localhost:7064';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = `${API_BASE}/api`;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products`);
  }

  getLowStock(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products/low-stock`);
  }

  adjustStock(id: number, change: number): Observable<Product> {
    return this.http.patch<Product>(`${this.url}/products/${id}/stock`, { change });
  }

  createSale(request: CreateSaleRequest): Observable<Sale> {
    return this.http.post<Sale>(`${this.url}/sales`, request);
  }

  getRecentSales(take = 20): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.url}/sales?take=${take}`);
  }

  getSale(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.url}/sales/${id}`);
  }

  qrUrl(saleId: number): string {
    return `${this.url}/sales/${saleId}/qr`;
  }
}