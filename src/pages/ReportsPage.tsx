import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sale, AppUser, Expense, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TrendingUp, DollarSign, ShoppingBag, ArrowUpRight, ReceiptText, BarChart as BarChartIcon, BarChart3, Users, Printer, Wallet, Download } from 'lucide-react';

export default function ReportsPage() {
  const { shop, currentBranchId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop || !currentBranchId) return;
    const fetchData = async () => {
      try {
        const salesQ = query(
          collection(db, 'sales'), 
          where('shopId', '==', shop.shopId), 
          where('branchId', '==', currentBranchId),
          orderBy('createdAt', 'desc')
        );
        const salesSnapshot = await getDocs(salesQ);
        setSales(salesSnapshot.docs.map(doc => ({ ...doc.data(), saleId: doc.id } as Sale)));

        const expensesQ = query(
          collection(db, 'expenses'), 
          where('shopId', '==', shop.shopId),
          where('branchId', '==', currentBranchId)
        );
        const expensesSnapshot = await getDocs(expensesQ);
        setExpenses(expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));

        const usersQ = query(collection(db, 'users'), where('shopId', '==', shop.shopId));
        const usersSnapshot = await getDocs(usersQ);
        setUsers(usersSnapshot.docs.map(doc => doc.data() as AppUser));

        const productsQ = query(
          collection(db, 'products'), 
          where('shopId', '==', shop.shopId),
          ...(currentBranchId ? [where('branchId', '==', currentBranchId)] : [])
        );
        const productsSnapshot = await getDocs(productsQ);
        setProducts(productsSnapshot.docs.map(doc => ({ ...doc.data(), productId: doc.id } as Product)));
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shop, currentBranchId]);

  // Calculations
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalDiscounts = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const totalCogs = sales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const product = products.find(p => p.productId === item.productId);
      const cost = product?.costPrice || 0;
      return itemSum + (cost * item.qty);
    }, 0);
  }, 0);

  const netProfit = totalRevenue - totalCogs - totalExpenses;
  
  // Last 7 days data for chart
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), i);
    return {
      date: d,
      label: format(d, 'EEEE', { locale: ar }),
      total: 0
    };
  }).reverse();

  sales.forEach(sale => {
    const rawSale = sale as any;
    const timestamp = rawSale.createdAt || (rawSale.date?.seconds ? rawSale.date.seconds * 1000 : rawSale.date) || Date.now();
    const saleDate = new Date(timestamp);
    const dayMatch = last7Days.find(d => 
      saleDate >= startOfDay(d.date) && saleDate <= endOfDay(d.date)
    );
    if (dayMatch) {
      dayMatch.total += sale.total;
    }
  });

  // Top 5 Products
  const productCounts: Record<string, {name: string, qty: number, rev: number}> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productCounts[item.productId]) {
        productCounts[item.productId] = { name: item.name, qty: 0, rev: 0 };
      }
      productCounts[item.productId].qty += item.qty;
      productCounts[item.productId].rev += (item.qty * item.price);
    });
  });

  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Cashier Performance
  const cashierStats: Record<string, { email: string, revenue: number, salesCount: number }> = {};

  sales.forEach(sale => {
    const key = sale.cashierName || sale.cashierId || 'غير معروف';
    if (!cashierStats[key]) {
      cashierStats[key] = { email: key, revenue: 0, salesCount: 0 };
    }
    cashierStats[key].revenue += sale.total;
    cashierStats[key].salesCount += 1;
  });

  const cashierPerformance = Object.values(cashierStats)
    .filter(stat => stat.salesCount > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const exportSalesCSV = () => {
    const headers = ['رقم الفاتورة','التاريخ','الكاشير','عدد العناصر','المجموع الفرعي','الخصم','الإجمالي'];
    const rows = sales.map(s => {
      const ts = (s as any).createdAt || Date.now();
      return [
        (s as any).invoiceNumber || '',
        new Date(ts).toLocaleString('ar-EG'),
        s.cashierName || s.cashierId || '',
        s.items.reduce((sum, i) => sum + i.qty, 0),
        s.subtotal,
        s.discount || 0,
        s.total
      ];
    });
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto print:overflow-visible print:h-auto">
      <div className="flex justify-between items-center mb-6 print:hidden shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">تقارير المبيعات</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportSalesCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
          >
            <Download size={18} />
            تصدير CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer size={18} />
            تصدير كـ PDF
          </button>
        </div>
      </div>
      
      <div className="hidden print:block mb-8 text-center shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{shop?.name || 'كاشير سريع'}</h1>
        <h2 className="text-xl text-slate-600">ملخص المبيعات والأداء</h2>
        <p className="text-sm text-slate-400 mt-1">تاريخ الإصدار: {format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: ar })}</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-4 gap-6 min-h-[600px] print:block print:space-y-6">
        
        {/* Financial Summary Card (Full Width Row) */}
        <div className="col-span-1 lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 print:shadow-none print:border-slate-300 print:break-inside-avoid">
          <div className="flex-1 text-center border-b md:border-b-0 md:border-l border-slate-100 pb-4 md:pb-0 md:pl-4">
            <span className="text-slate-500 text-sm font-medium">إجمالي المبيعات</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalRevenue} <span className="text-sm text-slate-400 font-normal">ج.م</span></div>
          </div>
          <div className="flex-1 text-center border-b md:border-b-0 md:border-l border-slate-100 pb-4 md:pb-0 md:pl-4">
            <span className="text-slate-500 text-sm font-medium">إجمالي الخصومات</span>
            <div className="text-3xl font-black text-orange-500 mt-1">{totalDiscounts.toFixed(2)} <span className="text-sm text-orange-300 font-normal">ج.م</span></div>
          </div>
          <div className="flex-1 text-center border-b md:border-b-0 md:border-l border-slate-100 pb-4 md:pb-0 md:pl-4">
            <span className="text-slate-500 text-sm font-medium">إجمالي المصروفات</span>
            <div className="text-3xl font-black text-rose-500 mt-1">{totalExpenses.toFixed(2)} <span className="text-sm text-rose-300 font-normal">ج.م</span></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-slate-500 text-sm font-medium">صافي الربح</span>
            <div className={`text-3xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netProfit.toFixed(2)} <span className="text-sm font-normal opacity-70">ج.م</span>
            </div>
          </div>
        </div>

        {/* Main Stats Card (2x2) */}
      <div className="col-span-1 lg:col-span-2 lg:row-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col print:shadow-none print:border-slate-300 print:break-inside-avoid">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-slate-500 text-sm font-medium">إجمالي المبيعات (كل الوقت)</span>
            <div className="text-5xl font-black text-slate-900 mt-2">{totalRevenue} <span className="text-lg text-slate-400 font-normal">ج.م</span></div>
          </div>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
            <DollarSign size={16} /> المبيعات
          </div>
        </div>
        <div className="flex-1 w-full mt-4 min-h-[300px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Alert Card (1x2) */}
      <div className="col-span-1 lg:col-span-1 lg:row-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-y-auto print:shadow-none print:border-slate-300 print:break-inside-avoid">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <ShoppingBag className="text-blue-500" size={20} />
          الأكثر مبيعاً
        </h3>
        <div className="space-y-4">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-slate-800 font-bold text-sm">{p.name}</span>
                <span className="text-slate-500 text-xs">{p.qty} وحدة مباعة</span>
              </div>
              <span className="font-bold text-blue-600 text-sm">{p.rev} ج.م</span>
            </div>
          ))}
          {topProducts.length === 0 && <p className="text-center text-slate-500 text-sm">لا توجد مبيعات</p>}
        </div>
      </div>

      {/* Action Card (1x1) */}
      <div className="col-span-1 lg:col-span-1 lg:row-span-1 bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between print:bg-slate-100 print:text-slate-900 print:shadow-none print:break-inside-avoid">
        <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 print:shadow-none">
          <ReceiptText size={20} />
        </div>
        <div>
          <h4 className="font-bold text-lg leading-tight">إجمالي العمليات</h4>
          <div className="text-3xl font-black mt-2">{sales.length}</div>
        </div>
      </div>

      {/* Quick Report Card (1x1) */}
      <div className="col-span-1 lg:col-span-1 lg:row-span-1 bg-blue-600 rounded-3xl p-6 text-white flex flex-col justify-between print:bg-blue-50 print:text-blue-900 print:shadow-none print:break-inside-avoid">
        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center print:bg-blue-200">
          <TrendingUp size={20} />
        </div>
        <div>
          <h4 className="font-bold text-lg leading-tight">أداء اليوم</h4>
          <div className="text-3xl font-black mt-2">{last7Days[last7Days.length - 1].total} <span className="text-sm font-normal opacity-80">ج.م</span></div>
        </div>
      </div>

      {/* Cashier Performance Card (2x2) */}
      <div className="col-span-1 lg:col-span-2 lg:row-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-y-auto print:shadow-none print:border-slate-300 print:break-inside-avoid">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Users className="text-emerald-500" size={20} />
          أداء الكاشير
        </h3>
        <div className="space-y-4">
          {cashierPerformance.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-slate-800 font-bold">{c.email}</span>
                <span className="text-slate-500 text-sm">{c.salesCount} فاتورة</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-emerald-600 block">{c.revenue} ج.م</span>
                <span className="text-slate-400 text-xs">إجمالي المبيعات</span>
              </div>
            </div>
          ))}
          {cashierPerformance.length === 0 && <p className="text-center text-slate-500 text-sm">لا توجد مبيعات</p>}
        </div>
      </div>

      {/* Bottom Row Info (2x1) */}
      <div className="col-span-1 lg:col-span-2 lg:row-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-8 print:shadow-none print:border-slate-300 print:break-inside-avoid">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">متوسط الفاتورة</span>
          <span className="text-slate-800 font-bold text-xl">{sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0} ج.م</span>
        </div>
        <div className="flex-1 border-r border-slate-100 pr-6 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">أفضل يوم</span>
          <span className="text-slate-800 font-bold text-xl">
            {last7Days.reduce((max, d) => d.total > max.total ? d : max, last7Days[0]).label}
          </span>
        </div>
      </div>

      </div>
    </div>
  );
}
