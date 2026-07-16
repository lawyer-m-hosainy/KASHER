import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We create an instance of the scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Success callback
        scanner.clear();
        onScan(decodedText);
      },
      (err) => {
        // Error callback (called continuously as it fails to read)
        // We only log to console to avoid spam
        console.warn(err);
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">مسح الباركود</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {error && <p className="text-red-500 text-center mb-4 text-sm font-medium">{error}</p>}
          <div id="reader" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-200"></div>
          <p className="text-center text-slate-500 text-sm mt-4">ضع الباركود أمام الكاميرا مباشرة</p>
        </div>
      </div>
    </div>
  );
}
