import { openDB, DBSchema } from 'idb';
import { SaleItem } from '../types';

export interface OfflineSale {
  id: string;
  shopId: string;
  branchId?: string;
  cashierId: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: number;
}

interface PosDB extends DBSchema {
  offlineSales: {
    key: string;
    value: OfflineSale;
  };
  offlineStockUpdates: {
    key: string;
    value: { productId: string; decrementQty: number };
  };
}

export const initDB = async () => {
  return openDB<PosDB>('pos-offline-db', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains('offlineSales')) {
        db.createObjectStore('offlineSales', { keyPath: 'id' });
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains('offlineStockUpdates')) {
        db.createObjectStore('offlineStockUpdates', { keyPath: 'productId' });
      }
    },
  });
};

export const saveOfflineSale = async (sale: OfflineSale) => {
  const db = await initDB();
  const tx = db.transaction(['offlineSales', 'offlineStockUpdates'], 'readwrite');
  await tx.objectStore('offlineSales').put(sale);
  
  for (const item of sale.items) {
    const stockStore = tx.objectStore('offlineStockUpdates');
    const existing = await stockStore.get(item.productId);
    await stockStore.put({
      productId: item.productId,
      decrementQty: (existing?.decrementQty || 0) + item.qty
    });
  }
  
  await tx.done;
};

export const getOfflineSales = async () => {
  const db = await initDB();
  return db.getAll('offlineSales');
};

export const deleteOfflineSale = async (id: string) => {
  const db = await initDB();
  await db.delete('offlineSales', id);
};

export const getOfflineStockUpdates = async () => {
  const db = await initDB();
  return db.getAll('offlineStockUpdates');
};

export const clearOfflineStockUpdate = async (productId: string) => {
  const db = await initDB();
  await db.delete('offlineStockUpdates', productId);
};
