import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseBackup, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchShopBackupData, exportBackupJSON, exportBackupExcel } from '../lib/backup';

const LAST_BACKUP_KEY = 'kasher_last_backup_at';

export default function BackupPage() {
  const { shop, appUser } = useAuth();
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(
    () => localStorage.getItem(LAST_BACKUP_KEY)
  );

  if (appUser?.role !== 'owner') {
    return <div className="p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
  }

  const rememberBackupTime = () => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_KEY, now);
    setLastBackupAt(now);
  };

  const handleExportJson = async () => {
    if (!shop) return;
    setExportingJson(true);
    try {
      const data = await fetchShopBackupData(shop.shopId);
      exportBackupJSON(shop, data);
      rememberBackupTime();
      toast.success('تم تنزيل النسخة الاحتياطية بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportExcel = async () => {
    if (!shop) return;
    setExportingExcel(true);
    try {
      const data = await fetchShopBackupData(shop.shopId);
      await exportBackupExcel(shop, data);
      rememberBackupTime();
      toast.success('تم تصدير ملف Excel بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير ملف Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <DatabaseBackup className="text-slate-500" /> النسخ الاحتياطي والتصدير
        </h2>
        <p className="text-slate-500 mt-2 max-w-2xl">
          بياناتك محفوظة أصلاً على السحابة (Firebase) ومتاحة لحظيًا من كل الفروع. هذه الصفحة توفر طبقة أمان إضافية:
          نسخة احتياطية محلية يمكنك حفظها على جهازك، ليست بديلاً عن السحابة بل احتياط إضافي في حال حدوث مشكلة في الاتصال أو الحساب.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 max-w-2xl text-sm">
        <ShieldCheck className="shrink-0 mt-0.5" size={20} />
        <p>يشمل التصدير بيانات كل الفروع (المنتجات، المبيعات، المصروفات، العملاء، المرتجعات، دفعات العملاء) لأن هذه الصفحة متاحة للمالك فقط.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <FileJson className="text-blue-500" /> نسخة احتياطية كاملة (JSON)
          </div>
          <p className="text-slate-500 text-sm flex-1">
            ملف واحد يحتوي كل بيانات المتجر بصيغة قابلة للأرشفة أو الاستعادة لاحقًا عند الحاجة.
          </p>
          <button
            onClick={handleExportJson}
            disabled={exportingJson}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-60"
          >
            {exportingJson ? 'جاري التجهيز...' : 'تنزيل نسخة JSON'}
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <FileSpreadsheet className="text-emerald-600" /> تقرير شامل (Excel)
          </div>
          <p className="text-slate-500 text-sm flex-1">
            ملف Excel بعدة صفحات (المخزون، المبيعات، المصروفات، العملاء، المرتجعات، دفعات العملاء) مناسب للمراجعة أو تسليمه للمحاسب.
          </p>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-60"
          >
            {exportingExcel ? 'جاري التجهيز...' : 'تصدير Excel'}
          </button>
        </div>
      </div>

      {lastBackupAt && (
        <p className="text-slate-400 text-sm">
          آخر نسخة احتياطية على هذا الجهاز: {new Date(lastBackupAt).toLocaleString('ar-EG')}
        </p>
      )}
    </div>
  );
}
