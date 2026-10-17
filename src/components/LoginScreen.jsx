import React, { useState, useEffect } from 'react';
import { Lock, User, Key, ShieldCheck, Activity, Terminal, ArrowRight, Delete, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function LoginScreen({ onLoginSuccess, storeProfile, licenseStatus }) {
  const [authMode, setAuthMode] = useState('pin'); // 'pin' | 'password'
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard listener for PIN entry
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (authMode !== 'pin') return;
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && pin.length === 4) {
        handlePinSubmit(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pin]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit(pin);
    }
  }, [pin]);

  const handlePinSubmit = async (pinCode) => {
    setError('');
    setIsLoading(true);
    try {
      const user = await api.loginWithPin(pinCode);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid 4-digit PIN code. Please try again.');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setError('Login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await api.loginWithCredentials(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const appendPinDigit = (digit) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800 space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 border border-emerald-400/40 shadow-sm mb-1">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-white">
            {storeProfile?.store_name || 'om Medical Stores'}
          </h2>
          <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>DL: {storeProfile?.dl_number || '20B/21B-MH-SOL-194829'}</span>
            <span>•</span>
            <span>GSTIN: {storeProfile?.gstin || '27AABCA1234F1Z9'}</span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="p-1 bg-slate-100 border-b border-slate-200 flex text-xs font-semibold">
          <button
            onClick={() => {
              setAuthMode('pin');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'pin' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Counter Fast PIN (4 Digits)
          </button>
          <button
            onClick={() => {
              setAuthMode('password');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'password' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin Master Password
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'pin' ? (
            /* PIN Numpad Interface */
            <div className="space-y-5">
              {/* PIN Dots Display */}
              <div className="flex justify-center items-center space-x-3.5 py-2">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        isFilled
                          ? 'bg-emerald-600 border-emerald-600 scale-110 shadow-xs'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                  );
                })}
              </div>

              {/* 3x4 Numpad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto font-mono">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => appendPinDigit(num.toString())}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-lg font-bold text-slate-800 border border-slate-200/80 shadow-2xs transition-all active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPin('')}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-sans font-semibold text-slate-600 transition-all active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={() => appendPinDigit('0')}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-lg font-bold text-slate-800 border border-slate-200/80 shadow-2xs transition-all active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Demo Login Chips */}
              <div className="pt-3 border-t border-slate-100 text-center space-y-1.5 font-sans">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Quick Login Demo PINs:
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <button
                    onClick={() => setPin('1234')}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium border border-slate-200"
                  >
                    Cashier (1234)
                  </button>
                  <button
                    onClick={() => setPin('1111')}
                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-medium border border-emerald-200"
                  >
                    Store Owner (1111)
                  </button>
                  <button
                    onClick={() => setPin('9999')}
                    className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-medium border border-purple-200"
                  >
                    Super Admin (9999)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Username / Password Form */
            <form onSubmit={handleCredentialsSubmit} className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Username
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="superadmin or anand_admin"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Master Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors mt-2"
              >
                {isLoading ? 'Verifying...' : 'Sign In as Administrator'}
              </button>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                Store Owner: <code>Divya_kale / owner123</code> (or PIN: <code>1111</code>) • Super Admin: <code>superadmin / admin123</code> (PIN: <code>9999</code>)
              </div>
            </form>
          )}
        </div>

        {/* Footer Hardware & License Info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-slate-400" />
            {licenseStatus?.hardwareId || 'GP-OFFLINE-001'}
          </span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {licenseStatus?.plan?.toUpperCase() || 'PRO'} License Active
          </span>
        </div>
      </div>
    </div>
  );
}
