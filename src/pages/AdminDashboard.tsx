import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shop } from '../types';
import { ShieldCheck, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'shops'));
      const shopsData: Shop[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== 'ADMIN') {
           shopsData.push(doc.data() as Shop);
        }
      });
      setShops(shopsData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const toggleStatus = async (shopId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'pending' : 'active';
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        subscriptionStatus: newStatus
      });
      setShops(shops.map(s => s.shopId === shopId ? { ...s, subscriptionStatus: newStatus } : s));
      toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} المتجر بنجاح`);
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-900 text-white flex items-center gap-3">
          <ShieldCheck size={28} />
          <h1 className="text-2xl font-bold">لوحة تحكم المنصة (للمالك فقط)</h1>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">اسم المحل</th>
                <th className="p-4 font-semibold text-gray-600">المالك</th>
                <th className="p-4 font-semibold text-gray-600">الهاتف</th>
                <th className="p-4 font-semibold text-gray-600">تاريخ التسجيل</th>
                <th className="p-4 font-semibold text-gray-600">الحالة</th>
                <th className="p-4 font-semibold text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shops.map(shop => (
                <tr key={shop.shopId} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{shop.name}</td>
                  <td className="p-4 text-gray-600">{shop.ownerName}</td>
                  <td className="p-4 text-gray-600">{shop.phone}</td>
                  <td className="p-4 text-gray-500">{new Date(shop.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      shop.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {shop.subscriptionStatus === 'active' ? 'مفعّل' : 'في الانتظار'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(shop.shopId, shop.subscriptionStatus)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition ${
                        shop.subscriptionStatus === 'active' 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {shop.subscriptionStatus === 'active' ? <><XCircle size={16}/> إيقاف</> : <><CheckCircle size={16}/> تفعيل</>}
                    </button>
                  </td>
                </tr>
              ))}
              {shops.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد محلات مسجلة بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
