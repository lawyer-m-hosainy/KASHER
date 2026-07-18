import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sale } from '../types';
import { Search, Printer, Receipt, Calendar } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { toast } from 'sonner';

export default function SalesHistoryPage() {
  const { shop, currentBranchId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetchSales();
  }, [shop, currentBranchId]);

  const fetchSales = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'sales'),
        where('shopId', '==', shop.shopId),
        ...(currentBranchId ? [where('branchId', '==', currentBranchId)] : []),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt ? new Date(doc.data().createdAt) : (doc.data().date ? doc.data().date.toDate() : new Date())
      })) as unknown as Sale[];
      
      setSales(salesData);
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
                filteredSales.map(sale => (
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
                    <td className="p-4 font-black text-emerald-600">{sale.total} ج.م</td>
                    <td className="p-4 text-left">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden">
        {selectedSale && (
          <div ref={printRef}>
            <PrintableReceipt 
              shopName={shop?.name || ''}
              cashierName={selectedSale.cashierId || 'كاشير'}
              items={selectedSale.items}
              subtotal={selectedSale.subtotal}
              discount={selectedSale.discount}
              total={selectedSale.total}
              vatAmount={selectedSale.vatAmount}
              date={selectedSale.date}
              printerSettings={shop?.printerSettings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
