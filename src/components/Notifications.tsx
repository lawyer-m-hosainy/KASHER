import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types';

export function Notifications() {
  const { shop, appUser } = useAuth();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shop || appUser?.role !== 'owner') return;

    const q = query(
      collection(db, 'products'),
      where('shopId', '==', shop.shopId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        productId: doc.id
      })) as Product[];
      
      const lowStock = productsData.filter(p => p.quantity <= p.lowStockThreshold);
      setLowStockProducts(lowStock);
    });

    return () => unsubscribe();
  }, [shop, appUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (appUser?.role !== 'owner') return null;

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white rounded-full border border-slate-200 shadow-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition relative"
      >
        <Bell size={20} />
        {lowStockProducts.length > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {lowStockProducts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">الإشعارات</h3>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md">
              {lowStockProducts.length} تنبيهات
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {lowStockProducts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {lowStockProducts.map(product => (
                  <div key={product.productId} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800 text-sm">{product.name}</span>
                      <span className="text-red-600 font-bold text-sm">{product.quantity}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      وصل إلى حد الأمان (المطلوب: أكبر من {product.lowStockThreshold})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                لا توجد إشعارات حالياً
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
