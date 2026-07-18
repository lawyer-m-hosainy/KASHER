export type SubscriptionStatus = 'pending' | 'active' | 'expired';

export interface PrinterSettings {
  type: '80mm' | 'a4';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Shop {
  shopId: string;
  name: string;
  ownerName: string;
  phone: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiryDate?: number;
  createdAt: number;
  printerSettings?: PrinterSettings;
  branches?: Branch[];
  categories?: string[];
  vatEnabled?: boolean;
  vatRate?: number;
  vatNumber?: string;
}

export interface AppUser {
  userId: string;
  shopId: string;
  branchId?: string;
  role: 'owner' | 'cashier';
  email: string;
  isAdmin?: boolean;
}

export interface Product {
  productId: string;
  shopId: string;
  branchId?: string;
  name: string;
  barcode?: string;
  category: string;
  unit?: 'piece' | 'kg';
  price: number;
  costPrice?: number;
  quantity: number;
  lowStockThreshold: number;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone?: string;
  totalPurchases: number;
}

export interface Expense {
  id: string;
  shopId: string;
  branchId?: string;
  amount: number;
  category: string;
  description: string;
  date: number;
  cashierId: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Sale {
  saleId: string;
  shopId: string;
  branchId?: string;
  cashierId: string;
  cashierName?: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  vatAmount?: number;
  createdAt: number;
  invoiceNumber?: string;
  id?: string;
  date?: any;
}
