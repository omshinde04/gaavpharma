import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  FileText,
  DollarSign,
  Printer,
  Calendar,
  Building2,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function ExpiryRadar() {
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
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-slate-900">
              🚨 Expiry Loss Radar & Stock Protection
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify short-expiry medicines early and return them to distributors before value write-off.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadRadar}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Radar</span>
          </button>

          <button
            onClick={() => setShowReturnSlip(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Distributor Return Slip</span>
          </button>
        </div>
      </div>

      {/* Main Radar Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total At Risk */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Capital At Risk
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
              ₹{radarData.metrics.totalAtRiskLoss?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Based on purchase rate (PTR)
            </div>
          </div>

          {/* Critical <30 Days */}
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-red-700 uppercase tracking-wider">
              <span>Critical (&lt; 30 Days)</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-red-700 mt-1">
              {radarData.metrics.criticalCount} <span className="text-sm font-semibold">batches</span>
            </div>
            <div className="text-[11px] font-mono font-bold text-red-600 mt-1">
              ₹{radarData.metrics.totalCriticalLoss?.toLocaleString('en-IN')} immediate loss
            </div>
          </div>

          {/* Warning <90 Days */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
              <span>Warning (&lt; 90 Days)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-800 mt-1">
              {radarData.metrics.warningCount} <span className="text-sm font-semibold">batches</span>
            </div>
            <div className="text-[11px] font-mono font-bold text-amber-700 mt-1">
              ₹{radarData.metrics.totalWarningLoss?.toLocaleString('en-IN')} exposure
            </div>
          </div>

          {/* Safe Stock */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <span>Safe Stock (&gt; 90 Days)</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-800 mt-1">
              {radarData.metrics.safeCount} <span className="text-sm font-semibold">batches</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Healthy shelf life
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-semibold">
          <span className="text-slate-400 pl-2 pr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: `All Batches (${radarData.batches.length})` },
            { id: 'critical', label: `🔴 Critical < 30 Days (${radarData.metrics.criticalCount})` },
            { id: 'warning', label: `🟡 Warning < 90 Days (${radarData.metrics.warningCount})` },
            { id: 'safe', label: `🟢 Safe Stock (${radarData.metrics.safeCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* High Density Expiry Radar Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-bold">
                <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                <th className="py-2.5 px-3.5 min-w-[200px]">Medicine / Item</th>
                <th className="py-2.5 px-3.5 w-32">Rack</th>
                <th className="py-2.5 px-3.5 w-28">Batch No</th>
                <th className="py-2.5 px-3.5 w-28">Expiry (MM/YY)</th>
                <th className="py-2.5 px-3.5 w-36">Radar Status</th>
                <th className="py-2.5 px-3.5 w-24 text-right">In Stock</th>
                <th className="py-2.5 px-3.5 w-28 text-right">PTR (₹)</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Potential Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {displayedBatches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-sans">
                    No batches match the selected filter.
                  </td>
                </tr>
              ) : (
                displayedBatches.map((b, idx) => {
                  let badge = (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 Safe (&gt;90d)
                    </span>
                  );
                  if (b.status === 'critical') {
                    badge = (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 animate-pulse">
                        🔴 &lt; 30 Days Exp
                      </span>
                    );
                  } else if (b.status === 'warning') {
                    badge = (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        🟡 &lt; 90 Days Exp
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        b.status === 'critical' ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-bold text-slate-900 leading-tight">
                          {b.product_name}
                        </div>
                        {b.generic_salt && (
                          <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                            {b.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="rack-chip">📍 {b.rack_location || 'General'}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-800">{b.batch_no}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{b.expiry_date}</td>
                      <td className="py-2.5 px-3.5">{badge}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        {b.stock_qty}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-700">
                        ₹{Number(b.purchase_rate || b.mrp * 0.7).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-red-600 text-sm">
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Distributor Expiry Return Slip</h3>
                <p className="text-xs text-slate-400">
                  Credit note request for short-expiry batches
                </p>
              </div>
              <button
                onClick={() => setShowReturnSlip(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Slip Settings */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700">Select Distributor:</span>
                <select
                  value={selectedDistributor}
                  onChange={(e) => setSelectedDistributor(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800"
                >
                  {distributors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} (Ph: {d.phone || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-slate-600 font-mono">
                Date: <b>{new Date().toLocaleDateString('en-IN')}</b>
              </div>
            </div>

            {/* Printable Return Slip Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="p-4 bg-white border border-slate-300 rounded-lg font-mono text-xs space-y-3">
                <div className="text-center border-b pb-2 space-y-0.5">
                  <div className="font-bold text-sm uppercase">Anand Medical & General Stores</div>
                  <div className="text-[11px] text-slate-600">
                    Expiry Return Debit Memo / Replacement Request
                  </div>
                  <div className="text-[10px] text-slate-500">
                    To: <b>{selectedDistributor}</b>
                  </div>
                </div>

                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b font-bold text-slate-700">
                      <th className="py-1">#</th>
                      <th className="py-1">Product</th>
                      <th className="py-1">Batch</th>
                      <th className="py-1">Exp</th>
                      <th className="py-1 text-right">Return Qty</th>
                      <th className="py-1 text-right">PTR Rate</th>
                      <th className="py-1 text-right">Credit Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item, idx) => (
                      <tr key={item.id} className="py-1">
                        <td className="py-1 text-slate-400">{idx + 1}</td>
                        <td className="py-1 font-semibold">{item.product_name}</td>
                        <td className="py-1">{item.batch_no}</td>
                        <td className="py-1 font-bold text-red-600">{item.expiry_date}</td>
                        <td className="py-1 text-right font-bold">{item.stock_qty}</td>
                        <td className="py-1 text-right">
                          ₹{Number(item.purchase_rate || item.mrp * 0.7).toFixed(2)}
                        </td>
                        <td className="py-1 text-right font-bold">
                          ₹{Number(item.potentialLoss).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t pt-2 flex justify-between font-bold text-xs">
                  <span>TOTAL RETURN VALUE TO BE CREDITED:</span>
                  <span className="text-emerald-800 text-sm">
                    ₹{Number(totalReturnValue).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowReturnSlip(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={handlePrintReturnSlip}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Return Memo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
