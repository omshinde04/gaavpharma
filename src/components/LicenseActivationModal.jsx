import React, { useState } from 'react';
import { Key, ShieldAlert, CheckCircle2, Copy, MessageSquare, Terminal, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function LicenseActivationModal({ licenseStatus, onActivationSuccess, onClose }) {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hwid = licenseStatus?.hardwareId || 'GP-4298-D340-0C93';

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2000);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      let trimmed = inputKey.trim();
      // Auto-prefix if user copied only the payload
      if (!trimmed.startsWith('GP-ACT-') && !trimmed.startsWith('GP-REN-')) {
        if (trimmed.startsWith('eyJ') || trimmed.includes('.webmock') || trimmed.includes('.')) {
          trimmed = 'GP-ACT-' + trimmed;
        } else {
          throw new Error('Incomplete key. Please ensure you copy the entire key from Master Hub.');
        }
      }

      let updatedStatus;
      if (trimmed.startsWith('GP-REN-')) {
        updatedStatus = await api.applyRenewalCode(trimmed);
      } else if (trimmed.startsWith('GP-ACT-')) {
        updatedStatus = await api.activateLicense(trimmed);
      } else {
        throw new Error('Unrecognized key format. Activation keys start with GP-ACT- or GP-REN-');
      }

      const storeName = updatedStatus?.storeName || 'Deviya Medical';
      setSuccessMsg(`✓ License Verified & Activated for "${storeName}"!`);
      setTimeout(() => {
        onActivationSuccess(updatedStatus);
      }, 900);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Activation failed. Please check the license key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTrial = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const trialKey = await api.generateLicenseKey({
        storeName: licenseStatus?.storeName || 'Divya Medical Stores',
        plan: 'trial',
        days: 14,
        hardwareId: hwid
      });
      const updated = await api.activateLicense(trialKey);
      onActivationSuccess(updated);
    } catch (err) {
      setError('Failed to initiate free trial.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-white text-slate-900 p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Key className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">GaavPharma Subscription & License</h3>
              <p className="text-[11px] text-slate-500">Offline Cryptographic Licensing System</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 font-sans text-xs">
          {/* Machine HWID Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                This Machine Hardware Fingerprint (HWID):
              </span>
              <button
                onClick={handleCopyHwid}
                className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>{copiedHwid ? 'Copied!' : 'Copy HWID'}</span>
              </button>
            </div>
            <div className="font-mono text-sm font-bold text-slate-900 tracking-wider">
              {hwid}
            </div>
            <p className="text-[10px] text-slate-400">
              Share this HWID with GaavPharma (+91 98220 12345) to receive your official annual activation key.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleActivate} className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Enter Activation Key or Renewal Code
              </label>
              <textarea
                rows="3"
                required
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Paste your key here (e.g. GP-ACT-... or GP-REN-...)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-emerald-600 resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !inputKey.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
            >
              {isSubmitting ? 'Verifying License...' : 'Activate / Renew Software'}
            </button>
          </form>

          {/* Trial Alternative */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Evaluating GaavPharma?</span>
            <button
              onClick={handleStartTrial}
              disabled={isSubmitting}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Start 14-Day Free Evaluation Trial</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
