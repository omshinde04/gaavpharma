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
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Top Module List */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                  ? 'bg-emerald-950/80 text-white border border-emerald-800/60 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-1.5 rounded-md ${
                    isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-emerald-300/80' : 'text-slate-400'}`}>
                    {item.sublabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                <kbd
                  className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                    isActive
                      ? 'bg-emerald-900/60 border-emerald-700/60 text-emerald-200'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
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
      <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-xs text-slate-400 space-y-2">
        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Terminal className="w-3.5 h-3.5" /> Hardware Scanner
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-400">
              v1.0.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            USB Scanner listener active. Press <span className="text-slate-200 font-mono">F2</span> to reset bill.
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
          <span>gaavpharma desktop</span>
          <span className="text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
          </span>
        </div>
      </div>
    </aside>
  );
}
