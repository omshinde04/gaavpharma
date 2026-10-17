import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BillingCounter from './components/BillingCounter';
import ExpiryRadar from './components/ExpiryRadar';
import InventoryManager from './components/InventoryManager';
import DailyRegisterKhata from './components/DailyRegisterKhata';
import PurchaseDistributorManager from './components/PurchaseDistributorManager';
import ComplianceGstHub from './components/ComplianceGstHub';
import LoginScreen from './components/LoginScreen';
import StoreSettingsModal from './components/StoreSettingsModal';
import SuperAdminHubModal from './components/SuperAdminHubModal';
import SuperAdminConsole from './components/SuperAdminConsole';
import LicenseActivationModal from './components/LicenseActivationModal';
import BackupExitModal from './components/BackupExitModal';
import { api } from './services/api';
import { AlertCircle, Key } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' | 'expiry' | 'inventory' | 'purchases' | 'khata' | 'compliance'
  const [expiryAlertCount, setExpiryAlertCount] = useState(0);
  const [superAdminView, setSuperAdminView] = useState('console'); // 'console' | 'pos'

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
  const [storeProfile, setStoreProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('gaavpharma_store_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.store_name) return parsed;
      }
    } catch {}
    return null;
  });
  const [licenseStatus, setLicenseStatus] = useState(() => {
    try {
      const raw = localStorage.getItem('gaavpharma_license');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [featureToggles, setFeatureToggles] = useState(() => {
    try {
      const raw = localStorage.getItem('gaavpharma_feature_toggles');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            allow_khata: true,
            allow_loose_tablets: true,
            allow_whatsapp: true,
            enforce_h1_doctor: false,
            max_cashier_discount: 10,
            hide_drawer_from_cashier: false,
            ...parsed
          };
        }
      }
    } catch {}
    return {
      allow_khata: true,
      allow_loose_tablets: true,
      allow_whatsapp: true,
      enforce_h1_doctor: false,
      max_cashier_discount: 10,
      hide_drawer_from_cashier: false
    };
  });

  // Modals
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [showSuperAdminHub, setShowSuperAdminHub] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showBackupExitModal, setShowBackupExitModal] = useState(false);

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
        setShowBackupExitModal(true);
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
      } else if (e.key === 'F7' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setActiveTab('purchases');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('khata');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setActiveTab('compliance');
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentUser]);

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    if (user.role === 'super_admin') {
      setSuperAdminView('console');
    }
    try {
      localStorage.setItem('gaavpharma_active_user', JSON.stringify(user));
      const [toggles, profile, license] = await Promise.all([
        api.getFeatureToggles(),
        api.getStoreProfile(),
        api.getLicenseStatus()
      ]);
      if (toggles) setFeatureToggles(toggles);
      if (profile) setStoreProfile(profile);
      if (license) setLicenseStatus(license);
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSuperAdminView('console');
    try {
      localStorage.removeItem('gaavpharma_active_user');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
    setShowBackupExitModal(false);
  };

  const handleRequestLogout = () => {
    setShowBackupExitModal(true);
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

  // If Super Admin is logged in and in console mode, show the dedicated Provider Hub
  if (currentUser?.role === 'super_admin' && superAdminView === 'console') {
    return (
      <SuperAdminConsole
        currentUser={currentUser}
        currentStoreProfile={storeProfile}
        currentLicenseStatus={licenseStatus}
        onLogout={handleLogout}
        onEnterStorePos={() => setSuperAdminView('pos')}
        onStoreProvisioned={(updatedProfile, updatedLicense) => {
          setStoreProfile(updatedProfile);
          setLicenseStatus(updatedLicense);
        }}
        onSwitchUser={(newUser) => {
          handleLoginSuccess(newUser);
        }}
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
        onLogout={handleRequestLogout}
        onOpenStoreSettings={() => setShowStoreSettings(true)}
        onOpenSuperAdminHub={() => setSuperAdminView('console')}
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
          {activeTab === 'expiry' && <ExpiryRadar storeProfile={storeProfile} />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'purchases' && (
            <PurchaseDistributorManager
              currentUser={currentUser}
              featureToggles={featureToggles}
              storeProfile={storeProfile}
            />
          )}
          {activeTab === 'khata' && (
            <DailyRegisterKhata
              currentUser={currentUser}
              featureToggles={featureToggles}
              storeProfile={storeProfile}
            />
          )}
          {activeTab === 'compliance' && (
            <ComplianceGstHub
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
          onTogglesUpdated={(updated) => {
            setFeatureToggles(updated);
            try {
              localStorage.setItem('gaavpharma_feature_toggles', JSON.stringify(updated));
            } catch {}
          }}
          onUserUpdated={(updatedUser) => {
            if (currentUser && currentUser.id === updatedUser.id) {
              const merged = { ...currentUser, ...updatedUser };
              setCurrentUser(merged);
              localStorage.setItem('gaavpharma_active_user', JSON.stringify(merged));
            }
          }}
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
          onActivationSuccess={async (updated) => {
            setLicenseStatus(updated);
            try {
              const freshProfile = await api.getStoreProfile();
              if (freshProfile) setStoreProfile(freshProfile);
            } catch (err) {
              console.error(err);
            }
            setShowLicenseModal(false);
          }}
          onClose={() => setShowLicenseModal(false)}
        />
      )}

      {/* Daily Shop Exit / Logout Backup Modal */}
      <BackupExitModal
        isOpen={showBackupExitModal}
        onClose={() => setShowBackupExitModal(false)}
        onConfirmLogout={handleLogout}
        storeProfile={storeProfile}
      />
    </div>
  );
}
