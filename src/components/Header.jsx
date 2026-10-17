import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Clock,
  MapPin,
  Activity,
  User,
  Lock,
  Sliders,
  Crown,
  Key,
  Keyboard
} from 'lucide-react';

export default function Header({
  storeProfile,
  licenseStatus,
  currentUser,
  onLogout,
  onOpenStoreSettings,
  onOpenSuperAdminHub,
  onOpenLicenseModal,
  onOpenShortcutsGuide
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isStoreAdmin = currentUser?.role === 'store_admin';

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 px-4 py-2 flex items-center justify-between shadow-2xs select-none shrink-0">
      {/* Store Identity & Credentials */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xs font-bold tracking-tight text-slate-900 leading-tight">
              {storeProfile?.store_name || 'GaavPharma Retail POS'}
            </h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full tracking-wide">
              Retail POS
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5 font-medium">
            <span>DL: {storeProfile?.dl_number || 'Pending DL'}</span>
            <span className="text-slate-300">•</span>
            <span>GSTIN: {storeProfile?.gstin || 'Pending GSTIN'}</span>
          </div>
        </div>
      </div>

      {/* Center Live Offline Engine & License Pill */}
      <div className="hidden lg:flex items-center space-x-2.5">
        <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-[10px] text-emerald-800 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>100% Offline SQLite</span>
        </div>

        {/* License Pill */}
        <button
          onClick={onOpenLicenseModal}
          className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-[10px] text-slate-700 font-semibold transition-colors"
          title="Click to view subscription details"
        >
          <Key className="w-3 h-3 text-amber-600" />
          <span>
            {licenseStatus?.plan?.toUpperCase()} • {licenseStatus?.daysRemaining}d left
          </span>
        </button>
      </div>

      {/* Right Controls: User Session, Admin Shortcuts, Time */}
      <div className="flex items-center space-x-2">
        {/* Super Admin Hub Button */}
        {isSuperAdmin && (
          <button
            onClick={onOpenSuperAdminHub}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold shadow-2xs transition-colors"
            title="Super Admin Portal (Issue licenses to medical stores)"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px]">Master Hub</span>
          </button>
        )}

        {/* Store Admin Settings Button */}
        {isStoreAdmin && (
          <button
            onClick={onOpenStoreSettings}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs transition-colors"
            title="Store Administration & Feature Toggles"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px]">Store Admin</span>
          </button>
        )}

        {/* Keyboard Shortcuts Guide Button */}
        <button
          onClick={onOpenShortcutsGuide}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs transition-colors"
          title="कीबोर्ड शॉर्टकट कीज मार्गदर्शक (F1)"
        >
          <Keyboard className="w-3.5 h-3.5 text-emerald-700" />
          <span className="text-[11px] font-mono font-bold">F1 Keys</span>
        </button>

        {/* Current Active User Pill */}
        <div className="flex items-center space-x-1.5 pl-2.5 pr-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs text-slate-700">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold truncate max-w-[120px]">
            {currentUser?.display_name || 'Staff User'}
          </span>
        </div>

        {/* Lock Terminal / Switch User */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-md bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition-colors"
          title="Lock Terminal / Switch Counter Shift (Shift+L)"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>

        {/* Clock */}
        <div className="text-right hidden sm:block border-l border-slate-200 pl-2.5">
          <div className="text-[11px] font-bold font-mono text-emerald-800 tracking-wider">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
        </div>
      </div>
    </header>
  );
}
