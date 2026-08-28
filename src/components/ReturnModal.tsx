import { useState } from 'react';
import { X, Undo2 } from 'lucide-react';
import { Sale } from '../types';

interface ReturnModalProps {
  sale: Sale;
  remainingQty: Record<string, number>;
  canRefundToCredit: boolean;
  onClose: () => void;
  onSubmit: (items: { productId: string; name: string; price: number; qty: number }[], refundMethod: 'cash' | 'credit') => void;
  submitting: boolean;
}

export function ReturnModal({ sale, remainingQty, canRefundToCredit, onClose, onSubmit, submitting }: ReturnModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit'>('cash');

  const setQty = (productId: string, qty: number, max: number) => {
    const clamped = Math.max(0, Math.min(qty, max));
    setQuantities(prev => ({ ...prev, [productId]: clamped }));
  };

  const selectedItems = sale.items
    .map(item => ({ ...item, qty: quantities[item.productId] || 0 }))
    .filter(item => item.qty > 0);

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Undo2 className="text-rose-500" /> إرجاع فاتورة #{sale.invoiceNumber || sale.id}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          {sale.items.map(item => {
            const max = remainingQty[item.productId] ?? 0;
            return (
              <div key={item.productId} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.price} ج.م × {item.qty} (المتاح للإرجاع: {max})</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={max}
                  step="any"
                  disabled={max <= 0}
                  value={quantities[item.productId] || ''}
                  onChange={e => setQty(item.productId, Number(e.target.value), max)}
                  placeholder="0"
                  className="w-20 p-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-center disabled:bg-slate-100"
                />
              </div>
            );
          })}
          {sale.items.every(item => (remainingQty[item.productId] ?? 0) <= 0) && (
            <p className="text-center text-slate-500 py-4">تم إرجاع كل عناصر هذه الفاتورة بالفعل.</p>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <label className={`flex-1 border rounded-xl p-3 flex items-center gap-2 cursor-pointer transition-colors ${refundMethod === 'cash' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
              <input type="radio" name="refundMethod" className="hidden" checked={refundMethod === 'cash'} onChange={() => setRefundMethod('cash')} />
              <span className="font-bold text-sm">استرداد نقدي</span>
            </label>
            <label className={`flex-1 border rounded-xl p-3 flex items-center gap-2 transition-colors ${!canRefundToCredit ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : refundMethod === 'credit' ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-pointer' : 'bg-white border-slate-200 text-slate-600 cursor-pointer'}`}>
              <input type="radio" name="refundMethod" className="hidden" disabled={!canRefundToCredit} checked={refundMethod === 'credit'} onChange={() => setRefundMethod('credit')} />
              <span className="font-bold text-sm">خصم من رصيد العميل</span>
            </label>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">إجمالي المرتجع</span>
            <span className="text-2xl font-black text-rose-600">{total.toFixed(2)} ج.م</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => onSubmit(selectedItems, refundMethod)}
              disabled={submitting || selectedItems.length === 0}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'جاري التنفيذ...' : 'تأكيد الإرجاع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
