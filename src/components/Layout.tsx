import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, Package, BarChart3, LogOut, Loader2, Users, Settings, Building2, Wallet, ReceiptText } from 'lucide-react';
import { auth } from '../lib/firebase';
import { Notifications } from './Notifications';
import { SyncStatus } from './SyncStatus';

export default function Layout() {
  const { appUser, shop, loading, currentBranchId, setCurrentBranchId } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  const handleLogout = async () => {
    await auth.signOut();
  };

  const currentBranchName = shop?.branches?.find(b => b.id === currentBranchId)?.name || 'الفرع الرئيسي';

  const navItems = [
    { path: '/pos', icon: <Store size={24} />, label: 'البيع', roles: ['owner', 'cashier'] },
    { path: '/sales-history', icon: <ReceiptText size={24} />, label: 'الفواتير', roles: ['owner', 'cashier'] },
    { path: '/customers', icon: <Users size={24} />, label: 'العملاء', roles: ['owner', 'cashier'] },
    { path: '/expenses', icon: <Wallet size={24} />, label: 'المصروفات', roles: ['owner', 'cashier'] },
    { path: '/inventory', icon: <Package size={24} />, label: 'المخزون', roles: ['owner'] },
    { path: '/reports', icon: <BarChart3 size={24} />, label: 'التقارير', roles: ['owner'] },
    { path: '/staff', icon: <Users size={24} />, label: 'الموظفين', roles: ['owner'] },
    { path: '/settings', icon: <Settings size={24} />, label: 'الإعدادات', roles: ['owner'] },
  ];

  const allowedNavItems = navItems.filter(item => appUser && item.roles.includes(appUser.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans pb-16 md:pb-0" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 h-full flex-col items-center py-8 gap-8 text-white shadow-xl print:hidden z-20">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">ك</div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-6">
          {allowedNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 space-x-reverse p-3 rounded-xl transition-all cursor-pointer ${
                location.pathname === item.path ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="font-bold">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="w-full px-6 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 space-x-reverse p-3 w-full text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition-colors font-bold"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-auto print:p-0 print:overflow-visible">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 shrink-0 relative z-40 print:hidden">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{shop?.name || 'كاشير سريع'}</h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">أهلاً بك، <span className="text-blue-600">{appUser?.email}</span> ({appUser?.role === 'owner' ? 'المالك' : 'الكاشير'})</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {appUser?.role === 'owner' && shop?.branches && shop.branches.length > 0 && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                <Building2 size={18} className="text-slate-400 ml-2" />
                <select 
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  value={currentBranchId || ''}
                  onChange={(e) => setCurrentBranchId(e.target.value)}
                >
                  {shop.branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            {appUser?.role === 'cashier' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-sm font-bold text-slate-700">
                <Building2 size={18} className="text-slate-400 ml-2" />
                {currentBranchName}
              </div>
            )}
            
            <SyncStatus />
            
            <div className={`px-4 py-2 rounded-xl font-bold text-sm border ${
              shop?.subscriptionStatus === 'active' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {shop?.subscriptionStatus === 'active' ? 'اشتراك مفعّل' : 'قيد المراجعة'}
            </div>
            
            <Notifications />
            
            <div className="hidden md:flex w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold italic shrink-0">
              {appUser?.email?.substring(0, 2).toUpperCase()}
            </div>
            
            {/* Mobile Logout Button */}
            <button
              onClick={handleLogout}
              className="md:hidden p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200"
              title="تسجيل الخروج"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 min-h-0 relative z-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {allowedNavItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              location.pathname === item.path ? 'text-blue-600 font-bold scale-110' : 'text-slate-400 font-medium'
            }`}
          >
            {item.icon}
            <span className="text-[10px] mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
