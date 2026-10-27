export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface SaleItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: number;
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  items: SaleItem[];
}

export interface SaleSummary {
  id: number;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
}

export interface CreateSaleRequest {
  paymentMethod: string;
  items: { productId: number; quantity: number }[];
}

export interface CartLine {
  product: Product;
  quantity: number;
}