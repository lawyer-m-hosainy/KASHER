import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product, SaleItem, Customer } from '../types';
import { Search, Plus, Minus, Trash2, ReceiptText, CheckCircle2, Printer, ScanLine, UserSquare2, Percent } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { toast } from 'sonner';

export default function PosPage() {
  const { shop, appUser, currentBranchId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<{items: SaleItem[], subtotal?: number, discount?: number, total: number, date: Date, customerId?: string} | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const receiptRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  useEffect(() => {
    if (!shop || !currentBranchId) return;
    const fetchData = async () => {
      try {
        const pQ = query(
          collection(db, 'products'), 
          where('shopId', '==', shop.shopId),
          where('branchId', '==', currentBranchId)
        );
        const pSnapshot = await getDocs(pQ);
        setProducts(pSnapshot.docs.map(doc => ({ ...doc.data(), productId: doc.id } as Product)));

        const cQ = query(collection(db, 'customers'), where('shopId', '==', shop.shopId));
        const cSnapshot = await getDocs(cQ);
        setCustomers(cSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shop, currentBranchId]);

  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    const existing = cart.find(item => item.productId === product.productId);
    if (existing) {
      if (existing.qty + quantityToAdd > product.quantity) {
         alert('الكمية المتاحة لا تكفي!');
         return;
      }
      setCart(cart.map(item => item.productId === product.productId ? { ...item, qty: item.qty + quantityToAdd } : item));
    } else {
      if (product.quantity < quantityToAdd) {
        alert('المنتج غير متوفر في المخزن بالكمية المطلوبة!');
        return;
      }
      setCart([...cart, { productId: product.productId, name: product.name, price: product.price, qty: quantityToAdd }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const product = products.find(p => p.productId === productId);
    const newQty = item.qty + delta;
    
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }
    
    if (product && newQty > product.quantity) {
       alert('الكمية المتاحة لا تكفي!');
       return;
    }

    setCart(cart.map(i => i.productId === productId ? { ...i, qty: newQty } : i));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalBeforeVat = subtotal - discountAmount;
  
  const vatAmount = shop?.vatEnabled ? (totalBeforeVat * (shop.vatRate || 0)) / 100 : 0;
  const total = totalBeforeVat + vatAmount;

  const handleCheckout = async () => {
    if (cart.length === 0 || !shop || !appUser || !currentBranchId) return;
    setLoading(true);
    
    try {
      const now = Date.now();
      
      const invoiceNumber = Math.floor(100000 + Math.random() * 900000).toString();
      const newSaleId = `sale-${now}`;
      const saleData = {
        invoiceNumber,
        shopId: shop.shopId,
        branchId: currentBranchId,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.qty
        })),
        subtotal,
        discount: discountAmount,
        total,
        vatAmount,
        date: new Date(now),
        customerId: selectedCustomerId || null
      };

      if (navigator.onLine) {
        await setDoc(doc(db, 'sales', newSaleId), saleData);

        // Update Customer purchases
        if (selectedCustomerId) {
          const customer = customers.find(c => c.id === selectedCustomerId);
          if (customer) {
            await updateDoc(doc(db, 'customers', selectedCustomerId), {
              totalPurchases: (customer.totalPurchases || 0) + total
            });
          }
        }

        // Deduct Inventory in Firebase
        for (const item of cart) {
          const product = products.find(p => p.productId === item.productId);
          if (product) {
            const newQuantity = product.quantity - item.qty;
            await updateDoc(doc(db, 'products', item.productId), {
              quantity: newQuantity
            });
            product.quantity = newQuantity; 
          }
        }
      } else {
        // Offline Mode
        const { saveOfflineSale } = await import('../lib/offlineDb');
        await saveOfflineSale({
          id: now.toString() + Math.random().toString(36).substring(7),
          ...saleData
        });
        
        // Deduct Inventory Locally only
        for (const item of cart) {
          const product = products.find(p => p.productId === item.productId);
          if (product) {
            product.quantity = product.quantity - item.qty;
          }
        }
      }

      setLastSale({ 
        items: [...cart], 
        subtotal, 
        discount: discountAmount, 
        total, 
        vatAmount,
        date: new Date(now),
        customerId: selectedCustomerId
      });
      setCart([]);
      setSelectedCustomerId('');
      setDiscountPercent(0);
      setCheckoutSuccess(true);
      toast.success('تمت عملية البيع بنجاح!');
      
      setTimeout(() => {
        handlePrint();
      }, 300);

      setTimeout(() => setCheckoutSuccess(false), 5000);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إتمام البيع');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.includes(search) || 
    (p.barcode && p.barcode.includes(search)) ||
    (p.productId && p.productId.includes(search))
  );

  const processBarcode = (code: string) => {
    const exactMatch = products.find(p => p.barcode === code || p.productId === code);
    if (exactMatch && exactMatch.quantity > 0) {
      addToCart(exactMatch);
      return true;
    }

    if (code.length === 13 && /^[0-9]+$/.test(code)) {
      const prefix = code.substring(0, 2);
      if (prefix.startsWith('2')) {
        const itemCode = code.substring(2, 7);
        const valueRaw = Number(code.substring(7, 12));
        
        const product = products.find(p => 
          p.barcode === itemCode || 
          p.barcode === String(Number(itemCode))
        );

        if (product) {
          let qty = 1;
          if (prefix === '20') {
            qty = valueRaw / 1000;
          } else if (prefix === '21') {
            const totalPrice = valueRaw / 100;
            qty = totalPrice / product.price;
          } else {
            qty = valueRaw / 1000;
          }

          if (qty > 0) {
            addToCart(product, qty);
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleScan = (decodedText: string) => {
    const success = processBarcode(decodedText);
    if (!success) {
      setSearch(decodedText);
    } else {
      setSearch('');
    }
    setShowScanner(false);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      const success = processBarcode(search.trim());
      if (success) {
        setSearch('');
      }
    }
  };

  if (loading && products.length === 0) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="flex h-full gap-6">
      <div style={{ display: 'none' }}>
        {lastSale && shop && appUser && (
          <PrintableReceipt
            ref={receiptRef}
            shopName={shop.name}
            cashierName={appUser.email || 'كاشير'}
            customerName={customers.find(c => c.id === lastSale.customerId)?.name}
            items={lastSale.items}
            subtotal={lastSale.subtotal}
            discount={lastSale.discount}
            total={lastSale.total}
            date={lastSale.date}
            printerSettings={shop.printerSettings}
          />
        )}
      </div>

      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن منتج بالاسم أو الباركود..." 
              className="w-full pl-4 pr-12 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <button 
            onClick={() => setShowScanner(true)}
            className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm shrink-0"
            title="مسح باركود"
          >
            <ScanLine size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start bg-slate-50/50">
          {filteredProducts.map(product => (
            <button
              key={product.productId}
              onClick={() => addToCart(product)}
              disabled={product.quantity <= 0}
              className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between h-36 ${
                product.quantity > 0 
                  ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer group' 
                  : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">{product.name}</span>
              <div className="flex justify-between items-end w-full mt-2">
                <span className="text-sm text-slate-500">{product.quantity > 0 ? `المتاح: ${product.quantity}` : <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md">نفد</span>}</span>
                <span className="font-black text-blue-600 text-lg">{product.price} <span className="text-xs font-normal">ج.م</span></span>
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 font-medium">لا توجد منتجات مطابقة للبحث</div>
          )}
        </div>
      </div>

      <div className="w-96 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-3 text-slate-800">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ReceiptText size={20} />
          </div>
          <span className="font-bold text-lg">الفاتورة الحالية</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {cart.map(item => (
            <div key={item.productId} className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between font-bold text-slate-800">
                <span>{item.name}</span>
                <span className="text-blue-600">{(item.price * item.qty).toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">{item.price} ج.م للوحدة</span>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 p-1">
                  <button onClick={() => updateQty(item.productId, 1)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-colors"><Plus size={16}/></button>
                  <span className="font-bold min-w-[24px] text-center text-slate-800">{item.qty % 1 !== 0 ? item.qty.toFixed(3) : item.qty}</span>
                  <button onClick={() => updateQty(item.productId, -1)} className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors">
                    {item.qty <= 1 ? <Trash2 size={16}/> : <Minus size={16}/>}
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {cart.length === 0 && !checkoutSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <ReceiptText size={32} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">السلة فارغة، ابدأ بإضافة منتجات</p>
            </div>
          )}

          {checkoutSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-emerald-600 space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
              <p className="font-bold text-xl">تم البيع بنجاح!</p>
              <button 
                onClick={() => handlePrint()}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition font-bold"
              >
                <Printer size={18} /> طباعة الفاتورة مجدداً
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <UserSquare2 className="text-slate-400" size={20} />
              <select 
                value={selectedCustomerId} 
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">عميل نقدي (بدون اسم)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <Percent className="text-slate-400" size={20} />
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  placeholder="نسبة الخصم %"
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-transparent outline-none"
                />
                <span className="px-3 text-slate-400 border-r border-slate-200 bg-slate-100">%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500">المجموع الفرعي</span>
            <span className="font-bold text-slate-700">{subtotal} ج.م</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center mb-2 text-rose-500">
              <span>الخصم ({discountPercent}%)</span>
              <span className="font-bold">-{discountAmount.toFixed(2)} ج.م</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-6 pt-2 border-t border-slate-100">
            <span className="text-slate-800 font-bold">الإجمالي المستحق</span>
            <span className="text-4xl font-black text-blue-600">{total.toFixed(2)} <span className="text-lg text-slate-400 font-normal">ج.م</span></span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.98]"
          >
            {loading ? 'جاري التنفيذ...' : 'إتمام الدفع والطباعة'}
          </button>
        </div>
      </div>
    </div>
  );
}
