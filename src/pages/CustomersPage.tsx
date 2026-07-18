import { useState, useEffect, FormEvent } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Customer } from '../types';
import { Users, UserPlus, Search, Edit2, Trash2 } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';

export default function CustomersPage() {
  const { shop } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: '' });
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
              <th className="p-4 border-b border-slate-100 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="p-0"><TableSkeleton rows={4} cols={4} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500 font-medium">لا يوجد عملاء.</td></tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{c.name}</td>
                  <td className="p-4 text-slate-600">{c.phone || '-'}</td>
                  <td className="p-4 font-bold text-blue-600">{c.totalPurchases || 0} ج.م</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
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
    </div>
  );
}
