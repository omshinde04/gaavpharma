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
  TrendingDown
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
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [showReturnSlip, setShowReturnSlip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadRadar = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExpiryRadarData();
      const dists = await api.getDistributors();
      setRadarData(data);
      setDistributors(dists || []);
      if (dists && dists.length > 0) {
        setSelectedDistributor(dists[0].name);
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
  const totalReturnValue = returnItems.reduce((acc, b) => acc + (b.potentialLoss || 0), 0);

  const handlePrintReturnSlip = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Expiry Risk Radar & Loss Prevention
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitor approaching expiries and generate distributor credit note memos before write-offs.
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
            onClick={() => setShowReturnSlip(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generate Distributor Return Slip</span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
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
                <th className="py-2.5 px-3.5 w-32">Rack</th>
                <th className="py-2.5 px-3.5 w-28">Batch No</th>
                <th className="py-2.5 px-3.5 w-28">Expiry (MM/YY)</th>
                <th className="py-2.5 px-3.5 w-36">Radar Status</th>
                <th className="py-2.5 px-3.5 w-24 text-right">In Stock</th>
                <th className="py-2.5 px-3.5 w-28 text-right">PTR Rate</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Exposure Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayedBatches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-sans">
                    No batches found matching the selected filter.
                  </td>
                </tr>
              ) : (
                displayedBatches.map((b, idx) => {
                  let badge = (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Safe (&gt;90d)
                    </span>
                  );
                  if (b.status === 'critical') {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        &lt; 30 Days Exp
                      </span>
                    );
                  } else if (b.status === 'warning') {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        &lt; 90 Days Exp
                      </span>
                    );
                  }

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
                      <td className="py-2 px-3.5 text-slate-700">{b.batch_no}</td>
                      <td className="py-2 px-3.5 font-semibold text-slate-900">{b.expiry_date}</td>
                      <td className="py-2 px-3.5 font-sans">{badge}</td>
                      <td className="py-2 px-3.5 text-right font-medium text-slate-900">
                        {b.stock_qty}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-600">
                        ₹{Number(b.purchase_rate || b.mrp * 0.7).toFixed(2)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-semibold text-slate-900">
                        ₹{Number(b.potentialLoss).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distributor Return Slip Modal */}
      {showReturnSlip && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Distributor Expiry Return Memo</h3>
                <p className="text-[11px] text-slate-400">
                  Debit note credit request for short-expiry batches
                </p>
              </div>
              <button
                onClick={() => setShowReturnSlip(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Slip Settings */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-slate-700">Distributor:</span>
                <select
                  value={selectedDistributor}
                  onChange={(e) => setSelectedDistributor(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800"
                >
                  {distributors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Date: {new Date().toLocaleDateString('en-IN')}
              </div>
            </div>

            {/* Formal Return Memo */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="p-4 bg-white border border-slate-200 rounded-lg font-mono text-xs space-y-3">
                <div className="text-center border-b pb-2 space-y-0.5">
                  <div className="font-bold text-xs uppercase tracking-wide">
                    {storeProfile?.store_name || 'Retail Pharmacy & General Stores'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Expiry Return Debit Memo / Replacement Request
                  </div>
                  <div className="text-[11px] text-slate-700 pt-1">
                    To: <b>{selectedDistributor}</b>
                  </div>
                </div>

                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b font-semibold text-slate-600">
                      <th className="py-1">#</th>
                      <th className="py-1">Product</th>
                      <th className="py-1">Batch</th>
                      <th className="py-1">Exp</th>
                      <th className="py-1 text-right">Return Qty</th>
                      <th className="py-1 text-right">PTR Rate</th>
                      <th className="py-1 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item, idx) => (
                      <tr key={item.id} className="py-1">
                        <td className="py-1 text-slate-400">{idx + 1}</td>
                        <td className="py-1 font-sans font-medium text-slate-900">{item.product_name}</td>
                        <td className="py-1">{item.batch_no}</td>
                        <td className="py-1 font-semibold text-rose-600">{item.expiry_date}</td>
                        <td className="py-1 text-right font-medium">{item.stock_qty}</td>
                        <td className="py-1 text-right">
                          ₹{Number(item.purchase_rate || item.mrp * 0.7).toFixed(2)}
                        </td>
                        <td className="py-1 text-right font-semibold">
                          ₹{Number(item.potentialLoss).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t pt-2 flex justify-between font-bold text-xs">
                  <span>TOTAL RETURN AMOUNT TO BE CREDITED:</span>
                  <span className="text-emerald-700 font-mono">
                    ₹{Number(totalReturnValue).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowReturnSlip(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handlePrintReturnSlip}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Return Memo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
