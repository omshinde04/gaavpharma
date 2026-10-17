import React from 'react';
import { ShoppingCart, AlertTriangle, Boxes, BookOpen, Terminal, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, expiryAlertCount = 0 }) {
  const navItems = [
    {
      id: 'billing',
      label: 'Rapid Billing',
      sublabel: 'POS Counter',
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
      badge: expiryAlertCount > 0 ? `${expiryAlertCount}` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    },
    {
      id: 'inventory',
      label: 'Inventory Master',
      sublabel: 'Medicines & FMCG',
      icon: Boxes,
      shortcut: 'F4',
      badge: null
    },
    {
      id: 'purchases',
      label: 'Wholesale & Inward',
      sublabel: 'Distributors & Bills',
      icon: Truck,
      shortcut: 'F7',
      badge: null
    },
    {
      id: 'khata',
      label: 'Register & Khata',
      sublabel: 'Daily Cash & Ledger',
      icon: BookOpen,
      shortcut: 'F5',
      badge: null
    },
    {
      id: 'compliance',
      label: 'Compliance & GST',
      sublabel: 'FDA H1 & 3,18,40 Tax',
      icon: ShieldCheck,
      shortcut: 'F8',
      badge: 'FDA',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    }
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      {/* Top Module List */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          Counter Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-1.5 rounded-md ${
                    isActive ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {item.sublabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-emerald-200 text-emerald-900' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
                <kbd
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isActive
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
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
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 space-y-2">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-800 font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-xs text-emerald-700">
              <Terminal className="w-3.5 h-3.5" /> Hardware Scanner
            </span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-mono text-slate-600 font-bold">
              v1.0.0
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            USB Scanner listener active. Press <span className="text-slate-800 font-bold font-mono">F2</span> for new bill.
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
          <span>gaavpharma desktop</span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Online
          </span>
        </div>
      </div>
    </aside>
  );
}
