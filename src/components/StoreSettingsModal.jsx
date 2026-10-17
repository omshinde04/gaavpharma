import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Store,
  Users,
  Shield,
  Key,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Phone,
  FileText,
  MapPin,
  QrCode,
  Sparkles,
  Database,
  HardDrive,
  Usb,
  RotateCcw,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api';

export default function StoreSettingsModal({ onClose, onProfileUpdated, onTogglesUpdated, onOpenLicenseModal, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'toggles' | 'staff' | 'subscription'
  const [profile, setProfile] = useState({
    store_name: '',
    dl_number: '',
    gstin: '',
    address: '',
    phone: '',
    upi_id: '',
    printer_type: '80mm',
    auto_print: 0
  });

  const [toggles, setToggles] = useState(() => {
    try {
      const raw = localStorage.getItem('gaavpharma_feature_toggles');
      if (raw) return JSON.parse(raw);
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

  const [users, setUsers] = useState([]);
  const [license, setLicense] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    display_name: '',
    pin_code: '',
    role: 'cashier'
  });

  // Backup & Safety state
  const [backupDrives, setBackupDrives] = useState({ pc: null, usb: null });
  const [backupHistory, setBackupHistory] = useState([]);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [isTakingBackup, setIsTakingBackup] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const p = await api.getStoreProfile();
      const t = await api.getFeatureToggles();
      const u = await api.getUsers();
      const l = await api.getLicenseStatus();
      if (p) setProfile(p);
      if (t) setToggles(t);
      if (u) setUsers(u);
      if (l) setLicense(l);
    } catch (err) {
      console.error(err);
    }
    loadBackupData();
  };

  const loadBackupData = async () => {
    try {
      const [drives, hist, lastTs] = await Promise.all([
        api.getAvailableBackupDrives(),
        api.getBackupHistory(),
        api.getLastBackupTimestamp()
      ]);
      if (drives) setBackupDrives(drives);
      if (hist) setBackupHistory(hist);
      setLastBackupTime(lastTs);
    } catch (e) {
      console.warn('loadBackupData error:', e);
    }
  };

  const handleTakeBackupNow = async () => {
    setIsTakingBackup(true);
    setBackupStatusMsg('डेटाबेस सुरक्षित सेव्ह होत आहे...');
    try {
      const res = await api.createDatabaseBackup({ backupType: 'manual' });
      setBackupStatusMsg('✅ बॅकअप यशस्वीरीत्या सेव्ह झाला!');
      await loadBackupData();
      setTimeout(() => setBackupStatusMsg(''), 3000);
    } catch (err) {
      alert('बॅकअप घेताना त्रुटी आली: ' + err.message);
      setBackupStatusMsg('');
    } finally {
      setIsTakingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupPath) => {
    if (!confirm('⚠️ सावधान: डेटाबेस रिस्टोर केल्यास सध्याचा डेटा निवडलेल्या बॅकअप फाईलमधील डेटाने बदलला जाईल.\nतुम्हाला खात्री आहे का?')) {
      return;
    }
    try {
      const res = await api.restoreDatabaseFromBackup(backupPath);
      alert(res.message || 'डेटाबेस पूर्ववत केला गेला. सॉफ्टवेअर पुन्हा लोड होत आहे.');
      window.location.reload();
    } catch (err) {
      alert('रिस्टोर करताना त्रुटी आली: ' + err.message);
    }
  };

  const handleSelectFileRestore = async () => {
    try {
      const filePath = await api.selectBackupFile();
      if (filePath) {
        handleRestoreBackup(filePath);
      }
    } catch (err) {
      alert('फाईल निवडताना त्रुटी आली: ' + err.message);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateStoreProfile(profile);
      setProfile(updated);
      if (onProfileUpdated) onProfileUpdated(updated);
      setSaveSuccess('Store Profile saved successfully.');
      setTimeout(() => setSaveSuccess(''), 2500);
    } catch (err) {
      console.error(err);
      alert('Failed to update store profile');
    }
  };

  const handleToggleChange = (key, val) => {
    // Instant 0ms UI update
    const updated = { ...toggles, [key]: val };
    setToggles(updated);
    if (onTogglesUpdated) onTogglesUpdated(updated);
    try {
      localStorage.setItem('gaavpharma_feature_toggles', JSON.stringify(updated));
    } catch (e) {}

    // Save in background
    api.updateFeatureToggle(key, val).catch((err) => {
      console.error('Failed to update toggle:', err);
      setToggles(toggles);
      if (onTogglesUpdated) onTogglesUpdated(toggles);
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const pin = (newUserData.pin_code || '').trim();
    if (!newUserData.username || !newUserData.display_name || !pin) {
      alert('All fields are required.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      alert('PIN must be exactly 4 numeric digits (e.g. 5566).');
      return;
    }
    const duplicatePin = users.find((u) => u.is_active && u.pin_code === pin);
    if (duplicatePin) {
      alert(
        `⚠️ Duplicate PIN Conflict:\n` +
        `PIN "${pin}" is already assigned to "${duplicatePin.display_name}".\n` +
        `Each staff member must have a unique 4-digit PIN so the system knows who is logging in.`
      );
      return;
    }
    const duplicateUsername = users.find(
      (u) => u.username.toLowerCase() === newUserData.username.toLowerCase().trim()
    );
    if (duplicateUsername) {
      alert(`⚠️ Username "${newUserData.username}" is already taken.`);
      return;
    }
    try {
      const added = await api.addUser({ ...newUserData, pin_code: pin });
      setShowAddUser(false);
      setNewUserData({ username: '', display_name: '', pin_code: '', role: 'cashier' });
      const freshUsers = await api.getUsers();
      setUsers(freshUsers || [...users, added]);
    } catch (err) {
      alert('Failed to add staff user. Username must be unique.');
    }
  };

  const handleChangePin = async (user) => {
    const newPin = prompt(`Enter new unique 4-digit PIN for "${user.display_name}":`, user.pin_code || '');
    if (!newPin) return;
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      alert('PIN must be exactly 4 numeric digits (e.g. 2345).');
      return;
    }
    const duplicate = users.find((u) => u.id !== user.id && u.is_active && u.pin_code === cleanPin);
    if (duplicate) {
      alert(
        `⚠️ Duplicate PIN Conflict:\n` +
        `PIN "${cleanPin}" is already used by "${duplicate.display_name}".\n` +
        `Each staff member must have a unique PIN.`
      );
      return;
    }
    try {
      await api.updateUser(user.id, { pin_code: cleanPin });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, pin_code: cleanPin } : u))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update PIN.');
    }
  };

  const handleEditName = async (user) => {
    const newName = prompt(`Enter new full name for "${user.display_name}":`, user.display_name);
    if (!newName || !newName.trim()) return;
    const cleanName = newName.trim();
    try {
      await api.updateUser(user.id, { display_name: cleanName });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, display_name: cleanName } : u))
      );
      if (onUserUpdated) {
        onUserUpdated({ ...user, display_name: cleanName });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update name.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.role === 'super_admin') {
      alert('Cannot delete the Founder / Super Administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to remove "${user.display_name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const handleToggleUserStatus = (user) => {
    const nextStatus = user.is_active ? 0 : 1;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
    );

    api.updateUser(user.id, { is_active: nextStatus }).catch((err) => {
      console.error(err);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-white text-slate-900 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <Sliders className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Store Administration & Control Center</h3>
              <p className="text-[11px] text-slate-500">Configure pharmacy profile, cashier feature toggles, and staff accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-1 bg-slate-100 border-b border-slate-200 flex text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>Store Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('toggles')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'toggles' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Feature Toggles (ON/OFF)</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'staff' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Staff Management ({users.filter((u) => u.role !== 'super_admin').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'subscription' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Subscription</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('backup');
              loadBackupData();
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'backup' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>डेटा सुरक्षा व बॅकअप</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-xs">
          {saveSuccess && (
            <div className="mb-4 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            /* Store Profile Form */
            <form onSubmit={handleProfileSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Store / Pharmacy Registered Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.store_name}
                    onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Drug License No. (DL 20B / 21B) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.dl_number}
                    onChange={(e) => setProfile({ ...profile, dl_number: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    GSTIN Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.gstin}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Shop Address (Printed on Receipts) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Counter Phone Number
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    UPI ID for QR Code Billing
                  </label>
                  <input
                    type="text"
                    value={profile.upi_id}
                    onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                    placeholder="e.g. yourshop@oksbi"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Thermal Printer Standard
                  </label>
                  <select
                    value={profile.printer_type}
                    onChange={(e) => setProfile({ ...profile, printer_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                  >
                    <option value="80mm">80mm ESC/POS Standard</option>
                    <option value="58mm">58mm Compact POS</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs"
                >
                  Save Store Profile
                </button>
              </div>
            </form>
          )}

          {activeTab === 'toggles' && (
            /* Feature Toggles Panel */
            <div className="space-y-4">
              <div className="text-[11px] text-slate-500 mb-2">
                Enable or disable functionality across counter terminals. Changes take effect immediately.
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                {/* Khata Toggle */}
                <div
                  onClick={() => handleToggleChange('allow_khata', !toggles.allow_khata)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Khata (Family Credit Billing)</div>
                    <div className="text-[10px] text-slate-500">Allow customers to purchase on udhaari credit</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.allow_khata ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.allow_khata ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Loose Tablet Math Toggle */}
                <div
                  onClick={() => handleToggleChange('allow_loose_tablets', !toggles.allow_loose_tablets)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Loose Cut Tablet Dispensing</div>
                    <div className="text-[10px] text-slate-500">Allow selling fractional tablets out of strips (e.g. 4 tablets out of 10)</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.allow_loose_tablets ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.allow_loose_tablets ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* WhatsApp Receipts Toggle */}
                <div
                  onClick={() => handleToggleChange('allow_whatsapp', !toggles.allow_whatsapp)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">1-Click WhatsApp Invoicing</div>
                    <div className="text-[10px] text-slate-500">Generate formatted wa.me payment links for customers</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.allow_whatsapp ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.allow_whatsapp ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Schedule H1 Doctor Enforcement */}
                <div
                  onClick={() => handleToggleChange('enforce_h1_doctor', !toggles.enforce_h1_doctor)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Enforce Doctor Name for Schedule H1</div>
                    <div className="text-[10px] text-slate-500">Block bill completion if antibiotic has no prescribing doctor entered</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.enforce_h1_doctor ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.enforce_h1_doctor ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Hide Financial Drawer from Cashiers */}
                <div
                  onClick={() => handleToggleChange('hide_drawer_from_cashier', !toggles.hide_drawer_from_cashier)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Hide Financial Register from Cashiers</div>
                    <div className="text-[10px] text-slate-500">Cashiers cannot see today's total store revenue or gross drawer cash</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.hide_drawer_from_cashier ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.hide_drawer_from_cashier ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Allow Cashier to Access Purchases */}
                <div
                  onClick={() => handleToggleChange('allow_cashier_purchase_inward', !toggles.allow_cashier_purchase_inward)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Allow Cashiers to Access Wholesale Purchases</div>
                    <div className="text-[10px] text-slate-500">If disabled, only the Store Owner and Super Admin can inward bills or view supplier debts</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.allow_cashier_purchase_inward ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.allow_cashier_purchase_inward ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Allow Cashier to Access Compliance & GST */}
                <div
                  onClick={() => handleToggleChange('allow_cashier_compliance', !toggles.allow_cashier_compliance)}
                  className="p-3.5 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-semibold text-slate-900">Allow Cashiers to Access Compliance & GST Hub</div>
                    <div className="text-[10px] text-slate-500">If disabled, only Store Owner can view Schedule H1 register & GSTR-3B tax data</div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ease-in-out shrink-0 ${
                      toggles.allow_cashier_compliance ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out ${
                        toggles.allow_cashier_compliance ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Maximum Cashier Discount */}
                <div className="p-3.5 flex items-center justify-between hover:bg-white transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900">Maximum Cashier Discount Limit</div>
                    <div className="text-[10px] text-slate-500">Cap the max discount % a cashier can apply without owner PIN</div>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={toggles.max_cashier_discount || 10}
                      onChange={(e) => handleToggleChange('max_cashier_discount', e.target.value)}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            /* Staff Management */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-900">Counter Staff & Cashiers</h4>
                  <p className="text-[10px] text-slate-500">Manage 4-digit PINs and counter staff permissions</p>
                </div>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Counter Staff</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {users.filter((u) => u.role !== 'super_admin').map((u) => {
                  const isDuplicatePin = users.filter((x) => x.is_active && x.pin_code === u.pin_code).length > 1;
                  const isOwner = u.role === 'store_admin';

                  return (
                    <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{u.display_name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                            isOwner ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isOwner ? 'STORE OWNER' : u.role}
                          </span>
                          {!u.is_active && (
                            <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-semibold">
                              Deactivated
                            </span>
                          )}
                          {isDuplicatePin && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded animate-pulse">
                              ⚠️ Duplicate PIN Conflict
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>Username: <b>{u.username}</b></span>
                          <span>•</span>
                          <span className={isDuplicatePin ? 'text-rose-700 font-bold' : ''}>
                            PIN: <b>•••• ({u.pin_code})</b>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChangePin(u)}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-sans ml-1 font-semibold"
                          >
                            Change PIN
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleEditName(u)}
                            className="text-[10px] text-blue-700 hover:text-blue-900 underline font-sans font-semibold"
                          >
                            Edit Name
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {!isOwner ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                                u.is_active
                                  ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'border-emerald-200 text-emerald-800 bg-emerald-50'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                              title="Delete Cashier Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono italic pr-2">
                            Primary Account
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add User Modal */}
              {showAddUser && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="font-semibold text-slate-900 text-xs">Create New Account (Store Owner / Counter Cashier)</div>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Om Shinde (Owner) or Sagar"
                        value={newUserData.display_name}
                        onChange={(e) => setNewUserData({ ...newUserData, display_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. om_owner or cashier1"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">4-Digit Login PIN</label>
                      <input
                        type="password"
                        maxLength="4"
                        required
                        placeholder="e.g. 1111"
                        value={newUserData.pin_code}
                        onChange={(e) => setNewUserData({ ...newUserData, pin_code: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Role Permission</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="store_admin">Store Owner / Administrator (Full Store Control)</option>
                        <option value="cashier">Counter Staff / Cashier (Billing Only)</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="px-3 py-1 border border-slate-200 rounded text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                      >
                        Create Account
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            /* Subscription Details */
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current Active License
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    {license?.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {license?.plan?.toUpperCase()} PLAN
                </div>
                <div className="flex justify-between text-xs text-slate-300 font-mono pt-2 border-t border-slate-800">
                  <span>Days Remaining: <b>{license?.daysRemaining} days</b></span>
                  <span>Expires: {license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-semibold text-slate-900 text-xs">Need to Renew or Upgrade?</div>
                <p className="text-[11px] text-slate-500">
                  Contact GaavPharma (+91 98220 12345) to receive your renewal code or upgrade to multi-counter support.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenLicenseModal) onOpenLicenseModal();
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
                >
                  Enter Renewal Code / License Key
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            /* Data Safety & Dual Backup Engine */
            <div className="space-y-4">
              
              {/* Header Card */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">ड्युअल डेटा सुरक्षा व आपत्कालीन पुनर्प्राप्ती (Dual PC + USB Backup)</h4>
                      <p className="text-[11px] text-slate-400">
                        औषध साठा, उधारी (खाते), खरेदी बिल आणि जीएसटी डेटा स्थानिक हार्ड ड्राइव्ह आणि यूएसबी पेनड्राइव्हवर सुरक्षित ठेवा.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={loadBackupData}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title="रिफ्रेश करा"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                    <span>मागील यशस्वी बॅकअप:</span>
                    <strong className="text-white">
                      {lastBackupTime ? new Date(lastBackupTime).toLocaleString('mr-IN') : 'अद्याप घेतलेला नाही'}
                    </strong>
                  </span>

                  <button
                    onClick={handleTakeBackupNow}
                    disabled={isTakingBackup}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isTakingBackup ? 'बॅकअप घेत आहे...' : 'आता सुरक्षित बॅकअप घ्या'}</span>
                  </button>
                </div>

                {backupStatusMsg && (
                  <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg font-medium">
                    {backupStatusMsg}
                  </div>
                )}
              </div>

              {/* Connected Drives Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      <span>स्थानिक संगणक (PC)</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      सक्रिय
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono break-all">
                    {backupDrives.pc?.path || 'Documents/GaavPharma_Backups'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ३० दिवसांचे ऑटो-रोटेशन सक्रिय (हार्ड डिस्क कधीही भरणार नाही)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
                      <Usb className="w-4 h-4 text-blue-600" />
                      <span>यूएसबी पेनड्राइव्ह (USB)</span>
                    </span>
                    {backupDrives.usb?.available ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        जोडलेले आहे
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        जोडलेले नाही
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono break-all">
                    {backupDrives.usb?.path || 'कोणताही पेनड्राइव्ह आढळला नाही'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    संगणक खराब झाल्यास पेनड्राइव्हमधून १ सेकंदात डेटा पूर्ववत होतो.
                  </div>
                </div>
              </div>

              {/* Restore Action */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-amber-900 text-xs">आपत्कालीन डेटा पूर्ववत (Emergency Restore)</div>
                  <p className="text-[11px] text-amber-700">
                    दुसऱ्या संगणकावरील किंवा जुनी बॅकअप फाईल निवडून संपूर्ण डेटा परत मिळवा.
                  </p>
                </div>
                <button
                  onClick={handleSelectFileRestore}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1 shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>फाईल निवडून रिस्टोर करा</span>
                </button>
              </div>

              {/* Backup History Table */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                  <span>अलीकडील बॅकअप इतिहास ({backupHistory.length})</span>
                  <span className="text-[10px] text-slate-400">नवीनतम बॅकअप सर्वात वर</span>
                </div>

                {backupHistory.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    अद्याप कोणतीही बॅकअप नोंद नाही. "आता सुरक्षित बॅकअप घ्या" बटनावर क्लिक करा.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {backupHistory.map((item) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800 text-xs font-mono">{item.filename}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                            <span>{new Date(item.created_at).toLocaleString('mr-IN')}</span>
                            <span>•</span>
                            <span>{Math.round((item.file_size_bytes || 0) / 1024)} KB</span>
                            <span>•</span>
                            <span className="uppercase text-[9px] px-1 py-0.2 bg-slate-100 rounded text-slate-600">
                              {item.backup_type}
                            </span>
                          </div>
                        </div>

                        {item.backup_path && (
                          <button
                            onClick={() => handleRestoreBackup(item.backup_path)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>रिस्टोर</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
