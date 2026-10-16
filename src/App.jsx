import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BillingCounter from './components/BillingCounter';
import ExpiryRadar from './components/ExpiryRadar';
import InventoryManager from './components/InventoryManager';
import DailyRegisterKhata from './components/DailyRegisterKhata';
import LoginScreen from './components/LoginScreen';
import StoreSettingsModal from './components/StoreSettingsModal';
import SuperAdminHubModal from './components/SuperAdminHubModal';
import LicenseActivationModal from './components/LicenseActivationModal';
import { api } from './services/api';
import { AlertCircle, Key } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' | 'expiry' | 'inventory' | 'khata'
  const [expiryAlertCount, setExpiryAlertCount] = useState(0);

  // Auth & Multi-tenant State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gaavpharma_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Store Configuration & Licensing
  const [storeProfile, setStoreProfile] = useState(null);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [featureToggles, setFeatureToggles] = useState({
    allow_khata: true,
    allow_loose_tablets: true,
    allow_whatsapp: true,
    enforce_h1_doctor: false,
    max_cashier_discount: 10,
    hide_drawer_from_cashier: false
  });

  // Modals
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [showSuperAdminHub, setShowSuperAdminHub] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Load app data
  const loadAppData = useCallback(async () => {
    try {
      const [profile, license, toggles] = await Promise.all([
        api.getStoreProfile(),
        api.getLicenseStatus(),
        api.getFeatureToggles()
      ]);
      if (profile) setStoreProfile(profile);
      if (license) setLicenseStatus(license);
      if (toggles) setFeatureToggles(toggles);
    } catch (err) {
      console.error('Error loading initial app config:', err);
    }
  }, []);

  useEffect(() => {
    loadAppData();

    // Check expiry radar alerts on startup
    api.getExpiryRadarData().then((data) => {
      if (data && data.metrics) {
        setExpiryAlertCount(data.metrics.criticalCount + data.metrics.warningCount);
      }
    }).catch(console.error);
  }, [loadAppData]);

  // Global Keyboard Shortcuts (F2, F3, F4, F5, Shift+L)
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // Lock Terminal: Shift + L
      if (e.shiftKey && (e.key === 'L' || e.key === 'l') && !e.target.matches('input, textarea')) {
        e.preventDefault();
        handleLogout();
        return;
      }

      // If not logged in, don't allow module switching
      if (!currentUser) return;

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
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('gaavpharma_active_user', JSON.stringify(user));
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('gaavpharma_active_user');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  };

  // If no user is logged in, show the PIN Lockscreen
  if (!currentUser) {
    return (
      <LoginScreen
        storeProfile={storeProfile}
        licenseStatus={licenseStatus}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const isLicenseExpired = licenseStatus && licenseStatus.isValid === false;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans select-none">
      {/* License Expired Warning Bar */}
      {isLicenseExpired && (
        <div className="bg-rose-600 text-white px-4 py-1.5 flex items-center justify-between text-xs font-semibold shrink-0 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>
              Subscription Expired or Inactive License ({licenseStatus?.reason || 'License key required'}). Terminal functionality is restricted.
            </span>
          </div>
          <button
            onClick={() => setShowLicenseModal(true)}
            className="bg-white text-rose-700 hover:bg-rose-50 px-3 py-0.5 rounded font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <Key className="w-3 h-3 text-rose-700" />
            <span>Activate License Now</span>
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <Header
        storeProfile={storeProfile}
        licenseStatus={licenseStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenStoreSettings={() => setShowStoreSettings(true)}
        onOpenSuperAdminHub={() => setShowSuperAdminHub(true)}
        onOpenLicenseModal={() => setShowLicenseModal(true)}
      />

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
          {activeTab === 'billing' && (
            <BillingCounter
              currentUser={currentUser}
              featureToggles={featureToggles}
              storeProfile={storeProfile}
            />
          )}
          {activeTab === 'expiry' && <ExpiryRadar />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'khata' && (
            <DailyRegisterKhata
              currentUser={currentUser}
              featureToggles={featureToggles}
              storeProfile={storeProfile}
            />
          )}
        </main>
      </div>

      {/* Store Admin Configuration Modal */}
      {showStoreSettings && (
        <StoreSettingsModal
          onClose={() => setShowStoreSettings(false)}
          onProfileUpdated={(updated) => setStoreProfile(updated)}
          onTogglesUpdated={(updated) => setFeatureToggles(updated)}
          onOpenLicenseModal={() => {
            setShowStoreSettings(false);
            setShowLicenseModal(true);
          }}
        />
      )}

      {/* Super Admin Hub (Vendor Licensing & Key Generator) */}
      {showSuperAdminHub && (
        <SuperAdminHubModal
          onClose={() => setShowSuperAdminHub(false)}
        />
      )}

      {/* Client License Activation / Renewal Modal */}
      {showLicenseModal && (
        <LicenseActivationModal
          licenseStatus={licenseStatus}
          onActivationSuccess={(updated) => {
            setLicenseStatus(updated);
            setShowLicenseModal(false);
          }}
          onClose={() => setShowLicenseModal(false)}
        />
      )}
    </div>
  );
}
