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
  // Outstanding amount the customer owes from credit sales, net of payments
  // and credit refunds. Maintained via Firestore increment() at the point
  // of each sale/payment/return rather than recomputed from history.
  balance?: number;
}

// A payment collected against a customer's outstanding balance (see Customer.balance).
export interface Payment {
  id: string;
  shopId: string;
  branchId?: string;
  customerId: string;
  amount: number;
  method?: string;
  note?: string;
  cashierId: string;
  cashierName?: string;
  createdAt: number;
}

export interface ReturnItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

// A return/refund logged against an original sale. Kept as its own record
// (rather than mutating the sale) so multiple partial returns against the
// same sale can be tracked and capped.
export interface SaleReturn {
  id: string;
  shopId: string;
  branchId?: string;
  saleId: string;
  saleInvoiceNumber?: string;
  customerId?: string;
  items: ReturnItem[];
  total: number;
  refundMethod: 'cash' | 'credit';
  cashierId: string;
  cashierName?: string;
  createdAt: number;
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
  // Amount collected at checkout and the remainder left on the customer's
  // account (see Customer.balance). Absent on sales created before credit
  // sales existed, which are always treated as fully paid.
  paid?: number;
  due?: number;
  createdAt: number;
  invoiceNumber?: string;
  id?: string;
  date?: any;
}
