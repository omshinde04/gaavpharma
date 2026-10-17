import React, { useState, useEffect } from 'react';
import {
  Crown,
  Key,
  Copy,
  CheckCircle2,
  Calendar,
  Phone,
  Store,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Users,
  Lock,
  ArrowRight,
  Send,
  Building2,
  Check,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';

export default function SuperAdminConsole({
  currentUser,
  currentStoreProfile,
  currentLicenseStatus,
  onLogout,
  onEnterStorePos,
  onStoreProvisioned,
  onSwitchUser
}) {
  const [activeTab, setActiveTab] = useState('provision'); // 'provision' | 'generator' | 'renewal' | 'clients'

  // Provisioning Form State - starts completely blank for testing
  const [provisionData, setProvisionData] = useState({
    storeName: '',
    dlNumber: '',
    gstin: '',
    address: '',
    ownerPhone: '',
    upiId: '',
    ownerName: '',
    ownerUsername: '',
    ownerPin: '',
    plan: 'annual',
    days: 365
  });

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Manual Key Generator State
  const [targetStore, setTargetStore] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [targetHwid, setTargetHwid] = useState('ALL');
  const [targetPlan, setTargetPlan] = useState('annual');
  const [targetDays, setTargetDays] = useState(365);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Renewal Code Generator State
  const [renewalStore, setRenewalStore] = useState('');
  const [renewalDays, setRenewalDays] = useState(365);
  const [generatedRenewal, setGeneratedRenewal] = useState('');
  const [copiedRenewal, setCopiedRenewal] = useState(false);

  // Registered Buyers - Starts 100% empty until you provision a store
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('gaavpharma_provisioned_clients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(provisionData.ownerPin)) {
      alert('Owner PIN must be exactly 4 numeric digits (e.g. 1111).');
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await api.provisionStore(provisionData);
      setProvisionResult(res);

      const planName = provisionData.plan === 'trial' ? '14-Day Trial' : (provisionData.plan === 'lifetime' ? 'Lifetime' : '1-Year Pro');
      const newClient = {
        id: Date.now(),
        name: res.storeProfile.store_name,
        owner: res.storeOwner.display_name,
        phone: res.storeProfile.phone,
        plan: planName,
        expires: new Date(Date.now() + (provisionData.days || 365) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'ACTIVE'
      };
      const updatedClients = [newClient, ...clients.filter(c => c.name !== res.storeProfile.store_name)];
      setClients(updatedClients);
      try {
        localStorage.setItem('gaavpharma_provisioned_clients', JSON.stringify(updatedClients));
      } catch (e) {}

      if (onStoreProvisioned) {
        onStoreProvisioned(res.storeProfile, res.licenseStatus);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to provision store: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProvisioning(false);
    }
  };

  const getWhatsAppSlip = () => {
    const p = provisionResult ? provisionResult.storeProfile : provisionData;
    const u = provisionResult ? provisionResult.storeOwner : provisionData;
    const planName = provisionData.plan === 'trial' ? '14-Day Free Trial' : '1-Year Professional';

    return (
      `🏥 *WELCOME TO GAAVPHARMA POS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Your pharmacy store has been successfully activated and provisioned!\n\n` +
      `🏪 *Pharmacy:* ${p.store_name}\n` +
      `👤 *Store Owner:* ${u.display_name || provisionData.ownerName}\n` +
      `🔑 *4-Digit Login PIN:* *${u.pin_code || provisionData.ownerPin}*\n` +
      `👤 *Username:* ${u.username || provisionData.ownerUsername}\n` +
      `📜 *License Plan:* ${planName} (100% Offline Active)\n` +
      `📍 *DL / GSTIN:* ${p.dl_number} / ${p.gstin}\n\n` +
      `🚀 *How to Login:*\n` +
      `1. Open GaavPharma on your counter terminal.\n` +
      `2. Enter your 4-digit PIN *${u.pin_code || provisionData.ownerPin}* on the keypad.\n` +
      `3. Go to "Store Admin" to add your cashiers (Ramesh, etc.) and configure features!\n\n` +
      `📞 *GaavPharma Provider Support:* Om Shinde (+91 98220 12345)`
    );
  };

  const handleCopySlip = () => {
    navigator.clipboard.writeText(getWhatsAppSlip());
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    try {
      const key = await api.generateLicenseKey({
        storeName: targetStore.trim(),
        ownerPhone: targetPhone.trim(),
        hardwareId: targetHwid.trim(),
        plan: targetPlan,
        days: targetPlan === 'trial' ? 14 : targetDays,
        features: {
          loose_tablets: true,
          expiry_radar: true,
          family_khata: true,
          whatsapp_bills: true,
          custom_discounts: true
        }
      });
      setGeneratedKey(key);
    } catch (err) {
      console.error(err);
      alert('Failed to generate key');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateRenewal = async (e) => {
    e.preventDefault();
    try {
      const code = await api.generateRenewalCode({
        storeName: renewalStore.trim(),
        days: renewalDays
      });
      setGeneratedRenewal(code);
    } catch (err) {
      console.error(err);
      alert('Failed to generate renewal code');
    }
  };

  const handleCopyRenewal = () => {
    navigator.clipboard.writeText(generatedRenewal);
    setCopiedRenewal(true);
    setTimeout(() => setCopiedRenewal(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Console Master Header */}
      <header className="bg-slate-900 border-b border-purple-900/40 px-6 py-3 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-indigo-700 border border-purple-400/40 flex items-center justify-center text-white shadow-md">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>GaavPharma Provider Master Hub</span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Vendor Console
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Multi-Tenant Store Provisioning, Client Licensing & SaaS Engine • Founder Om Shinde
            </p>
          </div>
        </div>

        {/* Right Console Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>100% Offline SQLite Core</span>
          </div>

          {/* Enter Store POS Button (Preview) */}
          <button
            onClick={onEnterStorePos}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
            title="Switch into Store POS counter view"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store POS View</span>
          </button>

          {/* User Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-950/60 rounded-lg border border-purple-800/50 text-xs text-purple-200">
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span className="font-semibold">{currentUser?.display_name || 'Om Shinde (Founder)'}</span>
          </div>

          {/* Logout / Handover */}
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-800 text-xs font-semibold transition-all"
            title="Lock terminal to allow buyer/staff to log in with their PIN"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign Out / Lock</span>
          </button>
        </div>
      </header>

      {/* Main Console Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2 font-mono">
              Provider Workspaces
            </div>

            <button
              onClick={() => setActiveTab('provision')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'provision'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Provision & Onboard Store</span>
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Offline Key Generator</span>
            </button>

            <button
              onClick={() => setActiveTab('renewal')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'renewal'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <span>Renewal Code Generator</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Managed Stores Directory</span>
            </button>
          </div>

          {/* Active Store Snapshot Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Terminal Store</div>
            <div className="font-bold text-white truncate">
              {currentStoreProfile?.store_name || 'Om Medical Stores'}
            </div>
            <div className="text-slate-400 text-[10px]">
              Plan: <span className="text-emerald-400">{currentLicenseStatus?.plan?.toUpperCase() || 'ANNUAL'}</span>
            </div>
          </div>
        </aside>

        {/* Center Canvas Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {activeTab === 'provision' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Onboarding Welcome Banner */}
              <div className="p-5 rounded-2xl bg-linear-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-800/40 flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Provision Store & Setup Buyer Login</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                      Step 1 of Setup
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Set up the pharmacy store name, legal DL/GSTIN, generate their 1-Year license key, and create the Store Owner login account with a 4-digit PIN. Once provisioned, you can hand over the terminal or send them their login credentials via WhatsApp!
                  </p>
                </div>
              </div>

              {/* Success Result & Handover Card */}
              {provisionResult && (
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          Store Successfully Provisioned & Activated!
                        </h3>
                        <p className="text-xs text-emerald-400/90 font-mono">
                          Ready for buyer handover. Offline license active for 365 days.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCopySlip}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        {copiedSlip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSlip ? 'Copied WhatsApp Slip!' : 'Copy WhatsApp Slip'}</span>
                      </button>

                      <button
                        onClick={onLogout}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sign Out (Handover Terminal)</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (onSwitchUser && provisionResult.storeOwner) {
                            onSwitchUser(provisionResult.storeOwner);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Test Login as Store Owner</span>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Slip Preview Box */}
                  <div className="p-4 bg-slate-900/90 border border-emerald-900/60 rounded-xl font-mono text-xs text-slate-300 space-y-1.5 whitespace-pre-wrap leading-relaxed">
                    {getWhatsAppSlip()}
                  </div>
                </div>
              )}

              {/* Provisioning Form */}
              <form onSubmit={handleProvisionSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Store Entity Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                      <Store className="w-4 h-4 text-purple-400" />
                      <h3 className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
                        1. Pharmacy / Store Profile
                      </h3>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Store Registered Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={provisionData.storeName}
                        onChange={(e) => setProvisionData({ ...provisionData, storeName: e.target.value })}
                        placeholder="e.g. Om Medical Stores"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Drug License (DL 20B/21B)
                        </label>
                        <input
                          type="text"
                          required
                          value={provisionData.dlNumber}
                          onChange={(e) => setProvisionData({ ...provisionData, dlNumber: e.target.value })}
                          placeholder="20B/21B-MH-SOL-194829"
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          GSTIN Number
                        </label>
                        <input
                          type="text"
                          required
                          value={provisionData.gstin}
                          onChange={(e) => setProvisionData({ ...provisionData, gstin: e.target.value })}
                          placeholder="27AABCA1234F1Z9"
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Shop Address (Printed on Invoices)
                      </label>
                      <input
                        type="text"
                        required
                        value={provisionData.address}
                        onChange={(e) => setProvisionData({ ...provisionData, address: e.target.value })}
                        placeholder="e.g. Near Bus Stand, Main Road"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        UPI ID for QR Code Billing
                      </label>
                      <input
                        type="text"
                        value={provisionData.upiId}
                        onChange={(e) => setProvisionData({ ...provisionData, upiId: e.target.value })}
                        placeholder="e.g. ommedical@oksbi"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Buyer & Store Owner Account Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
                        2. Store Owner / Chemist Account
                      </h3>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Store Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={provisionData.ownerName}
                        onChange={(e) => setProvisionData({ ...provisionData, ownerName: e.target.value })}
                        placeholder="e.g. Om Shinde or Dr. Anand Patil"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Owner WhatsApp Phone
                        </label>
                        <input
                          type="text"
                          required
                          value={provisionData.ownerPhone}
                          onChange={(e) => setProvisionData({ ...provisionData, ownerPhone: e.target.value })}
                          placeholder="9822012345"
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Owner Username
                        </label>
                        <input
                          type="text"
                          required
                          value={provisionData.ownerUsername}
                          onChange={(e) => setProvisionData({ ...provisionData, ownerUsername: e.target.value })}
                          placeholder="e.g. om_admin"
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Store Owner 4-Digit Login PIN *
                      </label>
                      <input
                        type="text"
                        maxLength="4"
                        required
                        value={provisionData.ownerPin}
                        onChange={(e) => setProvisionData({ ...provisionData, ownerPin: e.target.value })}
                        placeholder="e.g. 1111"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm font-bold font-mono text-emerald-400 text-center tracking-widest focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        The buyer will use this 4-digit PIN on the lockscreen to log in and manage staff.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Subscription Plan Tier
                      </label>
                      <select
                        value={provisionData.plan}
                        onChange={(e) => setProvisionData({ ...provisionData, plan: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="annual">1-Year Professional (365 Days) - ₹4,999/yr</option>
                        <option value="lifetime">Lifetime Unlimited Edition</option>
                        <option value="trial">14-Day Free Evaluation Trial</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    Saves to SQLite, signs offline cryptographic license, and creates Store Owner account.
                  </div>

                  <button
                    type="submit"
                    disabled={isProvisioning}
                    className="px-6 py-2.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all transform active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isProvisioning ? 'Provisioning...' : 'Provision & Activate Store Now'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'generator' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <h3 className="font-bold text-sm text-white">Generate Offline License Key (HMAC-SHA256)</h3>
                <p className="text-xs text-slate-400">
                  Generate signed activation keys to send to remote offline computers via WhatsApp or email.
                </p>
              </div>

              <form onSubmit={handleGenerateKey} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacy / Client Name</label>
                  <input
                    type="text"
                    required
                    value={targetStore}
                    onChange={(e) => setTargetStore(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Owner Mobile</label>
                    <input
                      type="text"
                      required
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hardware ID Lock</label>
                    <input
                      type="text"
                      value={targetHwid}
                      onChange={(e) => setTargetHwid(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Generate Activation Key</span>
                  </button>
                </div>
              </form>

              {generatedKey && (
                <div className="p-4 bg-purple-950/40 border border-purple-500/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-purple-300">
                    <span>Generated Cryptographic Key:</span>
                    <button
                      onClick={handleCopyKey}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-400 break-all select-all">
                    {generatedKey}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'renewal' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <h3 className="font-bold text-sm text-white">Generate Renewal Code</h3>
                <p className="text-xs text-slate-400">
                  Generate annual renewal extensions (+365 days) for existing client medical stores.
                </p>
              </div>

              <form onSubmit={handleGenerateRenewal} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacy Name</label>
                  <input
                    type="text"
                    required
                    value={renewalStore}
                    onChange={(e) => setRenewalStore(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Extension Days</label>
                  <input
                    type="number"
                    value={renewalDays}
                    onChange={(e) => setRenewalDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Renewal Code</span>
                  </button>
                </div>
              </form>

              {generatedRenewal && (
                <div className="p-4 bg-blue-950/40 border border-blue-500/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-300">
                    <span>Generated Renewal Code:</span>
                    <button
                      onClick={handleCopyRenewal}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRenewal ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-blue-300 break-all select-all">
                    {generatedRenewal}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-white">Registered Client Stores</h3>
                  <p className="text-xs text-slate-400">Track active pharmacy subscriptions and renewal dates</p>
                </div>
                {clients.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all client store records from directory?')) {
                        setClients([]);
                        localStorage.removeItem('gaavpharma_provisioned_clients');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 rounded text-xs font-mono"
                  >
                    Clear Directory
                  </button>
                )}
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">No Client Stores Provisioned Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You haven't onboarded any pharmacies yet. Go to "Provision & Onboard Store" to add your first buyer store!
                  </p>
                  <button
                    onClick={() => setActiveTab('provision')}
                    className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Provision First Store</span>
                  </button>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-900">
                  {clients.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                      <div>
                        <div className="font-semibold text-white text-xs flex items-center gap-2">
                          <span>{c.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-3">
                          <span>Owner: {c.owner}</span>
                          <span>•</span>
                          <span>Phone: {c.phone}</span>
                          <span>•</span>
                          <span>Plan: {c.plan}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-300 font-medium">Expires: {c.expires}</div>
                        <span className="text-[10px] text-emerald-400 font-medium">Licensed Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
