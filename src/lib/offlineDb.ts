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
}

export const initDB = async () => {
  return openDB<PosDB>('pos-offline-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offlineSales')) {
        db.createObjectStore('offlineSales', { keyPath: 'id' });
      }
    },
  });
};

export const saveOfflineSale = async (sale: OfflineSale) => {
  const db = await initDB();
  await db.put('offlineSales', sale);
};

export const getOfflineSales = async () => {
  const db = await initDB();
  return db.getAll('offlineSales');
};

export const deleteOfflineSale = async (id: string) => {
  const db = await initDB();
  await db.delete('offlineSales', id);
};
