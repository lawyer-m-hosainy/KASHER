import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, limit, startAfter, doc, runTransaction, increment, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sale, SaleReturn } from '../types';
import { Search, Printer, Receipt, Calendar, Undo2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { ReturnModal } from '../components/ReturnModal';
import { computeRemainingReturnableQty } from '../lib/returns';
import { toast } from 'sonner';

export default function SalesHistoryPage() {
  const { shop, appUser, currentBranchId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnsBySale, setReturnsBySale] = useState<Record<string, SaleReturn[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetchSales();
    fetchReturns();
  }, [shop, currentBranchId]);

  const fetchReturns = async () => {
    if (!shop) return;
    try {
      const rQ = query(
        collection(db, 'returns'),
        where('shopId', '==', shop.shopId),
        ...(currentBranchId ? [where('branchId', '==', currentBranchId)] : [])
      );
      const snapshot = await getDocs(rQ);
      const grouped: Record<string, SaleReturn[]> = {};
      snapshot.docs.forEach(d => {
        const ret = { id: d.id, ...d.data() } as SaleReturn;
        (grouped[ret.saleId] ||= []).push(ret);
      });
      setReturnsBySale(grouped);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReturnSubmit = async (
    items: { productId: string; name: string; price: number; qty: number }[],
    refundMethod: 'cash' | 'credit'
  ) => {
    if (!returningSale || !shop || !appUser) return;
    const saleId = returningSale.id || returningSale.saleId;
    setSubmittingReturn(true);
    try {
      const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      await runTransaction(db, async (transaction) => {
        const productRefs = items.map(item => doc(db, 'products', item.productId));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        const returnRef = doc(collection(db, 'returns'));
        transaction.set(returnRef, {
          shopId: shop.shopId,
          branchId: returningSale.branchId || null,
          saleId,
          saleInvoiceNumber: returningSale.invoiceNumber || null,
          customerId: returningSale.customerId || null,
          items,
          total,
          refundMethod,
          cashierId: appUser.userId,
          cashierName: appUser.email,
          createdAt: Date.now(),
        });

        productSnaps.forEach((snap, i) => {
          if (snap.exists()) {
            transaction.update(productRefs[i], { quantity: increment(items[i].qty) });
          }
        });

        if (refundMethod === 'credit' && returningSale.customerId) {
          transaction.update(doc(db, 'customers', returningSale.customerId), {
            balance: increment(-total)
          });
        }
      });

      toast.success('تم تسجيل المرتجع بنجاح');
      setReturningSale(null);
      fetchReturns();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const fetchSales = async (isLoadMore = false) => {
    if (!shop) return;
    setLoading(true);
    try {
      let baseQuery = query(
        collection(db, 'sales'),
        where('shopId', '==', shop.shopId),
        ...(currentBranchId ? [where('branchId', '==', currentBranchId)] : []),
        orderBy('createdAt', 'desc'),
        limit(25)
      );

      if (isLoadMore && lastVisible) {
        baseQuery = query(baseQuery, startAfter(lastVisible));
      }
      
      const snapshot = await getDocs(baseQuery);

      setHasMore(snapshot.docs.length === 25);
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }

      const salesData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          date: data.createdAt ? new Date(data.createdAt) : (data.date ? data.date.toDate() : new Date())
        };
      }) as Sale[];
      
      if (isLoadMore) {
        setSales(prev => [...prev, ...salesData]);
      } else {
        setSales(salesData);
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    (s.invoiceNumber && s.invoiceNumber.includes(searchTerm)) || 
    (s.total.toString().includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">سجل الفواتير</h2>
          <p className="text-slate-500 mt-1">عرض وإعادة طباعة فواتير المبيعات السابقة</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
            placeholder="بحث برقم الفاتورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">التاريخ والوقت</th>
                <th className="p-4">عدد العناصر</th>
                <th className="p-4">الإجمالي</th>
                <th className="p-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">جاري التحميل...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">لا توجد فواتير مطابقة.</td></tr>
              ) : (
                filteredSales.map(sale => {
                  const remainingQty = computeRemainingReturnableQty(sale.items, returnsBySale[sale.id || ''] || []);
                  const hasReturnable = sale.items.some(item => (remainingQty[item.productId] ?? 0) > 0);
                  return (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">#{sale.invoiceNumber || 'بدون'}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      {new Date(sale.date).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-sm font-bold">
                        {sale.items.reduce((sum, item) => sum + item.qty, 0)} عناصر
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-600">
                      {sale.total} ج.م
                      {!!sale.due && (
                        <span className="block text-xs font-bold text-amber-600">آجل: {sale.due.toFixed(2)} ج.م</span>
                      )}
                    </td>
                    <td className="p-4 text-left">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setTimeout(() => handlePrint(), 100);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-sm transition-colors"
                        >
                          <Printer size={16} />
                          طباعة
                        </button>
                        <button
                          onClick={() => setReturningSale(sale)}
                          disabled={!hasReturnable}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-bold text-sm transition-colors"
                        >
                          <Undo2 size={16} />
                          إرجاع
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center p-4 bg-white border-t border-slate-100">
              <button 
                onClick={() => fetchSales(true)}
                disabled={loading}
                className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
              >
                {loading ? 'جاري التحميل...' : 'عرض المزيد'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden">
        {selectedSale && (
          <div ref={printRef}>
            <PrintableReceipt
              shopName={shop?.name || ''}
              cashierName={selectedSale.cashierName || 'كاشير'}
              items={selectedSale.items}
              subtotal={selectedSale.subtotal}
              discount={selectedSale.discount}
              total={selectedSale.total}
              vatAmount={selectedSale.vatAmount}
              paid={selectedSale.paid}
              due={selectedSale.due}
              date={selectedSale.date}
              printerSettings={shop?.printerSettings}
            />
          </div>
        )}
      </div>

      {returningSale && (
        <ReturnModal
          sale={returningSale}
          remainingQty={computeRemainingReturnableQty(returningSale.items, returnsBySale[returningSale.id || ''] || [])}
          canRefundToCredit={!!returningSale.customerId}
          submitting={submittingReturn}
          onClose={() => setReturningSale(null)}
          onSubmit={handleReturnSubmit}
        />
      )}
    </div>
  );
}
