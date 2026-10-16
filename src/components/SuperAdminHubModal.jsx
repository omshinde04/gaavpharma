import React, { useState } from 'react';
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
  Users
} from 'lucide-react';
import { api } from '../services/api';

export default function SuperAdminHubModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'renewal' | 'clients'

  // Activation Key Generator State
  const [targetStore, setTargetStore] = useState('Mauli Medical Stores');
  const [targetPhone, setTargetPhone] = useState('9422011223');
  const [targetHwid, setTargetHwid] = useState('ALL');
  const [targetPlan, setTargetPlan] = useState('annual');
  const [targetDays, setTargetDays] = useState(365);
  const [features, setFeatures] = useState({
    loose_tablets: true,
    expiry_radar: true,
    family_khata: true,
    whatsapp_bills: true,
    custom_discounts: true
  });
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Renewal Code Generator State
  const [renewalStore, setRenewalStore] = useState('Anand Medical & General Stores');
  const [renewalDays, setRenewalDays] = useState(365);
  const [generatedRenewal, setGeneratedRenewal] = useState('');
  const [copiedRenewal, setCopiedRenewal] = useState(false);

  // Sample Registered Buyers
  const [clients, setClients] = useState([
    { id: 1, name: 'Anand Medical & General Stores', owner: 'Anand Patil', phone: '9822012345', plan: '1-Year Pro', expires: '15 Oct 2027', status: 'ACTIVE' },
    { id: 2, name: 'Mauli Medical Stores', owner: 'Suresh Deshmukh', phone: '9422011223', plan: '1-Year Pro', expires: '10 Nov 2027', status: 'ACTIVE' },
    { id: 3, name: 'Shree Ganesh Chemist', owner: 'Ganesh Kulkarni', phone: '9860044556', plan: '14-Day Trial', expires: '28 Oct 2026', status: 'TRIAL' }
  ]);

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    try {
      const key = await api.generateLicenseKey({
        storeName: targetStore.trim(),
        ownerPhone: targetPhone.trim(),
        hardwareId: targetHwid.trim(),
        plan: targetPlan,
        days: targetPlan === 'trial' ? 14 : targetDays,
        features
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-purple-950 text-white px-5 py-3.5 border-b border-purple-900 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-800/80 border border-purple-500/40 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">GaavPharma Master Licensing Portal</h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-purple-200">Software vendor licensing engine & store subscription issuer</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-300 hover:text-white text-sm font-semibold">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-1 bg-slate-100 border-b border-slate-200 flex text-xs font-medium">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'generator' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-purple-700" />
            <span>Issue Activation Key</span>
          </button>
          <button
            onClick={() => setActiveTab('renewal')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'renewal' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Generate Renewal Code</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'clients' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Buyer Client Directory ({clients.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-xs">
          {activeTab === 'generator' && (
            <div className="space-y-4">
              <div className="text-[11px] text-slate-500">
                Generate an offline cryptographic activation key for a new pharmacy buyer.
              </div>

              <form onSubmit={handleGenerateKey} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Buyer Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={targetStore}
                      onChange={(e) => setTargetStore(e.target.value)}
                      placeholder="e.g. Mauli Medical Stores, Sangola"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Buyer WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="e.g. 9822012345"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Lock to Machine HWID ('ALL' for universal)
                    </label>
                    <input
                      type="text"
                      value={targetHwid}
                      onChange={(e) => setTargetHwid(e.target.value)}
                      placeholder="e.g. GP-4298-D340-0C93 or ALL"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={targetPlan}
                      onChange={(e) => {
                        setTargetPlan(e.target.value);
                        if (e.target.value === 'trial') setTargetDays(14);
                        if (e.target.value === 'annual') setTargetDays(365);
                        if (e.target.value === 'lifetime') setTargetDays(3650);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                    >
                      <option value="annual">1-Year Pro License (₹4,999)</option>
                      <option value="trial">14-Day Free Trial</option>
                      <option value="lifetime">Lifetime Enterprise License</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Validity Period (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetDays}
                      onChange={(e) => setTargetDays(parseInt(e.target.value, 10) || 365)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-700 text-[11px] block">
                    Enabled Features for this License:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.keys(features).map((featKey) => (
                      <label key={featKey} className="flex items-center space-x-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={features[featKey]}
                          onChange={(e) => setFeatures({ ...features, [featKey]: e.target.checked })}
                          className="rounded text-purple-600"
                        />
                        <span className="capitalize">{featKey.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
                >
                  Generate Official Activation Key
                </button>
              </form>

              {/* Generated Key Output Box */}
              {generatedKey && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-purple-900">
                    <span>Generated License Activation Key:</span>
                    <button
                      onClick={handleCopyKey}
                      className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'Copied!' : 'Copy Key for WhatsApp'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows="2"
                    value={generatedKey}
                    className="w-full p-2 bg-white border border-purple-200 rounded text-[10px] font-mono text-purple-950 resize-none select-all"
                  />
                  <div className="text-[10px] text-purple-700">
                    Send this key to the buyer. When entered on their terminal, it activates <b>{targetStore}</b> offline!
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'renewal' && (
            <div className="space-y-4">
              <div className="text-[11px] text-slate-500">
                After the buyer pays their annual renewal fee, generate their offline renewal code.
              </div>

              <form onSubmit={handleGenerateRenewal} className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Store Registered Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={renewalStore}
                    onChange={(e) => setRenewalStore(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Extension Duration
                  </label>
                  <select
                    value={renewalDays}
                    onChange={(e) => setRenewalDays(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                  >
                    <option value={365}>+ 1 Year (365 Days) — Standard Annual Renewal</option>
                    <option value={180}>+ 6 Months (180 Days)</option>
                    <option value={30}>+ 1 Month (30 Days)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
                >
                  Generate Official Renewal Code
                </button>
              </form>

              {generatedRenewal && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-emerald-900">
                    <span>Generated Renewal Code:</span>
                    <button
                      onClick={handleCopyRenewal}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRenewal ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows="2"
                    value={generatedRenewal}
                    className="w-full p-2 bg-white border border-emerald-200 rounded text-[10px] font-mono text-emerald-950 resize-none select-all"
                  />
                  <div className="text-[10px] text-emerald-700">
                    The store owner enters this code in their Store Settings to extend license validity by {renewalDays} days!
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500">
                Track active client subscriptions, store owners, and validity dates.
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {clients.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          {c.plan}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Owner: {c.owner} • Phone: {c.phone} • Valid Until: <b>{c.expires}</b>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setRenewalStore(c.name);
                        setActiveTab('renewal');
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                    >
                      Renew License
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
