import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BillingCounter from './components/BillingCounter';
import ExpiryRadar from './components/ExpiryRadar';
import InventoryManager from './components/InventoryManager';
import DailyRegisterKhata from './components/DailyRegisterKhata';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' | 'expiry' | 'inventory' | 'khata'
  const [expiryAlertCount, setExpiryAlertCount] = useState(0);

  useEffect(() => {
    // Check expiry radar alerts on startup
    api.getExpiryRadarData().then((data) => {
      if (data && data.metrics) {
        setExpiryAlertCount(data.metrics.criticalCount + data.metrics.warningCount);
      }
    }).catch(console.error);

    // Global keyboard listener for Module switching (F2, F3, F4, F5)
    const handleGlobalKeys = (e) => {
      if (e.key === 'F2') {
        setActiveTab('billing');
      } else if (e.key === 'F3') {
        setActiveTab('expiry');
      } else if (e.key === 'F4' && !e.target.matches('input, textarea')) {
        setActiveTab('inventory');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('khata');
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans select-none">
      {/* Top Header Bar */}
      <Header />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          expiryAlertCount={expiryAlertCount}
        />

        {/* Center Main Stage Screen */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {activeTab === 'billing' && <BillingCounter />}
          {activeTab === 'expiry' && <ExpiryRadar />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'khata' && <DailyRegisterKhata />}
        </main>
      </div>
    </div>
  );
}
