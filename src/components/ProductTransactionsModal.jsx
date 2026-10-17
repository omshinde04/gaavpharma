import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Layers,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  Calendar,
  Filter,
  Printer,
  RefreshCw,
  Search,
  ArrowUpDown,
  Building2,
  User,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function ProductTransactionsModal({ productId, productName, initialBatchId = null, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || '');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, PURCHASE, SALE, DEBIT_NOTE_RETURN, SALES_RETURN
  const [searchDoc, setSearchDoc] = useState('');

  useEffect(() => {
    if (isOpen && productId) {
      loadLedger(productId, selectedBatchId);
    }
  }, [isOpen, productId, selectedBatchId]);

  // Keyboard navigation: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        loadLedger(productId, selectedBatchId);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, productId, selectedBatchId, onClose]);

  const loadLedger = async (pId, bId) => {
    try {
      setLoading(true);
      const res = await api.getProductTransactions(pId, bId || null);
      setData(res);
    } catch (err) {
      console.error('Failed to load product transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const product = data?.product || {};
  const batches = data?.batches || [];
  let transactions = data?.transactions || [];

  if (typeFilter !== 'ALL') {
    transactions = transactions.filter((tx) => tx.type === typeFilter);
  }

  if (searchDoc.trim()) {
    const q = searchDoc.trim().toLowerCase();
    transactions = transactions.filter(
      (tx) =>
        (tx.doc_no && tx.doc_no.toLowerCase().includes(q)) ||
        (tx.party_name && tx.party_name.toLowerCase().includes(q)) ||
        (tx.batch_no && tx.batch_no.toLowerCase().includes(q))
    );
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <TrendingUp className="w-3 h-3 text-emerald-600" /> खरेदी (PURCHASE)
          </span>
        );
      case 'SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <TrendingDown className="w-3 h-3 text-blue-600" /> विक्री (SALE)
          </span>
        );
      case 'DEBIT_NOTE_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Layers className="w-3 h-3 text-amber-600" /> एक्सपायरी डेबिट (DEBIT)
          </span>
        );
      case 'SALES_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <PackageCheck className="w-3 h-3 text-purple-600" /> ग्राहक रिटर्न (RETURN)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  औषध स्टॉक व ट्रॅन्झॅक्शन लेजर (Item Stock Ledger)
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                  MediVision Parity Photo 16
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                खरेदी, विक्री, सप्लायर डेबिट नोट्स आणि ग्राहक रिटर्न्सची पूर्ण ऐतिहासिक नोंदवही
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="प्रिंट लेजर रिपोर्ट (Ctrl+P)"
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> प्रिंट
            </button>
            <button
              onClick={() => loadLedger(productId, selectedBatchId)}
              disabled={loading}
              title="रिफ्रेश करा (F5)"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="बंद करा (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product Details Banner */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="col-span-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">औषधाचे नाव (Product)</div>
            <div className="text-base font-extrabold text-slate-900 truncate">
              {product.name || productName || 'औषध'}
            </div>
            {product.generic_salt && (
              <div className="text-slate-500 font-medium text-[11px] truncate">
                {product.generic_salt}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">रॅक / जागा (Rack)</div>
            <div className="font-bold text-slate-800">{product.rack_location || 'Rack A-1'}</div>
            <div className="text-[11px] text-slate-500">प्रकार: {product.category || 'Medicine'}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">पॅकिंग / स्ट्रिप (Strip Size)</div>
            <div className="font-bold text-slate-800">{product.strip_size || 10} गोळ्या/नग</div>
            <div className="text-[11px] text-slate-500">अलर्ट: {product.min_stock_alert || 5} पेक्षा कमी</div>
          </div>
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 flex flex-col justify-center">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">एकूण उपलब्ध स्टॉक</div>
            <div className="text-xl font-black text-blue-900">
              {product.total_stock ?? 0} <span className="text-xs font-semibold text-blue-700">Units</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Batch Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> बॅच निवडा:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">सर्व बॅचेस (All Batches)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_no} (Exp: {b.expiry_date} | शिल्लक: {b.stock_qty})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm text-xs font-bold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              सर्व ({data?.transactions?.length || 0})
            </button>
            <button
              onClick={() => setTypeFilter('PURCHASE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'PURCHASE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              खरेदी (Inward)
            </button>
            <button
              onClick={() => setTypeFilter('SALE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'SALE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              विक्री (Sales)
            </button>
            <button
              onClick={() => setTypeFilter('DEBIT_NOTE_RETURN')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'DEBIT_NOTE_RETURN'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              डेबिट नोट्स
            </button>
            <button
              onClick={() => setTypeFilter('SALES_RETURN')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'SALES_RETURN'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              ग्राहक रिटर्न्स
            </button>
          </div>

          {/* Search Voucher / Party */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="बिल / पावती क्र. किंवा ग्राहक शोधा..."
              value={searchDoc}
              onChange={(e) => setSearchDoc(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 sm:w-64 shadow-sm"
            />
          </div>
        </div>

        {/* KPI Mini Strip */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 grid grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">एकूण आवक (+In)</div>
              <div className="text-sm font-black text-emerald-700">+{data?.totalIn || 0} Units</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">एकूण जावक (-Out)</div>
              <div className="text-sm font-black text-blue-700">-{data?.totalOut || 0} Units</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">निव्वळ फरक (In - Out)</div>
              <div className="text-sm font-black text-indigo-700">
                {(data?.totalIn || 0) - (data?.totalOut || 0)} Units
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">एकूण नोंदी (Transactions)</div>
              <div className="text-sm font-black text-slate-800">{transactions.length} Records</div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-semibold">लेजर नोंदी लोड होत आहेत...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">कोणत्याही लेजर नोंदी आढळल्या नाहीत</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                या औषधासाठी निवडलेल्या बॅच किंवा फिल्टरनुसार कोणतीही खरेदी, विक्री किंवा रिटर्न नोंद उपलब्ध नाही.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">तारीख</th>
                    <th className="py-2.5 px-3">प्रकार</th>
                    <th className="py-2.5 px-3">पावती / बिल क्र.</th>
                    <th className="py-2.5 px-3">ग्राहक / सप्लायर</th>
                    <th className="py-2.5 px-3">बॅच क्र.</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">आवक (+In)</th>
                    <th className="py-2.5 px-3 text-right text-blue-700">जावक (-Out)</th>
                    <th className="py-2.5 px-3 text-right">दर (₹)</th>
                    <th className="py-2.5 px-3 text-right">रक्कम (₹)</th>
                    <th className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-200/50">
                      शिल्लक (Balance)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map((tx, idx) => (
                    <tr
                      key={tx.id || idx}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {tx.date || (tx.created_at ? tx.created_at.slice(0, 10) : '—')}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{getTypeBadge(tx.type)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {tx.doc_no || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold max-w-[160px] truncate">
                        {tx.party_name || 'Counter Customer'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{tx.batch_no || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        {tx.in_qty > 0 ? `+${tx.in_qty}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-blue-700">
                        {tx.out_qty > 0 ? `-${tx.out_qty}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{Number(tx.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        ₹{Number(tx.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-100/60">
                        {tx.balance_qty ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info & hotkeys */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700 shadow-xs">
                Esc
              </kbd>{' '}
              लेजर बंद करा
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700 shadow-xs">
                F5
              </kbd>{' '}
              रिफ्रेश करा
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700 shadow-xs">
                Ctrl+P
              </kbd>{' '}
              प्रिंट करा
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors shadow-sm"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
