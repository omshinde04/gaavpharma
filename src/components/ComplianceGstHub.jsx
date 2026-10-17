import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  Calendar,
  Search,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  RefreshCw,
  Stethoscope,
  User,
  MapPin,
  Clock,
  ArrowRight,
  Receipt,
  FileText,
  DollarSign,
  Info,
  Lock
} from 'lucide-react';
import { api } from '../services/api';

export default function ComplianceGstHub({ currentUser, featureToggles, storeProfile }) {
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const allowCashierCompliance =
    featureToggles?.allow_cashier_compliance === true ||
    featureToggles?.allow_cashier_compliance === 'true' ||
    featureToggles?.allow_cashier_compliance === 1;

  // Active sub-tab: 'h1_register' | 'gst_hub'
  const [activeTab, setActiveTab] = useState('h1_register');

  // Loading state
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------
  // TAB 1: FDA SCHEDULE H1 REGISTER STATE
  // ----------------------------------------------------
  const [h1Filters, setH1Filters] = useState({
    preset: 'month', // 'today' | 'week' | 'month' | 'all' | 'custom'
    startDate: '',
    endDate: '',
    search: ''
  });
  const [h1Records, setH1Records] = useState([]);

  // ----------------------------------------------------
  // TAB 2: GST 3B & 1 TAX HUB STATE ("3, 18, 40 GST")
  // ----------------------------------------------------
  const currentDate = new Date();
  const [gstPeriod, setGstPeriod] = useState({
    month: currentDate.getMonth() + 1, // 1 - 12
    year: currentDate.getFullYear()
  });
  const [gstSummary, setGstSummary] = useState(null);

  // ----------------------------------------------------
  // DATA LOADERS
  // ----------------------------------------------------
  const loadH1Register = async () => {
    setLoading(true);
    try {
      let sDate = h1Filters.startDate;
      let eDate = h1Filters.endDate;

      if (h1Filters.preset === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        sDate = todayStr;
        eDate = todayStr;
      } else if (h1Filters.preset === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        sDate = d.toISOString().slice(0, 10);
        eDate = new Date().toISOString().slice(0, 10);
      } else if (h1Filters.preset === 'month') {
        const now = new Date();
        const padMonth = String(now.getMonth() + 1).padStart(2, '0');
        sDate = `${now.getFullYear()}-${padMonth}-01`;
        eDate = now.toISOString().slice(0, 10);
      } else if (h1Filters.preset === 'all') {
        sDate = '';
        eDate = '';
      }

      const data = await api.getScheduleH1Register({
        startDate: sDate,
        endDate: eDate,
        search: h1Filters.search
      });
      setH1Records(data || []);
    } catch (err) {
      console.error('Failed to load Schedule H1 register:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGstTaxSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getGstTaxSummary({
        month: gstPeriod.month,
        year: gstPeriod.year
      });
      setGstSummary(data);
    } catch (err) {
      console.error('Failed to load GST tax summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'h1_register') {
      loadH1Register();
    } else {
      loadGstTaxSummary();
    }
  }, [activeTab, h1Filters.preset, h1Filters.startDate, h1Filters.endDate, gstPeriod.month, gstPeriod.year]);

  // ----------------------------------------------------
  // EXPORTS & PRINTS
  // ----------------------------------------------------
  const handlePrintH1Register = () => {
    window.print();
  };

  const handleExportH1Csv = () => {
    if (h1Records.length === 0) {
      alert('No Schedule H1 records to export.');
      return;
    }
    const headers = [
      'Sr No',
      'Dispense Date',
      'Bill No',
      'Patient Name',
      'Patient Mobile',
      'Patient Village',
      'Doctor Name',
      'Doctor MMC Reg No',
      'Medicine Name',
      'Generic Salt',
      'Batch No',
      'Expiry',
      'Quantity',
      'Unit Price',
      'Total Amount'
    ];

    const rows = h1Records.map((r, i) => [
      i + 1,
      r.dispensed_at ? new Date(r.dispensed_at).toLocaleDateString('en-IN') : '-',
      `"${r.invoice_no}"`,
      `"${r.patient_name || ''}"`,
      `"${r.patient_mobile || ''}"`,
      `"${r.patient_address || 'Ghoti'}"`,
      `"${r.doctor_name || ''}"`,
      `"${r.doctor_reg_no || ''}"`,
      `"${r.medicine_name || ''}"`,
      `"${r.generic_salt || ''}"`,
      `"${r.batch_no || ''}"`,
      `"${r.expiry_date || ''}"`,
      r.qty,
      r.unit_price,
      r.total_price
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FDA_Schedule_H1_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintGstSummary = () => {
    window.print();
  };

  const handleExportGstCsv = () => {
    if (!gstSummary) return;
    const lines = [];
    lines.push(`GST SUMMARY REPORT - ${storeProfile?.store_name || 'Medical Store'}`);
    lines.push(`Period: ${gstSummary.period?.fyLabel} (${gstSummary.period?.startDate} to ${gstSummary.period?.endDate})`);
    lines.push(`GSTIN: ${storeProfile?.gstin || '-'}`);
    lines.push('');
    lines.push('--- 1. GSTR-3B OUTWARD SUPPLIES (SALES) ---');
    lines.push('Slab,Taxable Value,CGST,SGST,Total Tax,Gross Sales');
    Object.values(gstSummary.outward.slabs || {}).forEach((s) => {
      lines.push(`${s.slab}%,${s.taxable.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.total_tax.toFixed(2)},${s.gross.toFixed(2)}`);
    });
    lines.push('');
    lines.push('--- 2. GSTR-3B INWARD SUPPLIES (ITC PURCHASES) ---');
    lines.push('Slab,Taxable Value,Inward CGST,Inward SGST,Total ITC,Gross Purchases');
    Object.values(gstSummary.inward.slabs || {}).forEach((s) => {
      lines.push(`${s.slab}%,${s.taxable.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.total_tax.toFixed(2)},${s.gross.toFixed(2)}`);
    });
    lines.push('');
    lines.push('--- 3. ITC REVERSALS (SEC 34 DEBIT NOTES) ---');
    lines.push('Slab,Taxable Reversed,Reversed CGST,Reversed SGST,Total Reversed,Gross Claim');
    Object.values(gstSummary.itcReversals.slabs || {}).forEach((s) => {
      lines.push(`${s.slab}%,${s.taxable.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.total_tax.toFixed(2)},${s.gross.toFixed(2)}`);
    });
    lines.push('');
    lines.push('--- 4. NET RECONCILIATION ---');
    lines.push(`Total Output Tax,₹${gstSummary.netPosition.totalOutputTax.toFixed(2)}`);
    lines.push(`Gross Eligible ITC,₹${gstSummary.netPosition.totalEligibleItc.toFixed(2)}`);
    lines.push(`ITC Reversed,₹${gstSummary.netPosition.totalReversedItc.toFixed(2)}`);
    lines.push(`Net Eligible ITC,₹${gstSummary.netPosition.netEligibleItc.toFixed(2)}`);
    lines.push(`Net GST Payable to Govt,₹${gstSummary.netPosition.netGstPayable.toFixed(2)}`);
    lines.push(`ITC Balance Carried Forward,₹${gstSummary.netPosition.itcCreditCarriedForward.toFixed(2)}`);
    lines.push('');
    lines.push('--- 5. 40 LAKHS ANNUAL TURNOVER TRACKER ---');
    lines.push(`Annual Gross Turnover,₹${gstSummary.turnoverTracker.annualTurnover.toFixed(2)}`);
    lines.push(`Threshold Limit,₹${gstSummary.turnoverTracker.limit.toFixed(2)}`);
    lines.push(`Remaining Allowance,₹${gstSummary.turnoverTracker.remainingAllowance.toFixed(2)}`);
    lines.push(`Status,${gstSummary.turnoverTracker.status}`);

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GST_3B_Tax_Report_${gstPeriod.year}_${gstPeriod.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RBAC Gating
  if (isCashier && !allowCashierCompliance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-500 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
          <Lock className="w-7 h-7" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-base font-bold text-slate-900">Compliance & GST Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Statutory FDA registers and GST tax reconciliation are restricted to Store Admins. If needed, the store owner can enable cashier access in Store Admin Settings.
          </p>
        </div>
      </div>
    );
  }

  // H1 summary stats
  const totalH1Qty = h1Records.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const totalH1Amount = h1Records.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
  const uniqueDoctors = new Set(h1Records.map((r) => r.doctor_name).filter(Boolean)).size;
  const uniquePatients = new Set(h1Records.map((r) => r.patient_mobile || r.patient_name).filter(Boolean)).size;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                कायदेशीर अनुपालन व GST केंद्र (Compliance & GST Hub)
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Rule 65 & Sec 34 Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Official Maharashtra FDA Schedule H1 Register • GSTR-3B & GSTR-1 Tax Reconciliation Hub ("3, 18, 40 GST")
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('h1_register')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'h1_register'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>FDA Schedule H1 Register</span>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              Rule 65
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gst_hub')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gst_hub'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>GST Tax Hub (3B & 1)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              3, 18, 40 GST
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ==================================================================== */}
        {/* TAB 1: FDA SCHEDULE H1 REGISTER VIEW                                */}
        {/* ==================================================================== */}
        {activeTab === 'h1_register' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span className="text-xs font-bold text-slate-700">Period:</span>
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all', label: 'All Records' },
                  { id: 'custom', label: 'Custom Range' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setH1Filters({ ...h1Filters, preset: p.id })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      h1Filters.preset === p.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {h1Filters.preset === 'custom' && (
                  <div className="flex items-center space-x-1.5 pl-2 font-mono text-xs">
                    <input
                      type="date"
                      value={h1Filters.startDate}
                      onChange={(e) => setH1Filters({ ...h1Filters, startDate: e.target.value })}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={h1Filters.endDate}
                      onChange={(e) => setH1Filters({ ...h1Filters, endDate: e.target.value })}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Search & Actions */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={h1Filters.search}
                    onChange={(e) => setH1Filters({ ...h1Filters, search: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && loadH1Register()}
                    placeholder="Search doctor, patient, medicine..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-60 focus:bg-white focus:border-slate-400"
                  />
                </div>

                <button
                  onClick={loadH1Register}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handlePrintH1Register}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Register</span>
                </button>

                <button
                  onClick={handleExportH1Csv}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Schedule H1 Dispensed
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                  {totalH1Qty} <span className="text-xs font-normal text-slate-500">units</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Across {h1Records.length} prescription records
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Prescribing Doctors
                </div>
                <div className="text-xl font-extrabold text-indigo-700 font-mono mt-1">
                  {uniqueDoctors} <span className="text-xs font-normal text-slate-500">physicians</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  MMC registered practitioners
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Patients Logged
                </div>
                <div className="text-xl font-extrabold text-emerald-700 font-mono mt-1">
                  {uniquePatients} <span className="text-xs font-normal text-slate-500">patients</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Village & mobile recorded
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  H1 Medicines Turnover
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                  ₹{totalH1Amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  100% FDA Rule 65 Audit Ready
                </div>
              </div>
            </div>

            {/* Official Schedule H1 Table (Printable) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                    MAHARASHTRA FDA SCHEDULE H1 DISPENSING REGISTER (नियम ६५ नोंदवही)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                    {h1Records.length} entries
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Preserved for 3 years under Drugs & Cosmetics Rules 1945
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-28">Date & Time</th>
                      <th className="py-2.5 px-3 w-28">Invoice #</th>
                      <th className="py-2.5 px-4 min-w-[160px]">Patient Name & Village</th>
                      <th className="py-2.5 px-4 min-w-[160px]">Prescriber Doctor & Reg No</th>
                      <th className="py-2.5 px-4 min-w-[180px]">Drug Name & Generic Salt</th>
                      <th className="py-2.5 px-3 w-24">Batch No</th>
                      <th className="py-2.5 px-3 w-20">Expiry</th>
                      <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-24 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-center">Pharmacist Sign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {h1Records.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-12 text-center text-slate-400">
                          <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 stroke-1 mb-2" />
                          <div className="text-xs font-semibold text-slate-700">No Schedule H1 Dispensing Records Found</div>
                          <div className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                            Any counter bill containing medicines flagged with Schedule H1 (e.g. Augmentin, Azithral, Alprazolam) will be logged here automatically.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      h1Records.map((r, idx) => (
                        <tr key={r.item_id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            <div>{r.dispensed_at ? new Date(r.dispensed_at).toLocaleDateString('en-IN') : '-'}</div>
                            <div className="text-[9px] text-slate-400">
                              {r.dispensed_at ? new Date(r.dispensed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-900">
                            {r.invoice_no}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900">{r.patient_name || 'Cash Customer'}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              <span>{r.patient_address || 'Ghoti'}</span>
                              {r.patient_mobile && r.patient_mobile !== '-' && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">{r.patient_mobile}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-indigo-900 flex items-center gap-1">
                              <Stethoscope className="w-3 h-3 text-indigo-600" />
                              <span>Dr. {r.doctor_name || 'Registered Physician'}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Reg: <b className="text-slate-700">{r.doctor_reg_no || 'MMC-ON-FILE'}</b>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{r.medicine_name}</div>
                            {r.generic_salt && (
                              <div className="text-[10px] text-slate-500 truncate max-w-xs font-normal">
                                {r.generic_salt}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                            {r.batch_no}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {r.expiry_date}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {r.qty} {r.is_loose_tablet ? 'T' : 'S'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                            ₹{Number(r.total_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="h-6 border-b border-dashed border-slate-300 flex items-end justify-center text-[9px] text-slate-400 italic">
                              Verified
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: GST 3B & 1 TAX HUB VIEW ("3, 18, 40 GST")                    */}
        {/* ==================================================================== */}
        {activeTab === 'gst_hub' && gstSummary && (
          <div className="space-y-4">
            {/* Period Selector & Action Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-700">Tax Filing Period:</span>
                <select
                  value={gstPeriod.month}
                  onChange={(e) => setGstPeriod({ ...gstPeriod, month: parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {[
                    { m: 1, name: 'January' },
                    { m: 2, name: 'February' },
                    { m: 3, name: 'March' },
                    { m: 4, name: 'April' },
                    { m: 5, name: 'May' },
                    { m: 6, name: 'June' },
                    { m: 7, name: 'July' },
                    { m: 8, name: 'August' },
                    { m: 9, name: 'September' },
                    { m: 10, name: 'October' },
                    { m: 11, name: 'November' },
                    { m: 12, name: 'December' }
                  ].map((item) => (
                    <option key={item.m} value={item.m}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <select
                  value={gstPeriod.year}
                  onChange={(e) => setGstPeriod({ ...gstPeriod, year: parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 font-mono"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>

                <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
                  {gstSummary.period.startDate} to {gstSummary.period.endDate}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={loadGstTaxSummary}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handlePrintGstSummary}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print CA Statement</span>
                </button>

                <button
                  onClick={handleExportGstCsv}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export GSTR-3B CSV</span>
                </button>
              </div>
            </div>

            {/* "40 GST" - AGGREGATE ANNUAL TURNOVER LIMIT TRACKER */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-2xl border border-slate-700 shadow-md space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase font-mono">
                      "40 GST" TRACKER
                    </span>
                    <h2 className="text-sm font-bold tracking-tight text-white">
                      Section 22 ₹40.00 Lakhs Annual Turnover Exemption Meter
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Under CGST Act, pharmacies supplying goods in Maharashtra have a mandatory GST registration threshold of ₹40 Lakhs per fiscal year ({gstSummary.turnoverTracker.fyLabel}).
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase font-mono ${
                      gstSummary.turnoverTracker.status === 'EXCEEDED'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : gstSummary.turnoverTracker.status === 'WARNING'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {gstSummary.turnoverTracker.status === 'EXCEEDED'
                      ? 'Threshold Exceeded (Mandatory Reg)'
                      : gstSummary.turnoverTracker.status === 'WARNING'
                      ? 'Approaching ₹40L Limit (Warning)'
                      : 'Safe Exemption Zone (< ₹40L)'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">
                    Billed FY Turnover: <b className="text-white text-sm">₹{gstSummary.turnoverTracker.annualTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
                  </span>
                  <span className="text-slate-300">
                    Remaining Limit: <b className="text-emerald-300">₹{gstSummary.turnoverTracker.remainingAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
                  </span>
                  <span className="font-bold text-amber-300">
                    {gstSummary.turnoverTracker.turnoverPercentage}% Used
                  </span>
                </div>

                <div className="w-full bg-slate-700/80 rounded-full h-3 overflow-hidden border border-slate-600">
                  <div
                    className={`h-full transition-all duration-500 ${
                      gstSummary.turnoverTracker.status === 'EXCEEDED'
                        ? 'bg-rose-500'
                        : gstSummary.turnoverTracker.status === 'WARNING'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, gstSummary.turnoverTracker.turnoverPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* GSTR-3B 4-BOX RECONCILIATION SUMMARY */}
            <div className="grid grid-cols-4 gap-3.5">
              {/* Box A: Outward Sales Tax */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    1. Outward Supplies (Sales)
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono">
                    Table 3.1
                  </span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono">
                  ₹{gstSummary.outward.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span className="font-semibold text-slate-800">₹{gstSummary.outward.taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output CGST:</span>
                    <span>₹{gstSummary.outward.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output SGST:</span>
                    <span>₹{gstSummary.outward.sgst.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Box B: Inward Eligible ITC */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    2. Inward ITC (Purchases)
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono">
                    Table 4(A)
                  </span>
                </div>
                <div className="text-xl font-extrabold text-emerald-700 font-mono">
                  ₹{gstSummary.inward.totalItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                  <div className="flex justify-between">
                    <span>Gross Inward:</span>
                    <span className="font-semibold text-slate-800">₹{gstSummary.inward.grossPurchases.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inward CGST ITC:</span>
                    <span>₹{gstSummary.inward.cgstItc.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inward SGST ITC:</span>
                    <span>₹{gstSummary.inward.sgstItc.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Box C: ITC Reversals (Returns) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    3. ITC Reversals (Returns)
                  </span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-mono">
                    Sec 34 / 4(B)
                  </span>
                </div>
                <div className="text-xl font-extrabold text-rose-700 font-mono">
                  -₹{gstSummary.itcReversals.totalReversedItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                  <div className="flex justify-between">
                    <span>Reversed Taxable:</span>
                    <span className="font-semibold text-slate-800">₹{gstSummary.itcReversals.taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reversed CGST:</span>
                    <span>₹{gstSummary.itcReversals.reversedCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reversed SGST:</span>
                    <span>₹{gstSummary.itcReversals.reversedSgst.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Box D: Net Tax Position */}
              <div
                className={`p-4 rounded-2xl border shadow-xs space-y-2 ${
                  gstSummary.netPosition.netGstPayable > 0
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-emerald-50/70 border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                    4. Net Position (Tax / Credit)
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      gstSummary.netPosition.netGstPayable > 0
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {gstSummary.netPosition.netGstPayable > 0 ? 'Tax Payable' : 'ITC Balance'}
                  </span>
                </div>

                <div className="text-xl font-extrabold font-mono">
                  {gstSummary.netPosition.netGstPayable > 0 ? (
                    <span className="text-amber-900">
                      ₹{gstSummary.netPosition.netGstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-emerald-800">
                      ₹{gstSummary.netPosition.itcCreditCarriedForward.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-600 pt-1 border-t border-slate-200 font-mono">
                  <div className="flex justify-between">
                    <span>Net ITC Available:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{gstSummary.netPosition.netEligibleItc.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Output GST:</span>
                    <span>₹{gstSummary.netPosition.totalOutputTax.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-0.5">
                    {gstSummary.netPosition.netGstPayable > 0
                      ? 'Net liability to pay in cash via Challan (PMT-06)'
                      : 'Carried forward to next month (No cash tax required)'}
                  </div>
                </div>
              </div>
            </div>

            {/* SLAB-WISE TAX BREAKDOWN MATRIX */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 tracking-wide uppercase">
                  GST SLAB-WISE RECONCILIATION MATRIX (0%, 5%, 12%, 18%)
                </span>
                <span className="text-[11px] text-slate-500">
                  Ready statement for CA / Tax Practitioner reconciliation
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-20">Rate Slab</th>
                      <th className="py-2.5 px-3 text-right">Outward Taxable</th>
                      <th className="py-2.5 px-3 text-right">Output CGST</th>
                      <th className="py-2.5 px-3 text-right">Output SGST</th>
                      <th className="py-2.5 px-3 text-right">Total Output Tax</th>
                      <th className="py-2.5 px-3 text-right">Inward Taxable</th>
                      <th className="py-2.5 px-3 text-right">Eligible ITC</th>
                      <th className="py-2.5 px-3 text-right">ITC Reversed</th>
                      <th className="py-2.5 px-3 text-right font-bold">Net Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {[0, 5, 12, 18].map((slab) => {
                      const out = gstSummary.outward.slabs[slab] || { taxable: 0, cgst: 0, sgst: 0, total_tax: 0 };
                      const inw = gstSummary.inward.slabs[slab] || { taxable: 0, cgst: 0, sgst: 0, total_tax: 0 };
                      const rev = gstSummary.itcReversals.slabs[slab] || { taxable: 0, cgst: 0, sgst: 0, total_tax: 0 };
                      const netItc = Math.max(0, inw.total_tax - rev.total_tax);
                      const netDiff = out.total_tax - netItc;

                      return (
                        <tr key={slab} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                              {slab}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">₹{out.taxable.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">₹{out.cgst.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">₹{out.sgst.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{out.total_tax.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">₹{inw.taxable.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">₹{inw.total_tax.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-700">₹{rev.total_tax.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            {netDiff > 0 ? (
                              <span className="text-amber-800">Pay: ₹{netDiff.toFixed(2)}</span>
                            ) : (
                              <span className="text-emerald-700">Credit: ₹{Math.abs(netDiff).toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-3">TOTAL</td>
                      <td className="py-3 px-3 text-right">₹{gstSummary.outward.taxableValue.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">₹{gstSummary.outward.cgst.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">₹{gstSummary.outward.sgst.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-900">₹{gstSummary.outward.totalTax.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">₹{gstSummary.inward.taxableValue.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700">₹{gstSummary.inward.totalItc.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-rose-700">₹{gstSummary.itcReversals.totalReversedItc.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">
                        {gstSummary.netPosition.netGstPayable > 0 ? (
                          <span className="text-amber-900">₹{gstSummary.netPosition.netGstPayable.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-700">₹{gstSummary.netPosition.itcCreditCarriedForward.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
