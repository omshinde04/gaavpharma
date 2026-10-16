import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Clock, MapPin, Activity, User } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-5 py-2.5 flex items-center justify-between shadow-sm select-none shrink-0">
      {/* Store Identity & Credentials */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-emerald-600/90 border border-emerald-500/30 flex items-center justify-center text-white shadow-sm">
          <Activity className="w-5 h-5 text-emerald-100" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-semibold tracking-tight text-white leading-tight">
              Anand Medical & General Stores
            </h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide">
              Retail POS
            </span>
          </div>
          <div className="flex items-center space-x-2.5 text-[11px] text-slate-400 font-mono mt-0.5">
            <span>DL: 20B/21B-MH-SOL-194829</span>
            <span className="text-slate-600">•</span>
            <span>GSTIN: 27AABCA1234F1Z9</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 flex items-center font-sans">
              <MapPin className="w-3 h-3 mr-0.5 text-slate-500" /> Main Road
            </span>
          </div>
        </div>
      </div>

      {/* Center Live Offline Engine Status */}
      <div className="hidden md:flex items-center space-x-3 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px]">100% Offline Engine</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[11px]">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span>Local SQLite (WAL)</span>
        </div>
      </div>

      {/* Clock and Active Counter Session */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 pl-3 pr-2 py-1 bg-slate-800/40 rounded-md border border-slate-700/40 text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-medium">Counter 01</span>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold font-mono text-emerald-400 tracking-wider">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="text-[10px] text-slate-400">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </header>
  );
}
