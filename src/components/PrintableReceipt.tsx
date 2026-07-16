import { forwardRef } from 'react';
import { SaleItem, PrinterSettings } from '../types';

interface PrintableReceiptProps {
  shopName: string;
  cashierName: string;
  customerName?: string;
  items: SaleItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  date: Date;
  printerSettings?: PrinterSettings;
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ shopName, cashierName, customerName, items, subtotal, discount, total, date, printerSettings }, ref) => {
    const widthClass = printerSettings?.type === 'a4' ? 'w-[210mm]' : 'w-[80mm]';
    const textSizeClass = printerSettings?.type === 'a4' ? 'text-base' : 'text-sm';
    
    const style = {
      paddingTop: `${printerSettings?.marginTop || 0}mm`,
      paddingBottom: `${printerSettings?.marginBottom || 0}mm`,
      paddingLeft: `${printerSettings?.marginLeft || 0}mm`,
      paddingRight: `${printerSettings?.marginRight || 0}mm`,
    };

    return (
      <div ref={ref} className={`bg-white text-black font-sans mx-auto ${widthClass} ${textSizeClass}`} dir="rtl" style={style}>
        <div className="text-center mb-4 border-b border-black border-dashed pb-2">
          {vatAmount !== undefined && vatAmount > 0 && (
            <div className="text-center text-xs mb-2 border border-black inline-block px-2 py-0.5 font-bold">فاتورة ضريبية مبسطة</div>
          )}
          <h2 className="text-xl font-bold mb-1">{shopName}</h2>
          <p className="text-xs mb-1">التاريخ: {date.toLocaleString('ar-EG')}</p>
          <p className="text-xs mb-1">كاشير: {cashierName}</p>
          {customerName && <p className="text-xs font-bold">العميل: {customerName}</p>}
        </div>
        
        <table className="w-full text-right text-xs mb-4">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="pb-1 text-right w-1/2">الصنف</th>
              <th className="pb-1 text-center w-1/4">الكمية</th>
              <th className="pb-1 text-left w-1/4">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="py-1 text-right break-words">{item.name} <span className="text-[10px] text-gray-500">({item.price.toFixed(2)})</span></td>
                <td className="py-1 text-center">{item.qty % 1 !== 0 ? item.qty.toFixed(3) : item.qty}</td>
                <td className="py-1 text-left">{(item.price * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="border-t border-black border-dashed pt-2 mt-4 space-y-1">
          {subtotal !== undefined && (
            <div className="flex justify-between text-sm">
              <span>المجموع:</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
          )}
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between text-sm">
              <span>الخصم:</span>
              <span>-{discount.toFixed(2)}</span>
            </div>
          )}
          {vatAmount !== undefined && vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>الضريبة:</span>
              <span>{vatAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1 border-t border-black">
            <span>الصافي:</span>
            <span>{total.toFixed(2)} ج.م</span>
          </div>
        </div>
        
        <p className="mt-8 text-xs text-center font-bold">شكراً لزيارتكم!</p>
      </div>
    );
  }
);
