import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getOfflineSales, deleteOfflineSale, clearOfflineStockUpdate } from '../lib/offlineDb';
import { collection, updateDoc, doc, increment, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { shop } = useAuth();

  const checkPending = async () => {
    try {
      const sales = await getOfflineSales();
      setPendingCount(sales.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && shop && !isSyncing) {
      syncOfflineData();
    }
  }, [isOnline, pendingCount, shop]);

  const syncOfflineData = async () => {
    if (isSyncing || !shop) return;
    setIsSyncing(true);

    try {
      const sales = await getOfflineSales();
      for (const sale of sales) {
        try {
          // Push to Firebase with setDoc for idempotency
          await setDoc(doc(db, 'sales', sale.id), {
            shopId: sale.shopId,
            branchId: sale.branchId || null,
            cashierId: sale.cashierId,
            cashierName: sale.cashierName || null,
            customerId: sale.customerId || null,
            invoiceNumber: sale.invoiceNumber || null,
            vatAmount: sale.vatAmount || 0,
            items: sale.items,
            subtotal: sale.subtotal || sale.total,
            discount: sale.discount || 0,
            total: sale.total,
            createdAt: sale.createdAt
          });

          // Update Customer purchases
          if (sale.customerId) {
            await updateDoc(doc(db, 'customers', sale.customerId), {
              totalPurchases: increment(sale.total)
            });
          }

          // Deduct Inventory in Firebase with clamping
          for (const item of sale.items) {
            const productRef = doc(db, 'products', item.productId);
            await runTransaction(db, async (t) => {
              const productSnap = await t.get(productRef);
              if (productSnap.exists()) {
                const newQty = Math.max(0, productSnap.data().quantity - item.qty);
                t.update(productRef, { quantity: newQty });
              }
            });
          }

          // On full success, clear local state
          for (const item of sale.items) {
            await clearOfflineStockUpdate(item.productId);
          }
          await deleteOfflineSale(sale.id);
        } catch (err) {
          console.error("Error syncing sale", sale.id, err);
        }
      }
      checkPending();
    } catch (error) {
      console.error('Error syncing data', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isOnline ? (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-sm font-medium">
          <Wifi size={16} /> متصل
        </div>
      ) : (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 text-sm font-medium">
          <WifiOff size={16} /> غير متصل
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 text-sm font-medium">
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? 'جاري المزامنة...' : `${pendingCount} قيد الانتظار`}
        </div>
      )}
    </div>
  );
}
