import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { LogOut, Clock, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function PendingActivationPage() {
  const { shop, loading } = useAuth();

  if (loading) return <div>جاري التحميل...</div>;

  if (shop?.subscriptionStatus === 'active') {
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={40} />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">في انتظار التفعيل</h2>
        
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg text-sm mb-6 text-right">
          <p className="font-semibold mb-2 flex items-center gap-2"><AlertCircle size={16} /> خطوات التفعيل:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>قم بتحويل قيمة الاشتراك إلى رقم فودافون كاش / إنستاباي: <strong>01000000000</strong></li>
            <li>أرسل صورة التحويل عبر الواتساب إلى نفس الرقم.</li>
            <li>سيتم تفعيل حسابك خلال ساعات عمل قليلة.</li>
          </ol>
        </div>
        
        <p className="text-gray-500 mb-8">
          حالة حسابك الحالي: <span className="font-bold text-yellow-600">قيد المراجعة</span>
        </p>
        
        <button
          onClick={() => auth.signOut()}
          className="flex items-center justify-center space-x-2 space-x-reverse w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
