import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  HardDrive,
  Usb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
  X,
  Loader2,
  FolderCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function BackupExitModal({ isOpen, onClose, onConfirmLogout, storeProfile }) {
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [drives, setDrives] = useState({
    pc: { available: true, path: '', label: 'स्थानिक संगणक हार्ड ड्राइव्ह' },
    usb: { available: false, path: '', label: 'यूएसबी पेनड्राइव्ह' }
  });
  const [selectedDestinations, setSelectedDestinations] = useState({
    pc: true,
    usb: false
  });
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgressStep, setBackupProgressStep] = useState('');
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [backupResults, setBackupResults] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDriveStatus();
    }
  }, [isOpen]);

  const loadDriveStatus = async () => {
    setLoadingDrives(true);
    try {
      const [driveInfo, lastTs] = await Promise.all([
        api.getAvailableBackupDrives(),
        api.getLastBackupTimestamp()
      ]);

      if (driveInfo) {
        setDrives(driveInfo);
        setSelectedDestinations({
          pc: driveInfo.pc?.available ?? true,
          usb: driveInfo.usb?.available ?? false
        });
      }
      setLastBackupTime(lastTs);
    } catch (err) {
      console.warn('Drive scan warning:', err);
    } finally {
      setLoadingDrives(false);
    }
  };

  if (!isOpen) return null;

  const handleBackupAndExit = async () => {
    setIsBackingUp(true);
    setBackupProgressStep('१/३: डेटाबेस ट्रान्झॅक्शन लॉक व चेकपॉईंट (WAL Checkpoint)...');

    try {
      const destinations = [];
      if (selectedDestinations.pc) destinations.push('pc');
      if (selectedDestinations.usb && drives.usb?.available) destinations.push('usb');

      await new Promise(r => setTimeout(r, 400));
      setBackupProgressStep('२/३: संगणक व पेनड्राइव्हवर सुरक्षित डेटा कॉपी होत आहे...');

      const result = await api.createDatabaseBackup({
        destinations: destinations.length > 0 ? destinations : ['pc'],
        backupType: 'exit'
      });

      await new Promise(r => setTimeout(r, 400));
      setBackupProgressStep('३/३: डेटा सुरक्षित सेव्ह झाला! सॉफ्टवेअर सुरक्षित बंद होत आहे...');
      setBackupSuccess(true);
      setBackupResults(result);

      setTimeout(() => {
        onConfirmLogout();
      }, 900);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('बॅकअप घेताना त्रुटी आली: ' + err.message);
      setIsBackingUp(false);
      setBackupProgressStep('');
    }
  };

  const handleSkipAndExit = () => {
    if (window.confirm('तुम्ही बॅकअप न घेता बाहेर पडत आहात. डेटा सुरक्षिततेसाठी दररोज दुकान बंद करताना बॅकअप घेणे अत्यंत आवश्यक आहे. तरीही बाहेर पडायचे आहे का?')) {
      onConfirmLogout();
    }
  };

  const formatLastBackup = (ts) => {
    if (!ts) return 'अद्याप बॅकअप घेतलेला नाही (No recent backup)';
    try {
      const d = new Date(ts);
      return d.toLocaleString('mr-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden text-slate-100">
        
        {/* Top Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  दुकान बंद करताना सुरक्षित बॅकअप
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
                  १००% सुरक्षित
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {storeProfile?.store_name || 'Divya Medical Stores'} — दररोज दुकान बंद करताना १-क्लिक बॅकअप
              </p>
            </div>
          </div>
          {!isBackingUp && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Last Backup Notice */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>मागील बॅकअप वेळ:</span>
              <strong className="text-white font-medium">{formatLastBackup(lastBackupTime)}</strong>
            </div>
            <button
              onClick={loadDriveStatus}
              disabled={loadingDrives}
              className="flex items-center space-x-1 text-slate-400 hover:text-teal-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDrives ? 'animate-spin' : ''}`} />
              <span>ड्राइव्ह तपासा</span>
            </button>
          </div>

          <p className="text-xs text-slate-300">
            खालील दोन्ही ठिकाणी आजचा संपूर्ण औषध साठा, विक्री बिल, उधारी खाते व जीएसटी डेटा सुरक्षित सेव्ह केला जाईल:
          </p>

          {/* Dual Drives Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* 1. PC Local Hard Drive */}
            <label className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
              selectedDestinations.pc
                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-900/30'
                : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg ${selectedDestinations.pc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">स्थानिक संगणक</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {drives.pc?.path?.startsWith('D:') ? 'D: Drive (सुरक्षित)' : 'Documents Folder'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedDestinations.pc}
                  onChange={(e) => setSelectedDestinations({ ...selectedDestinations, pc: e.target.checked })}
                  disabled={isBackingUp}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-600 bg-slate-700"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                हार्ड डिस्कवरील बॅकअप फोल्डरमध्ये सुरक्षित .db फाईल जतन होते (३० दिवसांचे ऑटो-रोटेशन).
              </p>
            </label>

            {/* 2. Removable USB Pendrive */}
            <label className={`relative flex flex-col p-4 rounded-xl border transition-all ${
              !drives.usb?.available
                ? 'bg-slate-800/20 border-slate-800 opacity-80 cursor-not-allowed'
                : selectedDestinations.usb
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-900/30 cursor-pointer'
                  : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 cursor-pointer'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg ${
                    !drives.usb?.available
                      ? 'bg-amber-500/10 text-amber-400'
                      : selectedDestinations.usb
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                  }`}>
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">यूएसबी पेनड्राइव्ह</h4>
                    {drives.usb?.available ? (
                      <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                        जोडलेले आहे
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-amber-400 font-medium">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        जोडलेले नाही
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedDestinations.usb && drives.usb?.available}
                  onChange={(e) => setSelectedDestinations({ ...selectedDestinations, usb: e.target.checked })}
                  disabled={!drives.usb?.available || isBackingUp}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-600 bg-slate-700"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5">
                {drives.usb?.available
                  ? `पेनड्राइव्हवर दुय्यम प्रत सेव्ह केली जाईल (${drives.usb.path})`
                  : 'संगणक खराब झाल्यास डेटा वाचवण्यासाठी पेनड्राइव्ह लावणे फायदेशीर ठरते.'}
              </p>
            </label>
          </div>

          {/* Backup Progress State */}
          {isBackingUp && (
            <div className="p-4 bg-slate-800/80 border border-emerald-500/30 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>{backupProgressStep}</span>
                </span>
                {backupSuccess && (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>यशस्वी!</span>
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-full animate-pulse"></div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handleSkipAndExit}
            disabled={isBackingUp}
            className="w-full sm:w-auto px-4 py-2.5 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>बॅकअप न घेता बाहेर पडा</span>
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isBackingUp}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              रद्द करा
            </button>

            <button
              type="button"
              onClick={handleBackupAndExit}
              disabled={isBackingUp || (!selectedDestinations.pc && !selectedDestinations.usb)}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/60 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>बॅकअप सेव्ह होत आहे...</span>
                </>
              ) : (
                <>
                  <FolderCheck className="w-4 h-4" />
                  <span>१-क्लिक सुरक्षित बॅकअप घ्या आणि बंद करा</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
