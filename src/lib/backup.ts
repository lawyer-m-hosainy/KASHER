import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Sale, Expense, Customer, Shop } from '../types';

export interface ShopBackupData {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
}

async function fetchCollection<T>(name: string, shopId: string): Promise<T[]> {
  const snap = await getDocs(query(collection(db, name), where('shopId', '==', shopId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
}

// Full snapshot of everything belonging to a shop, across all of its branches.
// Backup/export is an owner-only feature, so branch filtering does not apply here.
export async function fetchShopBackupData(shopId: string): Promise<ShopBackupData> {
  const [products, sales, expenses, customers] = await Promise.all([
    fetchCollection<Product>('products', shopId),
    fetchCollection<Sale>('sales', shopId),
    fetchCollection<Expense>('expenses', shopId),
    fetchCollection<Customer>('customers', shopId),
  ]);
  return { products, sales, expenses, customers };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function saleTimestamp(sale: Sale): number {
  if (typeof sale.createdAt === 'number') return sale.createdAt;
  const raw: any = sale.date;
  if (raw?.seconds) return raw.seconds * 1000;
  if (typeof raw === 'number') return raw;
  return 0;
}

function branchName(shop: Shop, branchId?: string): string {
  if (!branchId) return 'الفرع الرئيسي';
  return shop.branches?.find(b => b.id === branchId)?.name || branchId;
}

// Machine-restorable snapshot: a raw dump of every document, keyed by
// collection name, plus shop/branch metadata. Mirrors hosainy-store-sys's
// "restore fully replaces each slice" JSON backup contract, adapted to
// Firestore documents (each row keeps its document id) instead of a single
// local key-value file.
export function exportBackupJSON(shop: Shop, data: ShopBackupData): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    shopId: shop.shopId,
    shopName: shop.name,
    branches: shop.branches || [],
    ...data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `نسخة-احتياطية-${shop.name}-${new Date().toISOString().slice(0, 10)}.json`);
}

// Human/accountant-facing spreadsheet: one sheet per collection, Arabic
// column headers, computed columns (branch name) resolved for readability.
// Separate from the JSON backup above, same split hosainy-store-sys makes
// between a machine-restorable backup and a reporting export.
export async function exportBackupExcel(shop: Shop, data: ShopBackupData): Promise<void> {
  const XLSX = await import('xlsx');

  const sheetOrEmpty = (rows: Record<string, unknown>[], emptyLabel: string) =>
    XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'ملاحظة': emptyLabel }]);

  const wb = XLSX.utils.book_new();

  const productRows = data.products.map(p => ({
    'الاسم': p.name,
    'الباركود': p.barcode || '',
    'التصنيف': p.category || '',
    'الفرع': branchName(shop, p.branchId),
    'الوحدة': p.unit === 'kg' ? 'كيلوجرام' : 'قطعة',
    'سعر البيع': p.price,
    'سعر التكلفة': p.costPrice ?? '',
    'الكمية': p.quantity,
    'حد التنبيه': p.lowStockThreshold,
  }));
  XLSX.utils.book_append_sheet(wb, sheetOrEmpty(productRows, 'لا توجد منتجات'), 'المخزون');

  const saleRows = [...data.sales]
    .sort((a, b) => saleTimestamp(b) - saleTimestamp(a))
    .map(s => ({
      'رقم الفاتورة': s.invoiceNumber || s.saleId,
      'التاريخ': saleTimestamp(s) ? new Date(saleTimestamp(s)).toLocaleString('ar-EG') : '',
      'الفرع': branchName(shop, s.branchId),
      'الكاشير': s.cashierName || s.cashierId,
      'الإجمالي الفرعي': s.subtotal,
      'الخصم': s.discount,
      'الضريبة': s.vatAmount || 0,
      'الصافي': s.total,
    }));
  XLSX.utils.book_append_sheet(wb, sheetOrEmpty(saleRows, 'لا توجد مبيعات'), 'المبيعات');

  const expenseRows = data.expenses.map(e => ({
    'التاريخ': e.date ? new Date(e.date).toLocaleDateString('ar-EG') : '',
    'الفرع': branchName(shop, e.branchId),
    'الفئة': e.category,
    'الوصف': e.description,
    'المبلغ': e.amount,
  }));
  XLSX.utils.book_append_sheet(wb, sheetOrEmpty(expenseRows, 'لا توجد مصروفات'), 'المصروفات');

  const customerRows = data.customers.map(c => ({
    'الاسم': c.name,
    'الهاتف': c.phone || '',
    'إجمالي المشتريات': c.totalPurchases,
  }));
  XLSX.utils.book_append_sheet(wb, sheetOrEmpty(customerRows, 'لا يوجد عملاء'), 'العملاء');

  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadBlob(
    new Blob([wbout], { type: 'application/octet-stream' }),
    `تقرير-${shop.name}-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
