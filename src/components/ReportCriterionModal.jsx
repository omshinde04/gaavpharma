import React, { useState, useEffect, useRef } from 'react';
import {
  Filter,
  Search,
  Calendar,
  X,
  Printer,
  Download,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  Tag
} from 'lucide-react';
import { api } from '../services/api';

export default function ReportCriterionModal({
  isOpen,
  onClose,
  storeProfile = null
}) {
  const [saleType, setSaleType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('ALL');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const searchInputRef = useRef(null);

  const fetchFilteredReport = async () => {
    setLoading(true);
    try {
      const result = await api.getUniversalReportCriterion({
        saleType,
        searchQuery,
        company,
        category,
        startDate,
        endDate
      });
      setReportResult(result);
    } catch (err) {
      console.error('Failed to run universal criterion filter:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFilteredReport();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleReset = () => {
    setSaleType('ALL');
    setSearchQuery('');
    setCompany('');
    setCategory('ALL');
    setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportResult || !reportResult.rows || reportResult.rows.length === 0) {
      alert('एक्सपोर्ट करण्यासाठी कोणताही डेटा उपलब्ध नाही.');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Type',
      'Customer',
      'Doctor',
      'Medicine',
      'Batch',
      'Qty',
      'Rate',
      'Total'
    ];
    const rows = reportResult.rows.map((r) => [
      r.invoice_no,
      r.invoice_date,
      r.invoice_type || 'RETAIL',
      `"${r.customer_name || ''}"`,
      `"${r.doctor_name || ''}"`,
      `"${r.product_name || ''}"`,
      r.batch_no || '',
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
    link.setAttribute('download', `GaavPharma_Report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'F5' || (e.key === 'Enter' && e.target.tagName !== 'BUTTON')) {
        e.preventDefault();
        fetchFilteredReport();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleReset();
      } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saleType, searchQuery, company, category, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Filter size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  निकष व्याख्या व फिल्टर (Define Criterion - Universal Search)
                </h2>
                <span className="text-[11px] font-semibold text-indigo-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Photo 21 Parity (Alt+C)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                विक्री प्रकार, कंपनी, सॉल्ट, औषध वर्ग व दिनांकानुसार अचूक फिल्टर
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls (Photo 21 Layout) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Sale Type */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">विक्री प्रकार (Sale Type):</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">सर्व विक्री (All Sales)</option>
                <option value="CASH">रोख विक्री (Cash Sale)</option>
                <option value="KHATA">उधारी विक्री (Khata Credit)</option>
                <option value="UPI">UPI / QR ऑनलाईन</option>
                <option value="HOSPITAL_SUPPLY">हॉस्पिटल पुरवठा (PTR Rate)</option>
                <option value="DOCTOR_SAMPLE">डॉक्टर सॅम्पल (Free / ₹0)</option>
                <option value="BREAKAGE_OUTWARD">काऊंटर फुटतूट (Breakage)</option>
              </select>
            </div>

            {/* Product / Salt Search */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">औषध / सॉल्ट (Search):</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="नाव, सॉल्ट, बॅच, ग्राहक..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Company / Brand */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">कंपनी / ब्रँड (Company):</label>
              <div className="relative">
                <Building size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="उदा. Cipla, Alkem, Mankind..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Drug Group / Category */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">औषध वर्ग (Drug Group):</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">सर्व वर्ग (All Groups)</option>
                <option value="tablets">Tablets (गोळ्या)</option>
                <option value="capsules">Capsules (कॅप्सूल)</option>
                <option value="syrups">Syrups (सिरप)</option>
                <option value="injections">Injections (इंजेक्शन्स)</option>
                <option value="drops">Drops (थेंब)</option>
                <option value="ointments">Ointments (मलम)</option>
                <option value="generics">Generics (जेनेरिक)</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">सुरूवातीचा दिनांक (From):</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">शेवटचा दिनांक (To):</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="sm:col-span-2 flex items-end gap-2">
              <button
                onClick={fetchFilteredReport}
                disabled={loading}
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm text-xs"
              >
                <Search size={14} />
                {loading ? 'शोधत आहे...' : 'फिल्टर लागू करा (F5)'}
              </button>
              <button
                onClick={handleReset}
                className="py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1 text-xs"
              >
                <RotateCcw size={14} />
                रिसेट (F2)
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-4">
            <span>
              एकूण नोंदी:{' '}
              <strong className="text-slate-900 font-mono">
                {reportResult?.total_records || 0}
              </strong>
            </span>
            <span>
              बिले संख्या:{' '}
              <strong className="text-slate-900 font-mono">
                {reportResult?.total_invoices || 0}
              </strong>
            </span>
            <span>
              एकूण नग (Qty):{' '}
              <strong className="text-slate-900 font-mono">
                {reportResult?.grand_total_qty || 0}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>
              एकूण रक्कम:{' '}
              <strong className="text-emerald-700 text-sm font-bold font-mono">
                ₹ {(reportResult?.grand_total_amount || 0).toFixed(2)}
              </strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 text-[11px]"
              >
                <Download size={13} />
                CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 text-[11px]"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {!reportResult || reportResult.rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              निवडलेल्या निकषांनुसार कोणत्याही नोंदी आढळल्या नाहीत.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">बिल क्र.</th>
                    <th className="p-2.5">दिनांक</th>
                    <th className="p-2.5">प्रकार</th>
                    <th className="p-2.5">ग्राहक / डॉक्टर</th>
                    <th className="p-2.5">औषधाचे नाव व सॉल्ट</th>
                    <th className="p-2.5">बॅच व मुदत</th>
                    <th className="p-2.5 text-right">नग (Qty)</th>
                    <th className="p-2.5 text-right">दर (Rate)</th>
                    <th className="p-2.5 text-right">रक्कम</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportResult.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{r.invoice_no}</td>
                      <td className="p-2.5 text-slate-600">{r.invoice_date}</td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            r.invoice_type === 'DOCTOR_SAMPLE'
                              ? 'bg-rose-100 text-rose-800'
                              : r.invoice_type === 'HOSPITAL_SUPPLY'
                              ? 'bg-purple-100 text-purple-800'
                              : r.invoice_type === 'BREAKAGE_OUTWARD'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.invoice_type || 'RETAIL'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-800">{r.customer_name}</div>
                        {r.doctor_name && (
                          <div className="text-[10px] text-slate-500">Dr. {r.doctor_name}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{r.product_name}</div>
                        {r.generic_salt && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">
                            {r.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-700">
                        {r.batch_no} <span className="text-slate-400">({r.expiry_date})</span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">{r.qty}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        ₹ {(r.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                        ₹ {(r.total_price || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                F5
              </kbd>{' '}
              फिल्टर करा
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                F2
              </kbd>{' '}
              रिसेट
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                Ctrl+P
              </kbd>{' '}
              प्रिंट
            </span>
          </div>
          <div>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">
                Esc
              </kbd>{' '}
              बंद करा
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
