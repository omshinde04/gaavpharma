import React from 'react';
import { ShoppingCart, AlertTriangle, Boxes, BookOpen, Sparkles, Layers } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, expiryAlertCount = 0 }) {
  const navItems = [
    {
      id: 'billing',
      label: 'Rapid Billing',
      sublabel: 'Counter POS',
      icon: ShoppingCart,
      shortcut: 'F2',
      badge: null
    },
    {
      id: 'expiry',
      label: 'Expiry Loss Radar',
      sublabel: 'Loss Prevention',
      icon: AlertTriangle,
      shortcut: 'F3',
      badge: expiryAlertCount > 0 ? `${expiryAlertCount} Alerts` : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      id: 'inventory',
      label: 'Inventory Manager',
      sublabel: 'Meds & FMCG',
      icon: Boxes,
      shortcut: 'F4',
      badge: null
    },
    {
      id: 'khata',
      label: 'Register & Khata',
      sublabel: 'Daily Cash & Udhaar',
      icon: BookOpen,
      shortcut: 'F5',
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Top Module List */}
      <div className="p-3 space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Counter Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-950/40 border border-emerald-600/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-md ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{item.label}</div>
                  <div className={`text-[11px] ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {item.sublabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                <kbd
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    isActive
                      ? 'bg-emerald-900/60 border-emerald-600/50 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {item.shortcut}
                </kbd>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Store Support & App Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-2.5">
        <div className="bg-slate-850/80 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" /> High-Speed POS
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            USB Barcode Scanner & F-Keys active. Press <span className="text-slate-200 font-mono">F2</span> anytime to bill.
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <span>gaavpharma desktop</span>
          <span className="text-emerald-500 font-semibold">● Ready</span>
        </div>
      </div>
    </aside>
  );
}
