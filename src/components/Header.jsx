import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Clock, MapPin, Store } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-5 py-2.5 flex items-center justify-between shadow-sm select-none">
      {/* Store Identity */}
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-extrabold text-white text-xl shadow-inner border border-emerald-400">
          <Store className="w-6 h-6 text-emerald-100" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              Anand Medical & General Stores
            </h1>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Retail POS
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono mt-0.5">
            <span>DL: 20B/21B-MH-SOL-194829</span>
            <span>•</span>
            <span>GSTIN: 27AABCA1234F1Z9</span>
            <span>•</span>
            <span className="text-slate-300 flex items-center">
              <MapPin className="w-3 h-3 mr-0.5 text-emerald-400" /> Near Bus Stand, Main Road
            </span>
          </div>
        </div>
      </div>

      {/* Center Live Offline & SQLite Status */}
      <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>100% Offline Mode</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center space-x-1.5 text-slate-300 font-mono">
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local SQLite (Fast WAL)</span>
        </div>
      </div>

      {/* Clock and Counter Status */}
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-emerald-400 tracking-wider">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </header>
  );
}
