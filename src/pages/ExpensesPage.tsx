import { useState, useEffect, FormEvent } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Expense } from '../types';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ExpensesPage() {
  const { shop, currentBranchId, appUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('إيجار');
  const [description, setDescription] = useState('');

  const fetchExpenses = async () => {
    if (!shop || !currentBranchId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'expenses'), 
        where('shopId', '==', shop.shopId),
        where('branchId', '==', currentBranchId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    } catch (error) {
      console.error("Error fetching expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [shop, currentBranchId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop || !appUser || !currentBranchId) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        shopId: shop.shopId,
        branchId: currentBranchId,
        cashierId: appUser.userId,
        amount: Number(amount),
        category,
        description,
        date: Date.now()
      });
      setShowForm(false);
      setAmount('');
      setCategory('إيجار');
      setDescription('');
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense", error);
    }
  };

  const deleteExpense = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
        fetchExpenses();
      } catch (error) {
        console.error("Error deleting expense", error);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-rose-500" /> المصروفات
          </h2>
          <p className="text-slate-500 mt-2">تسجيل مصروفات الفرع الحالي.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20"
        >
          <Plus size={20} /> إضافة مصروف
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-4">مصروف جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ</label>
              <input required type="number" min="0" step="any" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500">
                <option value="إيجار">إيجار</option>
                <option value="كهرباء/مياه">كهرباء/مياه</option>
                <option value="رواتب">رواتب</option>
                <option value="مشتريات/بضاعة">مشتريات/بضاعة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">البيان/الوصف</label>
              <input type="text" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" className="px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold">حفظ</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold">إلغاء</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0">
            <tr>
              <th className="p-4 border-b border-slate-100">التاريخ</th>
              <th className="p-4 border-b border-slate-100">التصنيف</th>
              <th className="p-4 border-b border-slate-100">البيان</th>
              <th className="p-4 border-b border-slate-100">المبلغ</th>
              <th className="p-4 border-b border-slate-100 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">جاري التحميل...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">لا توجد مصروفات.</td></tr>
            ) : (
              expenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600">{format(e.date, 'dd MMM yyyy', { locale: ar })}</td>
                  <td className="p-4 font-bold text-slate-800">{e.category}</td>
                  <td className="p-4 text-slate-600">{e.description || '-'}</td>
                  <td className="p-4 font-bold text-rose-600">{e.amount} ج.م</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => deleteExpense(e.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
