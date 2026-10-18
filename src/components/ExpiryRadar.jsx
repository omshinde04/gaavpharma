import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Printer,
  Calendar,
  Building2,
  Filter,
  RefreshCw,
  MapPin,
  TrendingDown,
  RotateCcw,
  MessageSquare,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function ExpiryRadar({ storeProfile }) {
  const [radarData, setRadarData] = useState({
    batches: [],
    critical: [],
    warning: [],
    safe: [],
    metrics: {
      criticalCount: 0,
      warningCount: 0,
      safeCount: 0,
      totalCriticalLoss: 0,
      totalWarningLoss: 0,
      totalAtRiskLoss: 0
    }
  });

  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'warning' | 'safe'
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState('');
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [returnBatches, setReturnBatches] = useState([]);
  const [returnReason, setReturnReason] = useState('EXPIRY_RETURN');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdDebitNoteResult, setCreatedDebitNoteResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRadar = async () => {
    setIsLoading(true);
    try {
      const [data, dists] = await Promise.all([
        api.getExpiryRadarData(),
        api.getDistributors()
      ]);
      setRadarData(data || { batches: [], critical: [], warning: [], safe: [], metrics: {} });
      setDistributors(dists || []);
      if (dists && dists.length > 0 && !selectedDistributorId) {
        setSelectedDistributorId(String(dists[0].id));
      }
    } catch (err) {
      console.error('Error loading expiry data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRadar();
  }, []);

  const displayedBatches = (radarData.batches || []).filter((b) => {
    if (filter === 'critical') return b.status === 'critical';
    if (filter === 'warning') return b.status === 'warning';
    if (filter === 'safe') return b.status === 'safe';
    return true;
  });

  const returnItems = (radarData.batches || []).filter(
    (b) => b.status === 'critical' || b.status === 'warning'
  );

  const handleInitiateReturn = (itemsToReturn) => {
    setCreatedDebitNoteResult(null);
    const prepared = itemsToReturn.map(b => ({
      batchId: b.id || b.batch_id,
      product_id: b.product_id || b.productId || b.prod_id,
      product_name: b.product_name || b.name,
      batch_no: b.batch_no,
      expiry_date: b.expiry_date,
      return_qty: b.stock_qty,
      max_qty: b.stock_qty,
      purchase_rate: b.purchase_rate || b.mrp * 0.7,
      gst_rate: b.gst_rate || 12
    }));
    setReturnBatches(prepared);
    setShowDebitModal(true);
  };

  const handleUpdateReturnQty = (idx, qty) => {
    setReturnBatches(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], return_qty: Math.min(copy[idx].max_qty, Math.max(1, parseInt(qty, 10) || 1)) };
      return copy;
    });
  };

  const handleUpdateGstRate = (idx, rate) => {
    setReturnBatches(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], gst_rate: parseFloat(rate) || 0 };
      return copy;
    });
  };

  const handleRemoveReturnBatch = (idx) => {
    setReturnBatches(prev => prev.filter((_, i) => i !== idx));
  };

  // Compute live GST and claim totals
  const computedTotals = returnBatches.reduce((acc, item) => {
    const qty = item.return_qty || 0;
    const rate = item.purchase_rate || 0;
    const taxable = qty * rate;
    const gstRate = item.gst_rate != null ? item.gst_rate : 12;
    const tax = taxable * (gstRate / 100);
    const total = taxable + tax;

    acc.taxable += taxable;
    acc.tax += tax;
    acc.totalClaim += total;
    acc.totalUnits += qty;
    return acc;
  }, { taxable: 0, tax: 0, totalClaim: 0, totalUnits: 0 });

  const handleIssueDebitNote = async (e) => {
    e.preventDefault();
    if (!selectedDistributorId) {
      alert('Please select a wholesale distributor.');
      return;
    }
    if (returnBatches.length === 0) {
      alert('Please select at least 1 medicine batch to return.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dist = distributors.find(d => d.id === Number(selectedDistributorId));
      const noteNo = `DN-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Date.now()).slice(-4)}`;

      const notePayload = {
        note_no: noteNo,
        distributor_id: Number(selectedDistributorId),
        note_date: new Date().toISOString().slice(0, 10),
        subtotal: computedTotals.taxable,
        tax_amount: computedTotals.tax,
        total_claim_amount: computedTotals.totalClaim,
        status: 'ISSUED',
        reason: returnReason,
        notes: returnNotes || `Expiry return claim from Expiry Radar`
      };

      const itemsPayload = returnBatches.map(b => {
        const taxable = b.return_qty * b.purchase_rate;
        const cgst = (taxable * (b.gst_rate / 2)) / 100;
        const sgst = (taxable * (b.gst_rate / 2)) / 100;
        return {
          product_id: b.product_id,
          product_name: b.product_name,
          batch_no: b.batch_no,
          expiry_date: b.expiry_date,
          qty: b.return_qty,
          purchase_rate: b.purchase_rate,
          gst_rate: b.gst_rate,
          taxable_amount: taxable,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: taxable + cgst + sgst
        };
      });

      const res = await api.createDebitNote(notePayload, itemsPayload);
      setCreatedDebitNoteResult(res);
      await loadRadar();
    } catch (err) {
      console.error('Failed to issue GST Debit Note:', err);
      alert('डेबिट नोट तयार करताना त्रुटी: ' + (err.message || 'Failed to issue GST Debit Note.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppDebitMemo = (dn) => {
    const phone = dn.distributor_phone?.replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) {
      alert('Distributor mobile number not found.');
      return;
    }
    const storeName = storeProfile?.store_name || 'Divya Medical Stores';
    const msg =
`*GST EXPIRY RETURN MEMO / DEBIT NOTE*
🏥 *${storeName}*
To: *${dn.distributor_name}*
📄 Note No: *#${dn.note_no}*
📅 Date: ${dn.note_date}
📦 Items: ${dn.items?.length || returnBatches.length} returned

💰 *Taxable PTR:* ₹${Number(dn.subtotal).toFixed(2)}
⚖️ *GST Reversal:* ₹${Number(dn.tax_amount).toFixed(2)}
🔴 *TOTAL CLAIM CREDITED:* *₹${Number(dn.total_claim_amount).toFixed(2)}*

_This debit claim is adjusted against supplier ledger under Sec 34 CGST Act._
Generated via GaavPharma Pharmacy ERP`;

    const encoded = encodeURIComponent(msg);
    api.openExternalUrl(`https://wa.me/91${phone}?text=${encoded}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none font-sans text-xs">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Expiry Risk Radar & GST Loss Prevention (मुदत संपणाऱ्या औषधांचे रडार)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitor approaching expiries and generate Section 34 GST Debit Notes before write-offs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadRadar}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleInitiateReturn(returnItems)}
            disabled={returnItems.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Issue GST Expiry Debit Note ({returnItems.length})</span>
          </button>
        </div>
      </div>

      {/* Main Radar Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* Total At Risk */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Capital Exposure
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              ₹{radarData.metrics.totalAtRiskLoss?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Calculated at purchase rate (PTR)
            </div>
          </div>

          {/* Critical <30 Days */}
          <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold text-rose-700 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Critical (&lt; 30 Days)
              </span>
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
              {radarData.metrics.criticalCount} <span className="text-xs font-normal text-slate-500">batches</span>
            </div>
            <div className="text-[10px] font-mono font-medium text-rose-600 mt-1">
              ₹{radarData.metrics.totalCriticalLoss?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} immediate risk
            </div>
          </div>

          {/* Warning <90 Days */}
          <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Warning (&lt; 90 Days)
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-1">
              {radarData.metrics.warningCount} <span className="text-xs font-normal text-slate-500">batches</span>
            </div>
            <div className="text-[10px] font-mono font-medium text-amber-700 mt-1">
              ₹{radarData.metrics.totalWarningLoss?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} return window
            </div>
          </div>

          {/* Safe Stock */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Safe Stock (&gt; 90 Days)
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
              {radarData.metrics.safeCount} <span className="text-xs font-normal text-slate-500">batches</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">
              Healthy shelf life
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs text-xs">
          <span className="text-slate-400 pl-2 pr-1 text-[11px] font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" /> View:
          </span>
          {[
            { id: 'all', label: `All Batches (${radarData.batches.length})` },
            { id: 'critical', label: `Critical (${radarData.metrics.criticalCount})` },
            { id: 'warning', label: `Warning (${radarData.metrics.warningCount})` },
            { id: 'safe', label: `Safe (${radarData.metrics.safeCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expiry Radar Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                <th className="py-2.5 px-3.5 min-w-[200px]">Medicine / Item</th>
                <th className="py-2.5 px-3.5 w-28">Rack</th>
                <th className="py-2.5 px-3.5 w-24">Batch No</th>
                <th className="py-2.5 px-3.5 w-24">Expiry</th>
                <th className="py-2.5 px-3.5 w-32">Status</th>
                <th className="py-2.5 px-3.5 w-20 text-right">In Stock</th>
                <th className="py-2.5 px-3.5 w-24 text-right">PTR Rate</th>
                <th className="py-2.5 px-3.5 w-28 text-right">Exposure (₹)</th>
                <th className="py-2.5 px-3.5 w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayedBatches.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400 font-sans">
                    No batches found matching the selected filter.
                  </td>
                </tr>
              ) : (
                displayedBatches.map((b, idx) => {
                  let badge = (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Safe (&gt;90d)
                    </span>
                  );
                  if (b.status === 'critical') {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        &lt; 30 Days Exp
                      </span>
                    );
                  } else if (b.status === 'warning') {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        &lt; 90 Days Exp
                      </span>
                    );
                  }

                  const isReturnable = b.status === 'critical' || b.status === 'warning';

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        b.status === 'critical' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-3.5 font-sans">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {b.product_name}
                        </div>
                        {b.generic_salt && (
                          <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs mt-0.5">
                            {b.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3.5 font-sans">
                        <span className="rack-chip">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {b.rack_location || 'General'}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-slate-700 font-bold">{b.batch_no}</td>
                      <td className="py-2 px-3.5 font-semibold text-slate-900">{b.expiry_date}</td>
                      <td className="py-2 px-3.5 font-sans">{badge}</td>
                      <td className="py-2 px-3.5 text-right font-medium text-slate-900">
                        {b.stock_qty}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-600">
                        ₹{Number(b.purchase_rate || b.mrp * 0.7).toFixed(2)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-bold text-slate-900">
                        ₹{Number(b.potentialLoss).toFixed(2)}
                      </td>
                      <td className="py-2 px-3.5 text-center font-sans">
                        {isReturnable ? (
                          <button
                            onClick={() => handleInitiateReturn([b])}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Safe</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: GST Expiry Debit Note Creator & Voucher Generator */}
      {showDebitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">GST Expiry Debit Note (माल परतावा व क्रेडिट नोट)</h3>
                  <p className="text-[10px] text-slate-400">
                    Section 34 CGST Act: Reverse input tax and deduct claim from supplier ledger
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDebitModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Already Issued, Show Success Screen */}
            {createdDebitNoteResult ? (
              <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    GST Debit Note #{createdDebitNoteResult.note_no} Issued Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Total ₹{Number(createdDebitNoteResult.total_claim_amount).toFixed(2)} credited against your supplier debt in the Distributor Ledger.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-xs max-w-md mx-auto space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-bold text-slate-900 font-sans">{createdDebitNoteResult.distributor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable PTR Return:</span>
                    <span>₹{Number(createdDebitNoteResult.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GST Reversal (CGST+SGST):</span>
                    <span>₹{Number(createdDebitNoteResult.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-sm">
                    <span className="text-rose-700">Total Claim Credited:</span>
                    <span className="text-rose-700">₹{Number(createdDebitNoteResult.total_claim_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Print Delivery Voucher</span>
                  </button>
                  <button
                    onClick={() => sendWhatsAppDebitMemo(createdDebitNoteResult)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Return Memo</span>
                  </button>
                  <button
                    onClick={() => setShowDebitModal(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Creation Form */
              <form onSubmit={handleIssueDebitNote} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-3 text-xs shrink-0">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Return To Stockist / Distributor *</label>
                    <select
                      value={selectedDistributorId}
                      onChange={(e) => setSelectedDistributorId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      required
                    >
                      <option value="">Select Stockist</option>
                      {distributors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''} — Current Debt: ₹{Number(d.pending_balance || 0).toFixed(0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Return Reason</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                    >
                      <option value="EXPIRY_RETURN">Near-Expiry / Expired Return</option>
                      <option value="BREAKAGE">Breakage / Leaked in Transit</option>
                      <option value="BATCH_RECALL">Manufacturer Batch Recall</option>
                    </select>
                  </div>
                </div>

                {/* Items to Return Table */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3 min-w-[160px] font-sans">Medicine</th>
                          <th className="py-2 px-3">Batch</th>
                          <th className="py-2 px-3">Exp</th>
                          <th className="py-2 px-3 text-right">Return Qty</th>
                          <th className="py-2 px-3 text-right">PTR</th>
                          <th className="py-2 px-3 text-center">GST %</th>
                          <th className="py-2 px-3 text-right">Taxable</th>
                          <th className="py-2 px-3 text-right">Total Claim</th>
                          <th className="py-2 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {returnBatches.map((item, idx) => {
                          const taxable = item.return_qty * item.purchase_rate;
                          const total = taxable * (1 + (item.gst_rate || 12) / 100);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">{item.product_name}</td>
                              <td className="py-2 px-3 font-bold">{item.batch_no}</td>
                              <td className="py-2 px-3 text-rose-600 font-semibold">{item.expiry_date}</td>
                              <td className="py-1 px-2 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  max={item.max_qty}
                                  value={item.return_qty}
                                  onChange={(e) => handleUpdateReturnQty(idx, e.target.value)}
                                  className="w-16 border border-slate-200 rounded p-1 text-right font-bold"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">₹{Number(item.purchase_rate).toFixed(2)}</td>
                              <td className="py-1 px-2 text-center">
                                <select
                                  value={item.gst_rate}
                                  onChange={(e) => handleUpdateGstRate(idx, e.target.value)}
                                  className="border border-slate-200 rounded p-1 text-center"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-right font-medium">₹{taxable.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold text-rose-700">₹{total.toFixed(2)}</td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReturnBatch(idx)}
                                  className="text-slate-300 hover:text-rose-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Totals & Action */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 font-mono text-xs">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Taxable Return:</span>
                      <span className="font-bold text-sm text-slate-200">₹{computedTotals.taxable.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">GST Reversal:</span>
                      <span className="font-bold text-sm text-emerald-400">₹{computedTotals.tax.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Net Claim (आपले देणे कमी):</span>
                      <span className="font-bold text-base text-rose-400">₹{computedTotals.totalClaim.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDebitModal(false)}
                      className="px-3.5 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || returnBatches.length === 0}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Issuing...' : 'Save & Issue GST Debit Note'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
