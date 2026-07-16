import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Printer, Save, Building2, Plus, Trash2 } from 'lucide-react';
import { PrinterSettings, Branch } from '../types';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { shop, appUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(
    shop?.printerSettings || {
      type: '80mm',
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    }
  );
  
  const [vatEnabled, setVatEnabled] = useState(shop?.vatEnabled || false);
  const [vatRate, setVatRate] = useState(shop?.vatRate || 15);
  const [vatNumber, setVatNumber] = useState(shop?.vatNumber || '');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    if (shop?.printerSettings) {
      setPrinterSettings(shop.printerSettings);
    }
    if (shop?.branches) {
      setBranches(shop.branches);
    } else if (shop) {
      // Default branch if none exist
      setBranches([{ id: 'main', name: 'الفرع الرئيسي' }]);
    }
  }, [shop]);

  if (appUser?.role !== 'owner') {
    return <div className="p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    const newBranch: Branch = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      name: newBranchName.trim()
    };
    setBranches([...branches, newBranch]);
    setNewBranchName('');
  };

  const handleRemoveBranch = (id: string) => {
    if (branches.length === 1) {
      toast.error('يجب أن يحتوي المتجر على فرع واحد على الأقل');
      return;
    }
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleSave = async () => {
    if (!shop) return;
    setLoading(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'shops', shop.shopId), {
        printerSettings,
        branches,
        vatEnabled,
        vatRate,
        vatNumber
      });
      setSuccess(true);
      toast.success('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col gap-8">
      {/* Printer Settings */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="text-slate-500" /> إعدادات الطابعة
          </h2>
          <p className="text-slate-500 mt-2">قم بضبط نوع الطابعة وهوامش الطباعة الافتراضية لفواتير المبيعات.</p>
        </div>

        <div className="max-w-2xl bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-6">
            {/* Printer Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">نوع الطابعة</label>
              <div className="flex gap-4">
                <label className={`flex-1 border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${printerSettings.type === '80mm' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <input 
                    type="radio" 
                    name="printerType" 
                    value="80mm" 
                    checked={printerSettings.type === '80mm'}
                    onChange={() => setPrinterSettings({...printerSettings, type: '80mm'})}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${printerSettings.type === '80mm' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {printerSettings.type === '80mm' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <div className="font-bold">حرارية (80mm)</div>
                </label>

                <label className={`flex-1 border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${printerSettings.type === 'a4' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <input 
                    type="radio" 
                    name="printerType" 
                    value="a4" 
                    checked={printerSettings.type === 'a4'}
                    onChange={() => setPrinterSettings({...printerSettings, type: 'a4'})}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${printerSettings.type === 'a4' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {printerSettings.type === 'a4' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <div className="font-bold">عادية (A4)</div>
                </label>
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">هوامش الطباعة (بالمليمتر)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الهامش العلوي</label>
                  <input 
                    type="number" 
                    min="0"
                    value={printerSettings.marginTop}
                    onChange={e => setPrinterSettings({...printerSettings, marginTop: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الهامش السفلي</label>
                  <input 
                    type="number" 
                    min="0"
                    value={printerSettings.marginBottom}
                    onChange={e => setPrinterSettings({...printerSettings, marginBottom: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الهامش الأيمن</label>
                  <input 
                    type="number" 
                    min="0"
                    value={printerSettings.marginRight}
                    onChange={e => setPrinterSettings({...printerSettings, marginRight: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">الهامش الأيسر</label>
                  <input 
                    type="number" 
                    min="0"
                    value={printerSettings.marginLeft}
                    onChange={e => setPrinterSettings({...printerSettings, marginLeft: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Settings */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-slate-500" /> إعدادات الفروع
          </h2>
          <p className="text-slate-500 mt-2">إدارة الفروع المختلفة الخاصة بنشاطك التجاري.</p>
        </div>

        <div className="max-w-2xl bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-4">
            {branches.map(branch => (
              <div key={branch.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700">{branch.name}</span>
                <button 
                  onClick={() => handleRemoveBranch(branch.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="حذف الفرع"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            <div className="flex gap-3 pt-2">
              <input 
                type="text" 
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                placeholder="اسم الفرع الجديد..."
                className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                onClick={handleAddBranch}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all"
              >
                <Plus size={20} /> إضافة فرع
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Save Button */}
      <div className="max-w-2xl pt-6 border-t border-slate-200 flex items-center justify-between">
        {success ? (
          <span className="text-emerald-600 font-bold text-sm">تم الحفظ بنجاح!</span>
        ) : <span />}
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all disabled:opacity-70 shadow-xl shadow-blue-600/20 text-lg"
        >
          <Save size={24} />
          {loading ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
        </button>
      </div>
    </div>
  );
}
