import { Link } from 'react-router-dom';
import { Store, TrendingUp, ShieldCheck, CheckCircle2, ChevronLeft, BarChart3, Smartphone, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">ك</div>
              <span className="font-black text-2xl text-slate-900 tracking-tight">كاشير سريع</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-600 hover:text-slate-900 font-bold transition-colors">دخول للمنصة</Link>
              <Link to="/login" className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                ابدأ مجاناً
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-3xl filter" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm mb-8 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              النظام الأسهل لإدارة محلك التجاري
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
              نقطة بيع ذكية، <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                تدير تجارتك بنجاح
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              تطبيق متكامل للكاشير، إدارة المخزون، ومتابعة الأرباح والتقارير. صُمم خصيصاً لأصحاب المحلات الصغيرة والمتوسطة.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 group">
                جرب النظام مجاناً
                <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-bold rounded-full hover:bg-slate-50 transition-all border border-slate-200">
                تعرف على المميزات
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">كل ما تحتاجه لإدارة محلك</h2>
            <p className="text-lg text-slate-600">نظام واحد يجمع كل الأدوات التي تساعدك في متابعة تجارتك، زيادة مبيعاتك، وتقليل الهدر.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">نقطة بيع سريعة (POS)</h3>
              <p className="text-slate-600 leading-relaxed">شاشة كاشير بسيطة وسريعة لإتمام البيع في ثوانٍ معدودة مع دعم أجهزة قراءة الباركود وطباعة الفواتير.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors group">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Store size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">إدارة دقيقة للمخزون</h3>
              <p className="text-slate-600 leading-relaxed">تتبع كميات المنتجات، وتلقى تنبيهات تلقائية عندما يقترب صنف من النفاد لتجنب خسارة المبيعات.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors group">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">تقارير وأرباح</h3>
              <p className="text-slate-600 leading-relaxed">تابع مبيعاتك، أرباحك الصافية، وأكثر المنتجات مبيعاً عبر رسوم بيانية واضحة وفي الوقت الفعلي.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-colors group">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">صلاحيات آمنة</h3>
              <p className="text-slate-600 leading-relaxed">بيانات محلك في أمان مع صلاحيات منفصلة للكاشير والمدير. الكاشير يبيع فقط، وأنت تتحكم في كل شيء.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors group">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">العمل بدون إنترنت</h3>
              <p className="text-slate-600 leading-relaxed">انقطع الإنترنت؟ لا مشكلة. استمر في البيع وسيتم مزامنة بياناتك تلقائياً عند عودة الاتصال.</p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-colors group">
              <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">متوافق مع كل الأجهزة</h3>
              <p className="text-slate-600 leading-relaxed">يعمل على الكمبيوتر، اللابتوب، التابلت، والموبايل. راقب محلك من أي مكان وفي أي وقت.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-black mb-6">جاهز لتطوير تجارتك؟</h2>
          <p className="text-xl text-slate-400 mb-10">انضم لمئات المحلات التي تثق في كاشير سريع لإدارة مبيعاتها يومياً.</p>
          <Link to="/login" className="inline-block px-10 py-5 bg-blue-600 text-white font-bold text-lg rounded-full shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:bg-blue-500 hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] transition-all transform hover:-translate-y-1">
            أنشئ حسابك مجاناً الآن
          </Link>
          <ul className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> لا حاجة لبطاقة ائتمان</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> تجربة مجانية كاملة</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> دعم فني مستمر</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">ك</div>
            <span className="font-bold text-slate-300 text-lg">كاشير سريع</span>
          </div>
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة لـ كاشير سريع.</p>
        </div>
      </footer>
    </div>
  );
}
