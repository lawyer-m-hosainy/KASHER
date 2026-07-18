import { useState, useEffect, FormEvent } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, limit, startAfter, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types';
import { PackagePlus, Edit2, Trash2, Search, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';

export default function InventoryPage() {
  const { shop, currentBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState<'piece' | 'kg'>('piece');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: '' });

  const fetchProducts = async (isLoadMore = false) => {
    if (!shop || !currentBranchId) return;
    setLoading(true);
    try {
      let baseQuery = query(
        collection(db, 'products'),
        where('shopId', '==', shop.shopId),
        where('branchId', '==', currentBranchId),
        orderBy('name'),
        limit(25)
      );

      if (isLoadMore && lastVisible) {
        baseQuery = query(baseQuery, startAfter(lastVisible));
      }

      const snapshot = await getDocs(baseQuery);

      setHasMore(snapshot.docs.length === 25);
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }

      const newProducts = snapshot.docs.map(doc => ({ ...doc.data(), productId: doc.id } as Product));
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [shop, currentBranchId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop || !currentBranchId) return;
    
    const productData = {
      shopId: shop.shopId,
      branchId: currentBranchId,
      name,
      barcode: barcode || undefined,
      category,
      unit,
      price: Number(price),
      costPrice: costPrice ? Number(costPrice) : undefined,
      quantity: Number(quantity),
      lowStockThreshold: Number(lowStockThreshold)
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      setShowForm(false);
      resetForm();
      fetchProducts();
      toast.success(editingId ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const executeDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ isOpen: false, id: '' });
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('تم حذف المنتج بنجاح');
      fetchProducts();
    } catch (error) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.productId);
    setName(p.name);
    setBarcode(p.barcode || '');
    setCategory(p.category || '');
    setUnit(p.unit || 'piece');
    setPrice(String(p.price));
    setCostPrice(p.costPrice ? String(p.costPrice) : '');
    setQuantity(String(p.quantity));
    setLowStockThreshold(String(p.lowStockThreshold));
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBarcode('');
    setCategory('');
    setUnit('piece');
    setPrice('');
    setCostPrice('');
    setQuantity('');
    setLowStockThreshold('5');
  };

  const filtered = products.filter(p => p.name.includes(search) || p.category?.includes(search) || p.barcode?.includes(search));

  const exportCSV = () => {
    const headers = ['\u0627\u0644\u0627\u0633\u0645','\u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062f','\u0627\u0644\u062a\u0635\u0646\u064a\u0641','\u0627\u0644\u0648\u062d\u062f\u0629','\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639','\u0633\u0639\u0631 \u0627\u0644\u062a\u0643\u0644\u0641\u0629','\u0627\u0644\u0643\u0645\u064a\u0629','\u062d\u062f \u0627\u0644\u062a\u0646\u0628\u064a\u0647'];
    const rows = filtered.map(p => [
      p.name,
      p.barcode || '',
      p.category || '',
      p.unit === 'kg' ? '\u0643\u064a\u0644\u0648\u062c\u0631\u0627\u0645' : '\u0642\u0637\u0639\u0629',
      p.price,
      p.costPrice || '',
      p.quantity,
      p.lowStockThreshold
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-full p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">إدارة المخزون</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition font-bold text-sm border border-emerald-100"
          >
            <Download size={18} />
            <span>تصدير CSV</span>
          </button>
          <button 
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition font-bold text-sm"
          >
          <PackagePlus size={20} />
          <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
            <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">الباركود (اختياري)</label>
            <input type="text" value={barcode} onChange={e=>setBarcode(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">التصنيف</label>
            <select 
              required
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {(!shop?.categories || shop.categories.length === 0) ? (
                <option value="عام">عام</option>
              ) : (
                <>
                  <option value="" disabled>اختر التصنيف...</option>
                  {shop.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {category && !shop.categories.includes(category) && (
                    <option value={category}>{category}</option>
                  )}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">وحدة القياس</label>
            <select 
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={unit}
              onChange={e => setUnit(e.target.value as 'piece' | 'kg')}
            >
              <option value="piece">قطعة</option>
              <option value="kg">كيلوجرام</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع (ج.م)</label>
            <input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة (اختياري)</label>
            <input type="number" min="0" step="0.01" value={costPrice} onChange={e=>setCostPrice(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المتوفرة</label>
            <input required type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">حد التنبيه</label>
            <input required type="number" min="0" value={lowStockThreshold} onChange={e=>setLowStockThreshold(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div className="col-span-full flex gap-3 mt-2">
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">حفظ المنتج</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">إلغاء</button>
          </div>
        </form>
      )}

      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="ابحث بالاسم، الفئة، أو الباركود..." 
          value={search}
          onChange={e=>setSearch(e.target.value)}
          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-t text-gray-600">
              <th className="p-3 font-semibold">المنتج</th>
              <th className="p-3 font-semibold">الباركود</th>
              <th className="p-3 font-semibold">الفئة</th>
              <th className="p-3 font-semibold">السعر</th>
              <th className="p-3 font-semibold">التكلفة</th>
              <th className="p-3 font-semibold">الكمية</th>
              <th className="p-3 font-semibold text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">لا توجد منتجات</td></tr>
            ) : (
              filtered.map(p => {
                const isLow = p.quantity <= p.lowStockThreshold;
                return (
                  <tr key={p.productId} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{p.name}</td>
                    <td className="p-3 text-gray-500 font-mono text-sm">{p.barcode || '-'}</td>
                    <td className="p-3 text-gray-600">{p.category || '-'}</td>
                    <td className="p-3 font-medium text-blue-600">{p.price} ج.م</td>
                    <td className="p-3 text-gray-500">{p.costPrice ? `${p.costPrice} ج.م` : '-'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-bold ${isLow ? 'bg-red-100 text-red-700' : 'text-gray-800'}`}>
                        {p.quantity} {isLow && <AlertCircle size={14}/>}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18}/></button>
                        <button onClick={() => handleDelete(p.productId)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {hasMore && (
          <div className="flex justify-center p-4 bg-white border-t border-gray-100">
            <button 
              onClick={() => fetchProducts(true)}
              disabled={loading}
              className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
            >
              {loading ? 'جاري التحميل...' : 'عرض المزيد'}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المنتج؟"
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ isOpen: false, id: '' })}
      />
    </div>
  );
}
