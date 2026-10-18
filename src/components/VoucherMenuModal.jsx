import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ShoppingCart,
  Truck,
  RotateCcw,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  PlusCircle,
  Clock,
  X,
  Search,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export default function VoucherMenuModal({
  isOpen,
  onClose,
  onSelectAction
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const searchInputRef = useRef(null);

  const voucherOptions = [
    {
      key: '1',
      id: 'RETAIL_SALE',
      title: 'काऊंटर विक्री (Counter Retail Sale)',
      subtitle: 'नियमित किरकोळ बिलिंग, QR कोड, थर्मल प्रिंट (MRP)',
      shortcut: 'Alt + S',
      icon: ShoppingCart,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      key: '2',
      id: 'PURCHASE_INWARD',
      title: 'घाऊक खरेदी नोंद (Wholesale Purchase Inward)',
      subtitle: 'सप्लायर बिल, बॅच व स्कीम (10+2), PTR लँडिंग दर नोंद',
      shortcut: 'F7',
      icon: Truck,
      color: 'text-blue-700 bg-blue-50 border-blue-200'
    },
    {
      key: '3',
      id: 'SALES_RETURN',
      title: 'ग्राहक औषध रिटर्न (Customer Sales Return)',
      subtitle: 'न वापरलेले औषध परत, जीएसटी क्रेडिट नोट, स्टॉक रिस्टोर',
      shortcut: 'Alt + R',
      icon: RotateCcw,
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
      key: '4',
      id: 'DEBIT_NOTE',
      title: 'मुदत संपलेले रिटर्न (Expiry GST Debit Note)',
      subtitle: 'सप्लायरकडे एक्स्पायरी माल परत, Sec 34 GST क्लेम',
      shortcut: 'Alt + D',
      icon: AlertTriangle,
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    },
    {
      key: '5',
      id: 'PAYMENT_VOUCHER',
      title: 'पेमेंट पावती (Distributor / Expense Payment)',
      subtitle: 'डिस्ट्रीब्यूटर उधारी फेड किंवा दुकानाचे दैनंदिन खर्च (PAY)',
      shortcut: 'F5',
      icon: ArrowUpRight,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      key: '6',
      id: 'RECEIPT_VOUCHER',
      title: 'खाते जमा पावती (Customer Khata Receipt)',
      subtitle: 'ग्राहकाकडून आलेली रोख / UPI जमा पावती (REC)',
      shortcut: 'F6',
      icon: ArrowDownRight,
      color: 'text-teal-700 bg-teal-50 border-teal-200'
    },
    {
      key: '7',
      id: 'STOCK_LEDGER',
      title: 'औषध स्टॉक व ट्रॅन्झॅक्शन लेजर (Item Movement Ledger)',
      subtitle: 'प्रत्येक बॅचची खरेदी, विक्री व शिल्लक ऑडिट हिस्ट्री',
      shortcut: 'Alt + T',
      icon: ClipboardList,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    {
      key: '8',
      id: 'FAST_PRODUCT',
      title: 'जलद औषध नोंद (In-Line Fast Item & Batch Entry)',
      subtitle: '५ सेकंदात नवीन औषध व बॅच मास्टर तयार करा',
      shortcut: 'F3 / Ins',
      icon: PlusCircle,
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200'
    },
    {
      key: '9',
      id: 'SHORTAGE_DIARY',
      title: 'तोटा नोंदवही (Daily Shortage Diary & WhatsApp PO)',
      subtitle: 'कमी स्टॉक अलर्ट्स व १-क्लिक व्हॉट्सॲप ऑर्डर',
      shortcut: 'F10',
      icon: BookOpen,
      color: 'text-orange-700 bg-orange-50 border-orange-200'
    },
    {
      key: '0',
      id: 'DAY_END_DRAWER',
      title: 'गल्ला ताळमेळ व क्लोजिंग (Day-End Drawer Settlement)',
      subtitle: 'रोख नोटांची मोजदाद (५००, २००...), प्रत्यक्ष vs अपेक्षित कॅश',
      shortcut: 'Shift + D',
      icon: Clock,
      color: 'text-slate-800 bg-slate-100 border-slate-300'
    }
  ];

  const filteredOptions = voucherOptions.filter((opt) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      opt.title.toLowerCase().includes(q) ||
      opt.subtitle.toLowerCase().includes(q) ||
      opt.key.includes(q) ||
      opt.shortcut.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setSearchFilter('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Direct numeric jump (0 to 9)
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const matched = voucherOptions.find((opt) => opt.key === e.key);
        if (matched) {
          e.preventDefault();
          onSelectAction(matched.id);
          onClose();
          return;
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filteredOptions.length || 1)) % (filteredOptions.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          onSelectAction(filteredOptions[selectedIndex].id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredOptions, onSelectAction, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center font-bold text-emerald-300 text-sm">
              Alt+V
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                वाऊचर प्रकार मेनू (Voucher Types Menu)
                <span className="text-xs font-normal text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  MediVision Gold Parity
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                संख्या की (0 ते 9) किंवा ॲरो की वापरून थेट वाऊचर निवडा (Zero-Mouse)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="शोधा (उदा. विक्री, खरेदी, रिटर्न, लेजर, गल्ला)..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>

        {/* List of Vouchers */}
        <div className="p-2 overflow-y-auto divide-y divide-slate-100 flex-1">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              कोणताही वाऊचर प्रकार जुळला नाही.
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onSelectAction(opt.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Numeric Key Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-base shadow-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {opt.key}
                    </div>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg border ${opt.color}`}>
                      <Icon size={18} />
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {opt.title}
                        {isSelected && (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                            Enter
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{opt.subtitle}</div>
                    </div>
                  </div>

                  {/* Hotkey Badge */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {opt.shortcut}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                0-9
              </kbd>{' '}
              थेट निवडा
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                ↑ / ↓
              </kbd>{' '}
              नेव्हिगेशन
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                Enter
              </kbd>{' '}
              उघडा
            </span>
          </div>
          <div>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                Esc
              </kbd>{' '}
              बंद करा
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
