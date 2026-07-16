import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Loader2, ArrowRight, Store, User, Phone, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Utility to translate Firebase Auth errors to Arabic
const getAuthErrorMessage = (code: string) => {
  switch (code) {
    case 'auth/invalid-email': return 'البريد الإلكتروني غير صالح.';
    case 'auth/user-disabled': return 'تم إيقاف هذا الحساب.';
    case 'auth/user-not-found': return 'لا يوجد حساب بهذا البريد الإلكتروني.';
    case 'auth/wrong-password': return 'كلمة المرور غير صحيحة.';
    case 'auth/email-already-in-use': return 'البريد الإلكتروني مستخدم بالفعل لحساب آخر.';
    case 'auth/weak-password': return 'كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل.';
    case 'auth/invalid-credential': return 'بيانات الدخول غير صحيحة.';
    default: return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
        setIsForgotPassword(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/pos');
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCred.user.uid;
        
        const shopId = userId; // Owner ID = Shop ID
        
        await setDoc(doc(db, 'shops', shopId), {
          shopId,
          name: shopName,
          ownerName,
          phone,
          subscriptionStatus: 'pending',
          createdAt: Date.now()
        });

        await setDoc(doc(db, 'users', userId), {
          userId,
          shopId,
          role: 'owner',
          email
        });
        
        toast.success('تم إنشاء الحساب بنجاح!');
        navigate('/pending');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">ك</div>
              <span className="font-black text-2xl text-slate-900 tracking-tight">كاشير سريع</span>
            </Link>
            
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
              {isForgotPassword ? 'استعادة كلمة المرور' : (isLogin ? 'تسجيل الدخول' : 'أنشئ حساب محلك')}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isForgotPassword ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً.' : (isLogin ? 'مرحباً بعودتك! الرجاء إدخال بيانات الدخول.' : 'ابدأ تجربتك المجانية الآن.')}
            </p>
          </div>

          <div className="mt-8">
            <form className="space-y-5" onSubmit={handleAuth}>
              
              {!isLogin && !isForgotPassword && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">اسم المحل</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Store className="h-5 w-5 text-slate-400" />
                      </div>
                      <input type="text" required value={shopName} onChange={e => setShopName(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="سوبر ماركت الهدى..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">اسم المالك</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="أحمد محمد" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="010..." />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="you@example.com" />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="••••••••" />
                  </div>
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="font-bold text-blue-600 hover:text-blue-500">
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                </div>
              )}

              <div>
                <button disabled={loading} type="submit" className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isForgotPassword ? 'إرسال رابط الاستعادة' : (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'))}
                  {!loading && <ArrowRight className="w-5 h-5 rotate-180" />}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <button 
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(!isLogin);
                }} 
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all"
              >
                {isForgotPassword ? 'العودة لتسجيل الدخول' : (isLogin ? 'ليس لديك حساب؟ أنشئ متجرك مجاناً' : 'لديك حساب؟ سجل دخولك')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-600 to-indigo-900 overflow-hidden">
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
           
           <div className="h-full flex flex-col justify-center items-center text-white px-20">
              <div className="bg-white/10 p-12 rounded-3xl backdrop-blur-md border border-white/20 text-center">
                 <Store size={80} className="mx-auto mb-8 text-blue-200" />
                 <h3 className="text-4xl font-black mb-4">نظام متكامل</h3>
                 <p className="text-xl text-blue-100 max-w-md leading-relaxed">
                   أدر مبيعاتك، مخزونك، وتقارير أرباحك في مكان واحد، بكل سهولة وأمان.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
