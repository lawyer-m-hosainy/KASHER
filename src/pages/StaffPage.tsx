import { useState, useEffect, FormEvent } from 'react';
import { initializeApp } from 'firebase/app';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AppUser } from '../types';
import { Users, UserPlus, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffPage() {
  const { shop } = useAuth();
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchStaff = async () => {
    if (!shop) return;
    try {
      const q = query(collection(db, 'users'), where('shopId', '==', shop.shopId));
      const snapshot = await getDocs(q);
      setStaff(snapshot.docs.map(doc => doc.data() as AppUser));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    if (shop?.branches && shop.branches.length > 0) {
      setSelectedBranchId(shop.branches[0].id);
    }
  }, [shop]);


  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    try {
      // Use a secondary Firebase app to create users without logging out the current user
      const secondaryApp = initializeApp(auth.app.options, `SecondaryApp-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        userId: userCred.user.uid,
        shopId: shop.shopId,
        branchId: selectedBranchId || undefined,
        role: 'cashier',
        email
      });
      
      // Clean up the secondary auth
      await secondaryAuth.signOut();

      toast.success('تم إنشاء الحساب للكاشير بنجاح!');
      setEmail('');
      setPassword('');
      setShowForm(false);
      fetchStaff(); // Refresh the list
    } catch (error: any) {
      toast.error('حدث خطأ: ' + error.message);
    }
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'الفرع الرئيسي';
    return shop?.branches?.find(b => b.id === branchId)?.name || 'فرع غير معروف';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users /> إدارة الموظفين</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition font-bold text-sm"
        >
          <UserPlus size={20} />
          <span>إضافة كاشير</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddStaff} className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8 max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني للكاشير</label>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور (6 أحرف على الأقل)</label>
            <input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          
          {shop?.branches && shop.branches.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">تعيين إلى فرع</label>
              <select 
                value={selectedBranchId} 
                onChange={e => setSelectedBranchId(e.target.value)}
                className="w-full p-2 border rounded-md outline-none"
              >
                {shop.branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">إنشاء الحساب</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">إلغاء</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : staff.map(s => (
          <div key={s.userId} className="p-4 border rounded-xl flex items-start gap-4 bg-gray-50">
            <div className={`p-3 rounded-full shrink-0 ${s.role === 'owner' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
              {s.role === 'owner' ? <Shield size={24} /> : <Users size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 truncate">{s.email}</p>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-sm text-gray-500">{s.role === 'owner' ? 'مدير (المالك)' : 'كاشير'}</span>
                {s.role === 'cashier' && (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                    <Building2 size={12} /> {getBranchName(s.branchId)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {staff.length === 0 && !loading && (
          <div className="col-span-full p-8 text-center text-gray-500">لا يوجد موظفين</div>
        )}
      </div>
    </div>
  );
}
