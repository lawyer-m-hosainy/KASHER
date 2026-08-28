import { useState, useEffect, FormEvent } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Customer } from '../types';
import { Users, UserPlus, Search, Edit2, Trash2, Wallet } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';

export default function CustomersPage() {
  const { shop, appUser, currentBranchId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: '' });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCustomers = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'customers'), where('shopId', '==', shop.shopId));
      const snapshot = await getDocs(q);
      setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    } catch (error) {
      console.error("Error fetching customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [shop]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'customers', editingId), { name, phone });
      } else {
        await addDoc(collection(db, 'customers'), {
          shopId: shop.shopId,
          name,
          phone,
          totalPurchases: 0
        });
      }
      setShowForm(false);
      setName('');
      setPhone('');
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer", error);
    }
  };

  const editCustomer = (c: Customer) => {
    setName(c.name);
    setPhone(c.phone || '');
    setEditingId(c.id);
    setShowForm(true);
  };

  const deleteCustomer = (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const executeDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ isOpen: false, id: '' });
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer", error);
    }
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!payingCustomer || !shop || !appUser) return;
    const amount = Number(paymentAmount);
    if (!(amount > 0)) return;

    setSubmittingPayment(true);
    try {
      await runTransaction(db, async (transaction) => {
        const customerRef = doc(db, 'customers', payingCustomer.id);
        transaction.update(customerRef, { balance: increment(-amount) });

        const paymentRef = doc(collection(db, 'payments'));
        transaction.set(paymentRef, {
          shopId: shop.shopId,
          branchId: currentBranchId || null,
          customerId: payingCustomer.id,
          amount,
          cashierId: appUser.userId,
          cashierName: appUser.email,
          createdAt: Date.now()
        });
      });
      toast.success('تم تسجيل الدفعة بنجاح');
      setPayingCustomer(null);
      setPaymentAmount('');
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-500" /> العملاء
          </h2>
          <p className="text-slate-500 mt-2">إدارة بيانات العملاء ومتابعة مبيعاتهم.</p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setName(''); setPhone(''); }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <UserPlus size={20} /> إضافة عميل
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-4">{editingId ? 'تعديل العميل' : 'عميل جديد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم العميل</label>
              <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
              <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold">حفظ</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold">إلغاء</button>
          </div>
        </form>
      )}

      <div className="relative mb-6">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="ابحث بالاسم أو رقم الهاتف..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-slate-100">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0">
            <tr>
              <th className="p-4 border-b border-slate-100">اسم العميل</th>
              <th className="p-4 border-b border-slate-100">رقم الهاتف</th>
              <th className="p-4 border-b border-slate-100">إجمالي المشتريات</th>
              <th className="p-4 border-b border-slate-100">الرصيد (آجل)</th>
              <th className="p-4 border-b border-slate-100 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-0"><TableSkeleton rows={4} cols={5} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">لا يوجد عملاء.</td></tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{c.name}</td>
                  <td className="p-4 text-slate-600">{c.phone || '-'}</td>
                  <td className="p-4 font-bold text-blue-600">{c.totalPurchases || 0} ج.م</td>
                  <td className="p-4 font-bold">
                    {(c.balance || 0) > 0 ? (
                      <span className="text-amber-600">{(c.balance || 0).toFixed(2)} ج.م</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
                      {(c.balance || 0) > 0 && (
                        <button
                          onClick={() => { setPayingCustomer(c); setPaymentAmount(''); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="تسجيل دفعة"
                        >
                          <Wallet size={18} />
                        </button>
                      )}
                      <button onClick={() => editCustomer(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => deleteCustomer(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا العميل؟"
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ isOpen: false, id: '' })}
      />

      {payingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <form onSubmit={handleRecordPayment} className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-1">تسجيل دفعة من {payingCustomer.name}</h3>
            <p className="text-slate-500 mb-4">الرصيد الحالي: {(payingCustomer.balance || 0).toFixed(2)} ج.م</p>
            <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ المدفوع</label>
            <input
              required
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              max={payingCustomer.balance || undefined}
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setPayingCustomer(null)} className="flex-1 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">إلغاء</button>
              <button type="submit" disabled={submittingPayment} className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {submittingPayment ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
