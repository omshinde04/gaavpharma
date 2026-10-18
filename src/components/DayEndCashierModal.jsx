import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  X,
  History,
  Calculator,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';

export default function DayEndCashierModal({
  isOpen,
  onClose,
  currentUser = null,
  storeProfile = null
}) {
  const [activeTab, setActiveTab] = useState('reconcile'); // 'reconcile' | 'history'
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashierName, setCashierName] = useState(currentUser?.display_name || 'Main Cashier');
  const [openingFloat, setOpeningFloat] = useState(0);

  // Denominations State
  const [denominations, setDenominations] = useState({
    c500: '',
    c200: '',
    c100: '',
    c50: '',
    c20: '',
    c10: '',
    coins: ''
  });

  // Drawer Summary Data from System
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Past drawers list
  const [pastDrawers, setPastDrawers] = useState([]);

  const input500Ref = useRef(null);

  // Load Day-End Summary
  const loadDrawerSummary = async (dateStr) => {
    setLoading(true);
    try {
      const summary = await api.getDayEndDrawerSummary(dateStr, cashierName);
      if (summary) {
        setSummaryData(summary);
        setOpeningFloat(summary.opening_float || 0);
        setNotes(summary.notes || '');
        if (summary.denominations) {
          setDenominations({
            c500: summary.denominations.c500 || '',
            c200: summary.denominations.c200 || '',
            c100: summary.denominations.c100 || '',
            c50: summary.denominations.c50 || '',
            c20: summary.denominations.c20 || '',
            c10: summary.denominations.c10 || '',
            coins: summary.denominations.coins || ''
          });
        }
      }
    } catch (err) {
      console.error('Failed to load drawer summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Historical Drawers
  const loadPastDrawers = async () => {
    try {
      const list = await api.getCashDrawers({ limit: 30 });
      setPastDrawers(list || []);
    } catch (err) {
      console.error('Failed to load past drawers:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSaveSuccessMsg('');
      loadDrawerSummary(shiftDate);
      loadPastDrawers();
      setTimeout(() => {
        input500Ref.current?.focus();
      }, 80);
    }
  }, [isOpen, shiftDate]);

  // Handle Denomination Change
  const handleDenomChange = (field, val) => {
    const clean = val.replace(/\D/g, '');
    setDenominations((prev) => ({ ...prev, [field]: clean }));
  };

  // Calculate Total Physical Cash Counted
  const total500 = (parseInt(denominations.c500, 10) || 0) * 500;
  const total200 = (parseInt(denominations.c200, 10) || 0) * 200;
  const total100 = (parseInt(denominations.c100, 10) || 0) * 100;
  const total50 = (parseInt(denominations.c50, 10) || 0) * 50;
  const total20 = (parseInt(denominations.c20, 10) || 0) * 20;
  const total10 = (parseInt(denominations.c10, 10) || 0) * 10;
  const totalCoins = parseFloat(denominations.coins) || 0;

  const actualCashCounted = total500 + total200 + total100 + total50 + total20 + total10 + totalCoins;

  // Expected Cash calculation
  const cashSales = summaryData?.cash_sales || 0;
  const khataReceipts = summaryData?.khata_cash_receipts || 0;
  const cashRefunds = summaryData?.cash_refunds || 0;
  const cashExpenses = summaryData?.cash_expenses || 0;
  const parsedOpeningFloat = parseFloat(openingFloat) || 0;

  const expectedCash = Number(
    (parsedOpeningFloat + cashSales + khataReceipts - cashRefunds - cashExpenses).toFixed(2)
  );
  const discrepancy = Number((actualCashCounted - expectedCash).toFixed(2));

  // Save Shift Settlement
  const handleSaveShift = async () => {
    setSaving(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        shift_date: shiftDate,
        cashier_name: cashierName,
        opening_float: parsedOpeningFloat,
        cash_sales_amount: cashSales,
        khata_receipts_amount: khataReceipts,
        cash_expenses_amount: cashExpenses,
        expected_cash: expectedCash,
        actual_cash: actualCashCounted,
        discrepancy_amount: discrepancy,
        denominations: {
          c500: parseInt(denominations.c500, 10) || 0,
          c200: parseInt(denominations.c200, 10) || 0,
          c100: parseInt(denominations.c100, 10) || 0,
          c50: parseInt(denominations.c50, 10) || 0,
          c20: parseInt(denominations.c20, 10) || 0,
          c10: parseInt(denominations.c10, 10) || 0,
          coins: parseFloat(denominations.coins) || 0
        },
        notes: notes.trim(),
        status: 'CLOSED'
      };

      await api.saveDayEndDrawer(payload);
      setSaveSuccessMsg('✅ दिवसअखेर गल्ला ताळमेळ यशस्वीरित्या जतन केला (Shift Closed & Saved)!');
      loadPastDrawers();
      setTimeout(() => {
        setSaveSuccessMsg('');
      }, 4000);
    } catch (err) {
      alert('गल्ला ताळमेळ सेव्ह करताना त्रुटी: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Print Thermal Handover Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Keyboard Shortcuts (F9: Save, Ctrl+P: Print, Esc: Close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleSaveShift();
      } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrintSlip();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, parsedOpeningFloat, actualCashCounted, expectedCash, discrepancy, notes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  गल्ला ताळमेळ व दैनंदिन क्लोजिंग (Day-End Cashier Reconciliation)
                </h2>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Shift + D
                </span>
              </div>
              <p className="text-xs text-slate-300">
                प्रत्यक्ष रोख नोटांची मोजणी vs सिस्टीम अपेक्षित कॅश (Shortage/Surplus Audit)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'reconcile' ? 'history' : 'reconcile')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <History size={14} />
              {activeTab === 'reconcile' ? 'मागील नोंदी (History)' : 'गल्ला मोजणी (Reconcile)'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Control Bar: Date & Cashier */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Calendar size={14} className="text-slate-500" />
              <span>शिफ्ट दिनांक:</span>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <User size={14} className="text-slate-500" />
              <span>कॅशियर नाव:</span>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">सुरूवातीची कॅश (Opening Float):</span>
            <div className="flex items-center">
              <span className="px-2 py-1 bg-slate-200 border border-r-0 border-slate-300 rounded-l text-xs font-bold text-slate-700">
                ₹
              </span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="bg-white border border-slate-300 rounded-r px-2 py-1 text-xs font-bold text-slate-900 w-24 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'reconcile' ? (
          <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Physical Denomination Count */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Coins className="text-amber-600" size={17} />
                    रोख चलन मोजणी (Physical Currency Count)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">संख्या टाका (Enter count)</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* ₹500 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ ५०० x</span>
                    <input
                      ref={input500Ref}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c500}
                      onChange={(e) => handleDenomChange('c500', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total500.toFixed(2)}
                    </span>
                  </div>

                  {/* ₹200 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ २०० x</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c200}
                      onChange={(e) => handleDenomChange('c200', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total200.toFixed(2)}
                    </span>
                  </div>

                  {/* ₹100 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ १०० x</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c100}
                      onChange={(e) => handleDenomChange('c100', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total100.toFixed(2)}
                    </span>
                  </div>

                  {/* ₹50 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ ५० x</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c50}
                      onChange={(e) => handleDenomChange('c50', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total50.toFixed(2)}
                    </span>
                  </div>

                  {/* ₹20 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ २० x</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c20}
                      onChange={(e) => handleDenomChange('c20', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total20.toFixed(2)}
                    </span>
                  </div>

                  {/* ₹10 */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">₹ १० x</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.c10}
                      onChange={(e) => handleDenomChange('c10', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {total10.toFixed(2)}
                    </span>
                  </div>

                  {/* Coins */}
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 w-20">नाणी (Coins)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={denominations.coins}
                      onChange={(e) => handleDenomChange('coins', e.target.value)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="font-mono font-bold text-slate-900 w-24 text-right">
                      = ₹ {totalCoins.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Physical Cash Box */}
              <div className="mt-4 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-800">
                    प्रत्यक्ष मोजलेली कॅश (Physical Cash):
                  </div>
                  <div className="text-xl font-extrabold text-emerald-950 font-mono">
                    ₹ {actualCashCounted.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                    गल्ला शिल्लक
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: System Math & Audit Verification */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calculator className="text-blue-600" size={17} />
                    सिस्टीम अपेक्षित कॅश हिशेब (System Expected Cash)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {summaryData?.total_invoices_count || 0} बिले
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">(+) सकाळी सुरूवातीची कॅश (Opening Float):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹ {parsedOpeningFloat.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">(+) आजची रोख विक्री (Today's Cash Sales):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      + ₹ {cashSales.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">(+) खातेदारांकडून रोख जमा (Khata Cash Receipts):</span>
                    <span className="font-mono font-bold text-teal-700">
                      + ₹ {khataReceipts.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">(-) ग्राहकांना रोख परतावा (Cash Returns Refund):</span>
                    <span className="font-mono font-bold text-rose-600">
                      - ₹ {cashRefunds.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">(-) रोख खर्च व सप्लायर पेमेंट (Cash Expenses):</span>
                    <span className="font-mono font-bold text-amber-700">
                      - ₹ {cashExpenses.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 bg-blue-50/60 px-2 rounded-lg font-bold text-slate-900">
                    <span>(=) सिस्टीम अपेक्षित रोख शिल्लक (Expected Cash):</span>
                    <span className="font-mono text-blue-900 text-sm">
                      ₹ {expectedCash.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Non-Cash Breakdown Pill */}
                <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-center">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500">UPI / QR विक्री</div>
                    <div className="font-mono font-bold text-slate-800">
                      ₹ {(summaryData?.upi_sales || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500">उधारी (Khata) विक्री</div>
                    <div className="font-mono font-bold text-slate-800">
                      ₹ {(summaryData?.khata_sales || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <div className="text-slate-500">एकूण आजची विक्री</div>
                    <div className="font-mono font-bold text-indigo-700">
                      ₹ {(summaryData?.total_sales || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discrepancy Status Card */}
              <div
                className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                  discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : discrepancy < 0
                    ? 'bg-rose-50 border-rose-400 text-rose-950'
                    : 'bg-amber-50 border-amber-400 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  {discrepancy === 0 ? (
                    <CheckCircle2 size={26} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle
                      size={26}
                      className={discrepancy < 0 ? 'text-rose-600' : 'text-amber-600'}
                    />
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {discrepancy === 0
                        ? 'ताळमेळ अचूक (Balanced - Zero Variance)'
                        : discrepancy < 0
                        ? 'गल्ला कमी / तूट (Shortage Detected)'
                        : 'शिल्लक जास्त (Surplus Detected)'}
                    </div>
                    <div className="text-xs opacity-80">
                      प्रत्यक्ष कॅश (₹{actualCashCounted}) vs अपेक्षित कॅश (₹{expectedCash})
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold font-mono">
                    {discrepancy > 0 ? `+ ₹ ${discrepancy.toFixed(2)}` : `₹ ${discrepancy.toFixed(2)}`}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      discrepancy === 0
                        ? 'bg-emerald-200 text-emerald-900'
                        : discrepancy < 0
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {discrepancy === 0 ? '१००% अचूक' : discrepancy < 0 ? 'गल्ल्यात तूट' : 'अतिरिक्त रोख'}
                  </span>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <input
                  type="text"
                  placeholder="क्लोजिंग टिप्पणी (उदा. संध्याकाळची शिफ्ट दिव्याने क्लोज केली, ताळमेळ तपासला)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Past Drawers History View */
          <div className="p-5 overflow-y-auto flex-1">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <History size={16} className="text-slate-600" />
              मागील गल्ला क्लोजिंग नोंदी (Shift Settlement History)
            </h3>

            {pastDrawers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                अजून कोणत्याही मागील गल्ला नोंदी नाहीत.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">दिनांक</th>
                      <th className="p-2.5">कॅशियर</th>
                      <th className="p-2.5 text-right">सुरूवातीची कॅश</th>
                      <th className="p-2.5 text-right">रोख विक्री</th>
                      <th className="p-2.5 text-right">अपेक्षित कॅश</th>
                      <th className="p-2.5 text-right">प्रत्यक्ष कॅश</th>
                      <th className="p-2.5 text-right">फरक (Variance)</th>
                      <th className="p-2.5 text-center">स्थिती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastDrawers.map((dr) => {
                      const diff = dr.discrepancy_amount || 0;
                      return (
                        <tr key={dr.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-900">{dr.shift_date}</td>
                          <td className="p-2.5 text-slate-700">{dr.cashier_name || 'Main Cashier'}</td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            ₹ {(dr.opening_float || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold">
                            ₹ {(dr.cash_sales_amount || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-blue-900">
                            ₹ {(dr.expected_cash || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ₹ {(dr.actual_cash || 0).toFixed(2)}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-bold ${
                              diff === 0
                                ? 'text-emerald-700'
                                : diff < 0
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {diff > 0 ? `+ ₹ ${diff.toFixed(2)}` : `₹ ${diff.toFixed(2)}`}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {dr.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {saveSuccessMsg ? (
              <span className="font-bold text-emerald-700">{saveSuccessMsg}</span>
            ) : (
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                  F9
                </kbd>{' '}
                सेव्ह करा |{' '}
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                  Ctrl+P
                </kbd>{' '}
                थर्मल स्लिप |{' '}
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                  Esc
                </kbd>{' '}
                बंद करा
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSlip}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer size={15} />
              थर्मल स्लिप (Ctrl+P)
            </button>
            <button
              onClick={handleSaveShift}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? 'जतन करत आहे...' : 'शिफ्ट क्लोज व सेव्ह करा (F9)'}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Hidden 80mm Thermal Handover Receipt (Printable Area) */}
        {/* ------------------------------------------------------------- */}
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-4 print:text-black">
          <div className="max-w-[80mm] mx-auto font-mono text-[11px] leading-tight text-black">
            <div className="text-center pb-2 border-b border-black">
              <div className="text-sm font-bold">{storeProfile?.store_name || 'GaavPharma Pharmacy'}</div>
              <div className="text-[10px]">{storeProfile?.address || 'Main Road, Ghoti'}</div>
              <div className="text-[10px]">DL: {storeProfile?.dl_number || '20B/21B-MH-NSK-194829'}</div>
              <div className="mt-1 font-bold text-xs uppercase border-t border-dashed border-black pt-1">
                *** दिवसअखेर गल्ला पावती (DAY-END HANDOVER) ***
              </div>
            </div>

            <div className="py-1.5 border-b border-dashed border-black text-[10px]">
              <div>दिनांक: {shiftDate} | वेळ: {new Date().toLocaleTimeString()}</div>
              <div>कॅशियर: {cashierName}</div>
            </div>

            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between">
                <span>सुरूवातीची कॅश (Opening):</span>
                <span>₹ {parsedOpeningFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>आजची रोख विक्री (Cash Sale):</span>
                <span>+ ₹ {cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>खाते जमा (Khata Receipts):</span>
                <span>+ ₹ {khataReceipts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>परतावा (Refunds):</span>
                <span>- ₹ {cashRefunds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>खर्च (Expenses):</span>
                <span>- ₹ {cashExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-black">
                <span>अपेक्षित कॅश (Expected):</span>
                <span>₹ {expectedCash.toFixed(2)}</span>
              </div>
            </div>

            {/* Denomination Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="font-bold text-[10px] mb-1">नोटांची मोजदाद (DENOMINATIONS):</div>
              <div className="space-y-0.5 text-[10px]">
                {parseInt(denominations.c500, 10) > 0 && <div>500 x {denominations.c500} = ₹ {total500}</div>}
                {parseInt(denominations.c200, 10) > 0 && <div>200 x {denominations.c200} = ₹ {total200}</div>}
                {parseInt(denominations.c100, 10) > 0 && <div>100 x {denominations.c100} = ₹ {total100}</div>}
                {parseInt(denominations.c50, 10) > 0 && <div>50 x {denominations.c50} = ₹ {total50}</div>}
                {parseInt(denominations.c20, 10) > 0 && <div>20 x {denominations.c20} = ₹ {total20}</div>}
                {parseInt(denominations.c10, 10) > 0 && <div>10 x {denominations.c10} = ₹ {total10}</div>}
                {parseFloat(denominations.coins) > 0 && <div>नाणी (Coins) = ₹ {totalCoins}</div>}
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-black mt-1">
                <span>प्रत्यक्ष कॅश (Actual Cash):</span>
                <span>₹ {actualCashCounted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-0.5">
                <span>फरक (Variance):</span>
                <span>{discrepancy > 0 ? `+ ₹ ${discrepancy.toFixed(2)}` : `₹ ${discrepancy.toFixed(2)}`}</span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>UPI / QR विक्री:</span>
                <span>₹ {(summaryData?.upi_sales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>उधारी (Khata) विक्री:</span>
                <span>₹ {(summaryData?.khata_sales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>एकूण एकूण विक्री (Total Sale):</span>
                <span>₹ {(summaryData?.total_sales || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-6 pb-2 flex justify-between text-[10px]">
              <div className="border-t border-black w-24 text-center pt-1">कॅशियर सही</div>
              <div className="border-t border-black w-24 text-center pt-1">मालक सही</div>
            </div>
            <div className="text-center text-[9px] pt-2">*** GaavPharma ERP System ***</div>
          </div>
        </div>
      </div>
    </div>
  );
}
