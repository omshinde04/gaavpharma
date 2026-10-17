import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  User,
  Phone,
  FileText,
  CreditCard,
  Banknote,
  BookMarked,
  Printer,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function SalesReturnModal({ isOpen, onClose, onReturnCompleted }) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [customerName, setCustomerName] = useState('Cash Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [refundMode, setRefundMode] = useState('CASH'); // CASH, KHATA_CREDIT, UPI_ONLINE
  const [reason, setReason] = useState('PATIENT_UNUSED');
  const [notes, setNotes] = useState('');

  // Items to return
  const [items, setItems] = useState([]);

  // Product search for manual addition
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadRecentInvoices();
      resetForm();
    }
  }, [isOpen]);

  // Keyboard navigation: Esc to close, F10 / Ctrl+Enter to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F10' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (!successReceipt) {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, refundMode, customerName, customerMobile, successReceipt]);

  const resetForm = () => {
    setReturnDate(new Date().toISOString().slice(0, 10));
    setInvoiceSearchQuery('');
    setSelectedInvoice(null);
    setCustomerName('Cash Customer');
    setCustomerMobile('');
    setRefundMode('CASH');
    setReason('PATIENT_UNUSED');
    setNotes('');
    setItems([]);
    setError('');
    setSuccessReceipt(null);
  };

  const loadRecentInvoices = async () => {
    try {
      const invs = await api.getInvoices(30);
      setInvoicesList(invs || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  const handleSelectInvoice = async (inv) => {
    try {
      setSelectedInvoice(inv);
      setCustomerName(inv.customer_name || 'Cash Customer');
      setCustomerMobile(inv.customer_mobile || '');
      setInvoiceSearchQuery(inv.invoice_no);

      const details = await api.getInvoiceDetails(inv.id);
      if (details && details.items && details.items.length > 0) {
        setItems(
          details.items.map((it) => ({
            product_id: it.product_id,
            product_name: it.name || it.product_name,
            batch_id: it.batch_id,
            batch_no: it.batch_no || 'BATCH-01',
            qty: it.qty,
            max_qty: it.qty,
            refund_rate: it.unit_price,
            total_amount: it.qty * it.unit_price
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    }
  };

  const handleProductSearch = async (val) => {
    setProductSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearchingProduct(true);
      const res = await api.searchProducts(val.trim());
      setSearchResults(res || []);
    } catch (err) {
      console.error('Failed searching products:', err);
    } finally {
      setIsSearchingProduct(false);
    }
  };

  const addProductToReturn = (prod) => {
    const defaultBatch = (prod.batches && prod.batches[0]) || { id: null, batch_no: 'BATCH-01', mrp: 0 };
    const rate = defaultBatch.mrp || 10;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        batch_id: defaultBatch.id,
        batch_no: defaultBatch.batch_no,
        qty: 1,
        max_qty: 999,
        refund_rate: rate,
        total_amount: rate
      }
    ]);
    setProductSearch('');
    setSearchResults([]);
  };

  const updateItemQty = (index, newQty) => {
    const q = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        qty: q,
        total_amount: q * (copy[index].refund_rate || 0)
      };
      return copy;
    });
  };

  const updateItemRate = (index, newRate) => {
    const r = Math.max(0, parseFloat(newRate) || 0);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        refund_rate: r,
        total_amount: (copy[index].qty || 1) * r
      };
      return copy;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalRefundAmount = items.reduce((sum, it) => sum + (it.total_amount || 0), 0);
  const totalUnits = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('कृपया रिटर्न करण्यासाठी किमान एक औषध निवडा (Add at least 1 item to return)');
      return;
    }
    if (refundMode === 'KHATA_CREDIT' && !customerMobile) {
      setError('खात्यावर जमा (Khata Credit) करण्यासाठी ग्राहकाचा मोबाईल नंबर आवश्यक आहे');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        original_invoice_no: selectedInvoice ? selectedInvoice.invoice_no : invoiceSearchQuery || null,
        customer_name: customerName.trim() || 'Cash Customer',
        customer_mobile: customerMobile.trim() || null,
        return_date: returnDate,
        refund_mode: refundMode,
        total_refund_amount: totalRefundAmount,
        reason: reason,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          product_id: it.product_id,
          batch_id: it.batch_id || null,
          batch_no: it.batch_no || 'BATCH-01',
          qty: it.qty,
          refund_rate: it.refund_rate,
          total_amount: it.total_amount
        }))
      };

      const res = await api.createSalesReturn(payload);
      if (res && res.success) {
        setSuccessReceipt({
          ...payload,
          return_no: res.return_no,
          items_count: res.items_count,
          created_at: new Date().toISOString()
        });
        if (onReturnCompleted) {
          onReturnCompleted(res);
        }
      } else {
        setError('रिटर्न नोंद सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
      }
    } catch (err) {
      setError(`त्रुटी: ${err.message || 'Error processing sales return'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  ग्राहक औषध रिटर्न व क्रेडिट नोट (Sales Return / Credit Note)
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                  Alt+R
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                उरलेले किंवा बदललेले औषध जमा करून स्टॉक रिप्लेनिश करा आणि रोख/खाते परतावा द्या
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="बंद करा (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View / Slip */}
        {successReceipt ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">रिटर्न नोंद यशस्वीरीत्या पूर्ण झाली!</h3>
              <p className="text-sm font-semibold text-slate-500">
                व्हाऊचर क्र.: <span className="font-mono text-purple-700 font-black">{successReceipt.return_no}</span>
              </p>
              <p className="text-xs text-slate-600">
                सर्व {successReceipt.items_count} औषधांचा स्टॉक इन्व्हेंटरीमध्ये आपोआप जमा करण्यात आला आहे.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 w-full max-w-md text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">ग्राहक (Customer):</span>
                <span className="font-bold text-slate-800">{successReceipt.customer_name}</span>
              </div>
              {successReceipt.customer_mobile && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">मोबाईल (Phone):</span>
                  <span className="font-mono font-bold text-slate-800">{successReceipt.customer_mobile}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">परतावा पद्धत (Refund Mode):</span>
                <span className="font-bold text-purple-700">
                  {successReceipt.refund_mode === 'CASH'
                    ? '💵 रोख परतावा (Cash Drawer)'
                    : successReceipt.refund_mode === 'KHATA_CREDIT'
                    ? '📖 उधारी खात्यावर जमा (Khata Credit)'
                    : '📱 UPI / बँक परतावा'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">मूळ बिल क्र. (Original Bill):</span>
                <span className="font-mono font-bold text-slate-800">{successReceipt.original_invoice_no || 'Manual'}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="font-bold text-slate-700">एकूण परतावा रक्कम (Total Refund):</span>
                <span className="font-black font-mono text-emerald-700 text-base">
                  ₹{Number(successReceipt.total_refund_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                <span>रिटर्न पावती प्रिंट करा (Print Slip)</span>
              </button>
              <button
                onClick={() => {
                  setSuccessReceipt(null);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all"
              >
                नवीन रिटर्न नोंद करा (New Return)
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all"
              >
                काउंटरवर परत जा (Close)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Top Toolbar: Invoice Lookup & Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              {/* Previous Bill Lookup */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  मूळ बिल नंबर (Lookup Original Invoice)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="INV-XXXX किंवा बिलातून निवडा..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
                {invoicesList.length > 0 && !selectedInvoice && (
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    <span className="text-slate-400">अलीकडील:</span>
                    {invoicesList.slice(0, 3).map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => handleSelectInvoice(inv)}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-purple-100 border border-slate-200 text-purple-700 font-mono font-semibold"
                      >
                        {inv.invoice_no}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  ग्राहकाचे नाव (Customer Name)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="उदा. राहुल जाधव / Cash Customer"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Customer Mobile */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  मोबाईल नंबर (Mobile Number)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="9876543210 (खाते जमासाठी आवश्यक)"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Manual Product Add Strip */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-600" /> थेट औषध जोडा (Add Medicine to Return):
                </label>
                <span className="text-[11px] text-slate-500">किंवा मूळ बिलातून आयटम्स आपोआप लोड होतात</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="औषधाचे नाव किंवा Generic Salt टाईप करा..."
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToReturn(p)}
                        className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">{p.generic_salt}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-800">
                            MRP: ₹{p.batches?.[0]?.mrp || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500">शिल्लक: {p.total_stock}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Return Items Table */}
            <div>
              <div className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                रिटर्न करावयाची औषधे (Items to Return) ({items.length})
              </div>

              {items.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  कोणतीही औषधे निवडलेली नाहीत. वरील बिलाचा नंबर टाका किंवा थेट औषध सर्च करून जोडा.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">औषधाचे नाव</th>
                        <th className="py-2.5 px-3">बॅच क्र.</th>
                        <th className="py-2.5 px-3 text-center">रिटर्न नग (Qty)</th>
                        <th className="py-2.5 px-3 text-right">परतावा दर (₹)</th>
                        <th className="py-2.5 px-3 text-right">रक्कम (₹)</th>
                        <th className="py-2.5 px-3 text-center w-12">क्रिया</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{it.product_name}</div>
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-700">{it.batch_no}</td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              max={it.max_qty || 999}
                              value={it.qty}
                              onChange={(e) => updateItemQty(idx, e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.refund_rate}
                              onChange={(e) => updateItemRate(idx, e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-purple-700">
                            ₹{Number(it.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Form Strip: Refund Mode & Reason */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  परतावा पद्धत (Refund Settlement Mode)
                </label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  <option value="CASH">💵 रोख कॅश ड्रॉवर परतावा (Cash Drawer)</option>
                  <option value="KHATA_CREDIT">📖 उधारी खात्यावर जमा (Khata Credit)</option>
                  <option value="UPI_ONLINE">📱 UPI / ऑनलाइन बँक ट्रान्सफर</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  परताव्याचे कारण (Return Reason)
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  <option value="PATIENT_UNUSED">रुग्ण बरा झाला / गोळ्या उरल्या (Patient Unused)</option>
                  <option value="DOCTOR_CHANGED">डॉक्टरांनी औषध बदलले (Doctor Changed Rx)</option>
                  <option value="WRONG_MEDICINE">चुकीचे औषध दिले गेले (Wrong Item)</option>
                  <option value="EXPIRED_DAMAGED">खराब किंवा तारीख संपली (Damaged/Expired)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  नोंद / शेरा (Notes / Remarks)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="उदा. २ गोळ्या परत घेतल्या..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!successReceipt && (
          <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-slate-500 font-medium">एकूण औषधे:</span>
                <span className="ml-1 text-sm font-bold text-slate-800">{items.length} आयटम्स</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">एकूण नग:</span>
                <span className="ml-1 text-sm font-bold text-slate-800">{totalUnits} Units</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  एकूण परतावा रक्कम (Total Refund)
                </div>
                <div className="text-2xl font-black font-mono text-purple-700">
                  ₹{Number(totalRefundAmount).toFixed(2)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || items.length === 0}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span>प्रक्रिया सुरू आहे...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>रिटर्न नोंद सेव्ह करा व स्टॉक वाढवा (F10)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
