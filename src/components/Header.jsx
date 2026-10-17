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
  Key
} from 'lucide-react';

export default function Header({
  storeProfile,
  licenseStatus,
  currentUser,
  onLogout,
  onOpenStoreSettings,
  onOpenSuperAdminHub,
  onOpenLicenseModal
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isStoreAdmin = currentUser?.role === 'store_admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between shadow-sm select-none shrink-0">
      {/* Store Identity & Credentials */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600/90 border border-emerald-500/30 flex items-center justify-center text-white shadow-2xs">
          <Activity className="w-4 h-4 text-emerald-100" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xs font-semibold tracking-tight text-white leading-tight">
              {storeProfile?.store_name || 'om Medical Stores'}
            </h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-medium px-1.5 py-0.2 rounded-full tracking-wide">
              Retail POS
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
            <span>DL: {storeProfile?.dl_number || '20B/21B-MH-SOL-194829'}</span>
            <span className="text-slate-600">•</span>
            <span>GSTIN: {storeProfile?.gstin || '27AABCA1234F1Z9'}</span>
          </div>
        </div>
      </div>

      {/* Center Live Offline Engine & License Pill */}
      <div className="hidden lg:flex items-center space-x-2.5">
        <div className="flex items-center space-x-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>100% Offline SQLite</span>
        </div>

        {/* License Pill */}
        <button
          onClick={onOpenLicenseModal}
          className="flex items-center space-x-1.5 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50 text-[10px] text-slate-300 font-medium transition-colors"
          title="Click to view subscription details"
        >
          <Key className="w-3 h-3 text-amber-400" />
          <span>
            {licenseStatus?.plan?.toUpperCase()} • {licenseStatus?.daysRemaining}d left
          </span>
        </button>
      </div>

      {/* Right Controls: User Session, Admin Shortcuts, Time */}
      <div className="flex items-center space-x-2.5">
        {/* Super Admin Hub Button */}
        {isSuperAdmin && (
          <button
            onClick={onOpenSuperAdminHub}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-medium shadow-2xs transition-colors"
            title="Super Admin Portal (Issue licenses to medical stores)"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-semibold">Master Hub</span>
          </button>
        )}

        {/* Store Admin Settings Button */}
        {isStoreAdmin && (
          <button
            onClick={onOpenStoreSettings}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium shadow-2xs transition-colors"
            title="Store Administration & Feature Toggles"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Store Admin</span>
          </button>
        )}

        {/* Current Active User Pill */}
        <div className="flex items-center space-x-1.5 pl-2.5 pr-2 py-0.5 bg-slate-800/50 rounded-md border border-slate-700/40 text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-medium truncate max-w-[120px]">
            {currentUser?.display_name || 'Staff User'}
          </span>
        </div>

        {/* Lock Terminal / Switch User */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/60 transition-colors"
          title="Lock Terminal / Switch Counter Shift (Shift+L)"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>

        {/* Clock */}
        <div className="text-right hidden sm:block border-l border-slate-800 pl-2.5">
          <div className="text-[11px] font-semibold font-mono text-emerald-400 tracking-wider">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
        </div>
      </div>
    </header>
  );
}
