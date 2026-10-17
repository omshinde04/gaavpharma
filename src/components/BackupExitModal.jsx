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
        setSelectedDestinations(prev => ({
          pc: driveInfo.pc?.available ?? true,
          usb: prev.usb || (driveInfo.usb?.available ?? false)
        }));
      }
      setLastBackupTime(lastTs);
    } catch (err) {
      console.warn('Drive scan warning:', err);
    } finally {
      setLoadingDrives(false);
    }
  };

  const handleToggleUsb = async () => {
    if (isBackingUp) return;

    if (selectedDestinations.usb) {
      setSelectedDestinations(prev => ({ ...prev, usb: false }));
      return;
    }

    // Activating USB backup:
    if (drives.usb?.available && drives.usb?.path) {
      setSelectedDestinations(prev => ({ ...prev, usb: true }));
      return;
    }

    // If USB is not auto-detected yet, activate USB mode with friendly default path
    setDrives(prev => ({
      ...prev,
      usb: {
        available: true,
        path: prev.usb?.path || 'पेनड्राइव्ह (दुय्यम बॅकअप प्रत / USB Storage)',
        label: 'यूएसबी पेनड्राइव्ह'
      }
    }));
    setSelectedDestinations(prev => ({ ...prev, usb: true }));
  };

  const handleBrowseUsbFolder = async (e) => {
    if (e) e.stopPropagation();
    if (isBackingUp) return;

    try {
      const chosenFolder = await api.selectFolder();
      if (chosenFolder) {
        setDrives(prev => ({
          ...prev,
          usb: {
            available: true,
            path: chosenFolder,
            label: `यूएसबी पेनड्राइव्ह (${chosenFolder})`
          }
        }));
        setSelectedDestinations(prev => ({ ...prev, usb: true }));
      }
    } catch (err) {
      console.error('Folder selection error:', err);
    }
  };

  if (!isOpen) return null;

  const handleBackupAndExit = async () => {
    setIsBackingUp(true);
    setBackupProgressStep('१/३: डेटाबेस ट्रान्झॅक्शन लॉक व चेकपॉईंट (WAL Checkpoint)...');

    try {
      const destinations = [];
      if (selectedDestinations.pc) destinations.push('pc');
      if (selectedDestinations.usb) destinations.push('usb');

      await new Promise(r => setTimeout(r, 400));
      setBackupProgressStep('२/३: संगणक व पेनड्राइव्हवर सुरक्षित डेटा कॉपी होत आहे...');

      const result = await api.createDatabaseBackup({
        destinations: destinations.length > 0 ? destinations : ['pc'],
        usbPath: drives.usb?.path || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900">
        
        {/* Top Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  दुकान बंद करताना सुरक्षित बॅकअप
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
                  १००% सुरक्षित
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {storeProfile?.store_name || 'Divya Medical Stores'} — दररोज दुकान बंद करताना १-क्लिक बॅकअप
              </p>
            </div>
          </div>
          {!isBackingUp && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          
          {/* Last Backup Notice */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-2xs">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>मागील बॅकअप वेळ:</span>
              <strong className="text-slate-900 font-semibold">{formatLastBackup(lastBackupTime)}</strong>
            </div>
            <button
              onClick={loadDriveStatus}
              disabled={loadingDrives}
              className="flex items-center space-x-1 text-slate-500 hover:text-emerald-700 transition-colors font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDrives ? 'animate-spin' : ''}`} />
              <span>ड्राइव्ह तपासा</span>
            </button>
          </div>

          <p className="text-xs text-slate-600">
            खालील दोन्ही ठिकाणी आजचा संपूर्ण औषध साठा, विक्री बिल, उधारी खाते व जीएसटी डेटा सुरक्षित सेव्ह केला जाईल:
          </p>

          {/* Dual Drives Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* 1. PC Local Hard Drive */}
            <div
              id="pc-drive-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isBackingUp) {
                  setSelectedDestinations(prev => ({ ...prev, pc: !prev.pc }));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isBackingUp) setSelectedDestinations(prev => ({ ...prev, pc: !prev.pc }));
                }
              }}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                selectedDestinations.pc
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg ${selectedDestinations.pc ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">स्थानिक संगणक</h4>
                      <span className="text-[10px] text-emerald-700 font-mono font-medium">
                        {drives.pc?.path?.startsWith('D:') ? 'D: Drive (सुरक्षित)' : 'Documents Folder'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="pc-backup-checkbox"
                    checked={selectedDestinations.pc}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedDestinations(prev => ({ ...prev, pc: e.target.checked }));
                    }}
                    disabled={isBackingUp}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5">
                  हार्ड डिस्कवरील बॅकअप फोल्डरमध्ये सुरक्षित .db फाईल जतन होते (३० दिवसांचे ऑटो-रोटेशन).
                </p>
              </div>
            </div>

            {/* 2. Removable USB Pendrive */}
            <div
              id="usb-drive-card"
              role="button"
              tabIndex={0}
              onClick={handleToggleUsb}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleUsb();
                }
              }}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                selectedDestinations.usb
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
                  : drives.usb?.available
                    ? 'bg-white border-slate-200 hover:border-emerald-300'
                    : 'bg-amber-50/40 border-dashed border-amber-300 hover:border-amber-400'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg transition-colors ${
                      selectedDestinations.usb
                        ? 'bg-emerald-100 text-emerald-800'
                        : drives.usb?.available
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      <Usb className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
                        <span>यूएसबी पेनड्राइव्ह</span>
                        {selectedDestinations.usb && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                            सक्रिय
                          </span>
                        )}
                      </h4>
                      {selectedDestinations.usb ? (
                        <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium truncate max-w-[190px]" title={drives.usb?.path}>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                          <span className="truncate">{drives.usb?.path || 'पेनड्राइव्ह दुय्यम प्रत'}</span>
                        </span>
                      ) : drives.usb?.available ? (
                        <span className="inline-flex items-center text-[10px] text-teal-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mr-1 animate-pulse"></span>
                          पेनड्राइव्ह उपलब्ध (क्लिक करा)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-amber-700 font-medium">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1 shrink-0" />
                          ऑटो-डिटेक्ट नाही (क्लिक करा)
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    id="usb-backup-checkbox"
                    checked={selectedDestinations.usb}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleUsb();
                    }}
                    disabled={isBackingUp}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                </div>

                {/* Action Row: Browse Folder & Rescan */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={handleBrowseUsbFolder}
                    disabled={isBackingUp}
                    className="inline-flex items-center space-x-1 text-emerald-800 hover:text-emerald-900 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors border border-emerald-300"
                  >
                    <FolderCheck className="w-3 h-3" />
                    <span>फोल्डर निवडा (Browse)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadDriveStatus();
                    }}
                    disabled={loadingDrives || isBackingUp}
                    className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 px-1.5 py-1 rounded transition-colors"
                    title="पेनड्राइव्ह पुन्हा शोधा"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDrives ? 'animate-spin' : ''}`} />
                    <span>पुन्हा शोधा</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-2">
                  {selectedDestinations.usb
                    ? '✓ दुकान बंद करताना पेनड्राइव्हवर दुय्यम प्रत सुरक्षित सेव्ह होईल.'
                    : 'संगणक खराब झाल्यास पेनड्राइव्हमधील बॅकअपमुळे १००% डेटा वाचतो.'}
                </p>
              </div>
            </div>
          </div>

          {/* Backup Progress State */}
          {isBackingUp && (
            <div className="p-4 bg-white border border-emerald-300 rounded-xl space-y-2.5 animate-fadeIn shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-800 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>{backupProgressStep}</span>
                </span>
                {backupSuccess && (
                  <span className="text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>यशस्वी!</span>
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-full animate-pulse"></div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handleSkipAndExit}
            disabled={isBackingUp}
            className="w-full sm:w-auto px-4 py-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors flex items-center justify-center space-x-1.5 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>बॅकअप न घेता बाहेर पडा</span>
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isBackingUp}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              रद्द करा
            </button>

            <button
              type="button"
              onClick={handleBackupAndExit}
              disabled={isBackingUp || (!selectedDestinations.pc && !selectedDestinations.usb)}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
