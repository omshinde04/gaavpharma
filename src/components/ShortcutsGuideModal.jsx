import React, { useEffect } from 'react';
import {
  Keyboard,
  X,
  Zap,
  Navigation,
  Shield,
  ShoppingCart,
  FileText,
  Clock,
  Printer,
  Search,
  Lock,
  ArrowUpDown
} from 'lucide-react';

export default function ShortcutsGuideModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const billingShortcuts = [
    { key: 'Alt+1..0', alt: '1-10 Slots', label: '१० ग्राहक बिल स्लॉट (10 Multi-Bill Slots)', desc: '१० स्वतंत्र ग्राहकांची बिले एकाच वेळी सुरू ठेवा व १ सेकंदात स्विच करा' },
    { key: 'F2', alt: 'Ctrl+N', label: 'नवीन बिल (New Bill)', desc: 'काऊंटर रिकामे करून नवीन ग्राहकाचे बिल सुरू करा' },
    { key: 'F3', alt: 'Cycle Slot', label: 'पुढील स्लॉट (Next Customer Slot)', desc: 'पुढच्या ग्राहकाच्या चालू बिलावर सायकल करा' },
    { key: 'F4', alt: 'Ctrl+F / /', label: 'औषध शोध (Search Medicine)', desc: 'औषध शोधणे व बारकोड स्कॅनिंग इनपुटवर त्वरित फोकस करा' },
    { key: '↑ / ↓', alt: 'Arrow Keys', label: 'यादी नेव्हिगेशन (Navigate List)', desc: 'माऊस न वापरता औषध शोध ड्रॉपडाउनमधून औषध निवडा' },
    { key: 'Enter', alt: 'Available Stock', label: 'बॅच पॉप-अप व निवड (Available Stock)', desc: 'FEFO नुसार योग्य बॅच निवडून त्वरित बिलात जोडा' },
    { key: 'F8', alt: 'Alt+P', label: 'पेमेंट मोड बदला (Cycle Payment)', desc: 'रोख (Cash) ➔ UPI ➔ खाते (Khata) ➔ कार्ड मध्ये टॉगल करा' },
    { key: 'F9', alt: 'Ctrl+Enter', label: 'विक्री पूर्ण व प्रिंट (Complete Sale)', desc: 'बिल पूर्ण करून थर्मल पावती त्वरित प्रिंट करा' },
    { key: 'Alt+H', alt: 'FDA Rx', label: 'रुग्ण / डॉक्टर माहिती (Patient/Doctor)', desc: 'Schedule H1 साठी डॉक्टर व रुग्णाच्या नावावर फोकस करा' },
  ];

  const accountingShortcuts = [
    { key: 'F5', label: 'पेमेंट व्हाउचर (Payment Voucher)', desc: 'दुकान खर्च (लाईट, चहा, पगार) किंवा डिस्ट्रीब्यूटरचे देणे चुकता करा' },
    { key: 'F6', label: 'पावती व्हाउचर (Receipt Voucher)', desc: 'खाते ग्राहकाकडून किंवा इतर मार्गाने रोख रक्कम जमा करा' },
    { key: 'F4', label: 'कॉन्ट्रा व्हाउचर (Contra Transfer)', desc: 'काऊंटर गल्ला ते बँक खात्यात रक्कम जमा / काढण्याची नोंद' },
    { key: 'F7', label: 'जर्नल व्हाउचर (Journal Entry)', desc: 'लेजर ॲडजस्टमेंट व खाती ताळमेळ नोंद' },
    { key: 'F8 / Alt+C', label: 'डिफाईन क्रायटेरिया (Define Criterion)', desc: 'दिनांक, पेमेंट मोड व पार्टीनुसार रिपोर्ट फिल्टर व CSV एक्सपोर्ट' },
  ];

  const navigationShortcuts = [
    { key: 'F2 / Ctrl+1', label: 'काऊंटर बिलिंग (POS Counter)', desc: 'थेट रिटेल काऊंटर बिलिंगवर जा' },
    { key: 'F3 / Ctrl+2', label: 'एक्स्पायरी रडार (Expiry Radar)', desc: 'मुदत संपणारी औषधे व तोटा विश्लेषक' },
    { key: 'Ctrl+3', label: 'औषध साठा (Inventory Stock)', desc: 'सर्व औषधे, रॅक लोकेशन व बॅच व्यवस्थापन' },
    { key: 'F5 / Ctrl+4', label: 'दैनिक खतावणी व व्हाउचर (Accounts & Vouchers)', desc: 'दैनिक विक्री, कॅशबुक व्हाउचर व ग्राहक उधारी खाते' },
    { key: 'F7 / Ctrl+5', label: 'घाऊक खरेदी (Purchases Inward)', desc: 'पुरवठादार बिले आवक, जुने दर तुलना व पेंडिंग लेजर' },
    { key: 'F10 / Ctrl+6', label: 'तोटा नोंदवही (Shortage Diary)', desc: 'कमी साठा औषधे व व्हॉट्सॲप खरेदी ऑर्डर' },
    { key: 'F11 / Ctrl+7', label: 'FDA H1 व GST कर हब (Compliance)', desc: 'नियम ६५ रजिस्टर व GSTR-3B टॅक्स हब' },
  ];

  const systemShortcuts = [
    { key: 'F1 / ?', label: 'शॉर्टकट गाईड (Shortcuts Guide)', desc: 'हे कीबोर्ड शॉर्टकट मार्गदर्शक उघडा' },
    { key: 'Shift + L', label: 'सुरक्षित बॅकअप व लॉक (Daily Exit Backup)', desc: 'दुकान बंद करताना पीसी व पेनड्राइव्हवर बॅकअप घेऊन बाहेर पडा' },
    { key: 'Esc', label: 'विंडो बंद करा (Close Modal)', desc: 'उघडलेला कोणताही डायलॉग किंवा शोध बॉक्स बंद करा' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Top Header Glow */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  कीबोर्ड शॉर्टकट कीज मार्गदर्शक (Keyboard Shortcuts)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-mono">
                  HOTKEYS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                माऊस न वापरता संपूर्ण काऊंटर बिलिंग व नेव्हिगेशन वीजवेगाने हाताळा (MediVision पेक्षा जलद)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Section 1: Billing Counter */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <Zap className="w-4 h-4" />
              <span>१. काऊंटर बिलिंग जलद शॉर्टकट्स (Billing Counter Hotkeys)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {billingShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-emerald-300 font-mono font-bold text-xs shadow-xs">
                      {item.key}
                    </kbd>
                    {item.alt && (
                      <span className="text-[9px] text-slate-500 font-mono">{item.alt}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: MediVision Accounting Vouchers */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-blue-400 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="w-4 h-4" />
              <span>२. कॅशबुक, लेजर व व्हाउचर नोंद (MediVision Accounting Vouchers)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {accountingShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 hover:border-blue-500/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-blue-300 font-mono font-bold text-xs shadow-xs shrink-0">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Navigation */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <Navigation className="w-4 h-4" />
              <span>३. स्क्रीन व मॉड्यूल नेव्हिगेशन (Module Navigation)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {navigationShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-indigo-300 font-mono font-bold text-xs shadow-xs shrink-0">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Safety & System */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-teal-400 font-bold uppercase tracking-wider text-[11px]">
              <Shield className="w-4 h-4" />
              <span>४. डेटा सुरक्षा व सिस्टम (Safety & System)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {systemShortcuts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 hover:border-teal-500/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-teal-300 font-mono font-bold text-xs shadow-xs shrink-0">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>टीप: कोणत्याही स्क्रीनवर <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">F1</kbd> दाबून हे मार्गदर्शक पुन्हा उघडू शकता.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            समजले (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
