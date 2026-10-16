import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  DollarSign,
  User,
  Phone,
  Stethoscope,
  CreditCard,
  QrCode,
  Banknote,
  BookMarked,
  Printer,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';

export default function BillingCounter() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [substitutesModal, setSubstitutesModal] = useState(null);

  // Cart state
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'upi' | 'khata' | 'card'
  const [discount, setDiscount] = useState(0);

  // Customer / Doctor Details
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [existingKhataBalance, setExistingKhataBalance] = useState(null);

  // Receipt Modal
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Barcode scanner buffer
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const searchInputRef = useRef(null);

  // Global Barcode Scanner Listener & Hotkeys
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Don't intercept if modifier keys are held (except Enter)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Hotkeys
      if (e.key === 'F2') {
        e.preventDefault();
        handleNewSale();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        cyclePaymentMode();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleCompleteSale();
        return;
      }

      // Barcode Scanner detection
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 6 && diff < 65) {
          const scannedCode = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          e.preventDefault();
          await handleBarcodeScan(scannedCode);
          return;
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (diff > 80) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMode, discount, customerMobile, customerName, doctorName]);

  const cyclePaymentMode = () => {
    const modes = ['cash', 'upi', 'khata', 'card'];
    const nextIdx = (modes.indexOf(paymentMode) + 1) % modes.length;
    setPaymentMode(modes[nextIdx]);
  };

  // Perform search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await api.searchProducts(searchQuery);
          setSearchResults(res || []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mobile lookup for Khata
  useEffect(() => {
    if (customerMobile.length === 10) {
      api.getKhataCustomers().then((custs) => {
        const found = custs.find((c) => c.mobile === customerMobile);
        if (found) {
          setCustomerName(found.name);
          setExistingKhataBalance(found.balance);
        } else {
          setExistingKhataBalance(null);
        }
      });
    } else {
      setExistingKhataBalance(null);
    }
  }, [customerMobile]);

  const handleBarcodeScan = async (barcode) => {
    try {
      const prod = await api.getProductByBarcode(barcode);
      if (prod) {
        addItemToCart(prod, false);
      } else {
        alert(`Barcode not found in inventory: ${barcode}`);
      }
    } catch (err) {
      console.error('Barcode error:', err);
    }
  };

  const addItemToCart = (product, isLoose = false) => {
    const batches = product.batches || [];
    // Auto FIFO: Pick earliest expiring batch
    const activeBatch = batches.length > 0 ? batches[0] : null;

    if (!activeBatch) {
      alert(`No stock available for ${product.name}`);
      return;
    }

    // Check if already in cart with same batch and loose state
    const existingIndex = cart.findIndex(
      (item) =>
        item.product_id === product.id &&
        item.batch_id === activeBatch.id &&
        item.is_loose_tablet === isLoose
    );

    const stripSize = product.strip_size || 10;
    const unitPrice = isLoose
      ? Math.round((activeBatch.mrp / stripSize) * 100) / 100
      : activeBatch.mrp;

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      updated[existingIndex].total_price = Number(
        (updated[existingIndex].qty * updated[existingIndex].unit_price).toFixed(2)
      );
      setCart(updated);
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        generic_salt: product.generic_salt,
        category: product.category,
        rack_location: product.rack_location,
        strip_size: stripSize,
        is_schedule_h1: product.is_schedule_h1,
        batch_id: activeBatch.id,
        batch_no: activeBatch.batch_no,
        expiry_date: activeBatch.expiry_date,
        all_batches: batches,
        is_loose_tablet: isLoose,
        qty: isLoose ? Math.min(4, stripSize) : 1,
        unit_price: unitPrice,
        total_price: Number((unitPrice * (isLoose ? Math.min(4, stripSize) : 1)).toFixed(2))
      };
      setCart([newItem, ...cart]);
    }

    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateCartItemQty = (index, delta) => {
    const updated = [...cart];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }
    updated[index].qty = newQty;
    updated[index].total_price = Number((newQty * updated[index].unit_price).toFixed(2));
    setCart(updated);
  };

  const setCartItemDirectQty = (index, val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const updated = [...cart];
    updated[index].qty = parsed;
    updated[index].total_price = Number((parsed * updated[index].unit_price).toFixed(2));
    setCart(updated);
  };

  const switchBatch = (index, newBatchId) => {
    const updated = [...cart];
    const item = updated[index];
    const foundBatch = item.all_batches.find((b) => b.id === Number(newBatchId));
    if (foundBatch) {
      item.batch_id = foundBatch.id;
      item.batch_no = foundBatch.batch_no;
      item.expiry_date = foundBatch.expiry_date;
      item.unit_price = item.is_loose_tablet
        ? Math.round((foundBatch.mrp / item.strip_size) * 100) / 100
        : foundBatch.mrp;
      item.total_price = Number((item.qty * item.unit_price).toFixed(2));
      setCart(updated);
    }
  };

  const toggleLooseTabletMode = (index) => {
    const updated = [...cart];
    const item = updated[index];
    const newIsLoose = !item.is_loose_tablet;
    item.is_loose_tablet = newIsLoose;
    item.unit_price = newIsLoose
      ? Math.round(((item.all_batches[0]?.mrp || item.unit_price) / item.strip_size) * 100) / 100
      : (item.all_batches[0]?.mrp || item.unit_price * item.strip_size);
    item.total_price = Number((item.qty * item.unit_price).toFixed(2));
    setCart(updated);
  };

  const removeCartItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerMobile('');
    setCustomerName('');
    setDoctorName('');
    setDiscount(0);
    setPaymentMode('cash');
    setExistingKhataBalance(null);
    searchInputRef.current?.focus();
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const netPayable = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cannot checkout: Cart is empty!');
      return;
    }

    if (paymentMode === 'khata' && !customerMobile) {
      alert('Mobile number is required for Khata (Credit) sales!');
      return;
    }

    try {
      const invoiceData = {
        customer_name: customerName.trim() || 'Cash Customer',
        customer_mobile: customerMobile.trim() || null,
        doctor_name: doctorName.trim() || null,
        payment_mode: paymentMode,
        total_amount: Number(subtotal.toFixed(2)),
        discount: Number((parseFloat(discount) || 0).toFixed(2)),
        final_amount: Number(netPayable.toFixed(2))
      };

      const result = await api.createInvoice(invoiceData, cart);
      setCompletedInvoice(result);
    } catch (err) {
      console.error('Invoice error:', err);
      alert('Failed to save invoice. Please try again.');
    }
  };

  const viewSubstitutes = async (prod, e) => {
    e.stopPropagation();
    try {
      const subs = await api.findSaltSubstitutes(prod.generic_salt, prod.id);
      setSubstitutesModal({ original: prod, substitutes: subs });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Search Bar & Counter Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between gap-4">
        {/* Medicine / FMCG Search Box */}
        <div className="relative flex-1 max-w-3xl">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Medicine by Name, Salt (e.g. Paracetamol), or Scan Barcode... [F4]"
              className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
              autoFocus
            />
            <div className="absolute right-2.5 flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" /> Auto-Scanner
              </span>
            </div>
          </div>

          {/* Instant Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-lg shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-40 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              {searchResults.map((prod) => {
                const totalStock = prod.total_stock || 0;
                const activeBatch = prod.active_batch;
                const isOutOfStock = totalStock <= 0;

                return (
                  <div
                    key={prod.id}
                    className="p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                    onClick={() => addItemToCart(prod, false)}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-800">
                          {prod.name}
                        </span>
                        <span className="rack-chip">📍 {prod.rack_location || 'Rack General'}</span>
                        {prod.is_schedule_h1 ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                            Schedule H1
                          </span>
                        ) : null}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono uppercase">
                          {prod.category}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                        {prod.generic_salt && (
                          <span className="truncate max-w-md font-medium text-slate-600">
                            {prod.generic_salt}
                          </span>
                        )}
                        {prod.strip_size > 1 && (
                          <span className="text-slate-400">({prod.strip_size} tabs/strip)</span>
                        )}
                      </div>

                      {activeBatch && (
                        <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center space-x-2">
                          <span>Earliest Batch: <b>{activeBatch.batch_no}</b></span>
                          <span>•</span>
                          <span>Exp: <b>{activeBatch.expiry_date}</b></span>
                          <span>•</span>
                          <span>MRP: <b>₹{Number(activeBatch.mrp).toFixed(2)}</b></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {prod.generic_salt && (
                        <button
                          onClick={(e) => viewSubstitutes(prod, e)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                          title="View other brands with same salt"
                        >
                          Substitutes
                        </button>
                      )}

                      {prod.category === 'medicine' && prod.strip_size > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItemToCart(prod, true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors"
                          title="Sell loose cut tablets"
                        >
                          Cut Tabs ✂️
                        </button>
                      )}

                      <button
                        disabled={isOutOfStock}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isOutOfStock ? 'No Stock' : 'Add Strip'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Counter Info & Clear Action */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleNewSale}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-sm transition-colors"
          >
            <span>New Bill (F2)</span>
          </button>
        </div>
      </div>

      {/* Main Billing Workspace (Grid Layout) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: High-Density Billing Cart Table */}
        <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
          <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <div className="flex items-center space-x-2">
              <span>ITEMS IN BILL</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-mono">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              Compact View • 15+ items counter ready
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <Barcode className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-600">Billing Counter Ready</div>
                  <div className="text-xs text-slate-400 max-w-sm mt-1">
                    Scan any product barcode with your USB scanner or type medicine name / salt above to start billing.
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-10 font-bold">
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3 min-w-[200px]">Product & Salt</th>
                    <th className="py-2 px-3 w-28">Rack</th>
                    <th className="py-2 px-3 w-32">Batch (FIFO)</th>
                    <th className="py-2 px-3 w-24">Type</th>
                    <th className="py-2 px-3 w-28 text-center">Qty</th>
                    <th className="py-2 px-3 w-24 text-right">Unit Rate</th>
                    <th className="py-2 px-3 w-28 text-right">Total (₹)</th>
                    <th className="py-2 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {cart.map((item, idx) => (
                    <tr
                      key={`${item.product_id}-${item.batch_id}-${item.is_loose_tablet}`}
                      className="hover:bg-emerald-50/50 transition-colors py-2 px-3"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.product_name}
                        </div>
                        {item.generic_salt && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs font-normal">
                            {item.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className="rack-chip">📍 {item.rack_location || 'General'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.batch_id}
                          onChange={(e) => switchBatch(idx, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        >
                          {item.all_batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.batch_no} (Exp: {b.expiry_date})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {item.strip_size > 1 ? (
                          <button
                            onClick={() => toggleLooseTabletMode(idx)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                              item.is_loose_tablet
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {item.is_loose_tablet ? '✂️ Loose Tabs' : '📦 Full Strip'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Unit Item
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded bg-white">
                          <button
                            onClick={() => updateCartItemQty(idx, -1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => setCartItemDirectQty(idx, e.target.value)}
                            className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => updateCartItemQty(idx, 1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-950 text-sm">
                        ₹{Number(item.total_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => removeCartItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Counter Checkout, Billboard Total Box & Customer Info */}
        <div className="w-96 bg-slate-50 p-4 flex flex-col justify-between overflow-y-auto shrink-0 border-l border-slate-200 space-y-4">
          <div className="space-y-4">
            {/* Customer & Doctor Input Card */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Customer & Doctor</span>
                {existingKhataBalance !== null && (
                  <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-mono">
                    Khata: ₹{existingKhataBalance.toFixed(2)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" /> Customer Mobile (10 Digits)
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9822114477"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-600" /> Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Cash Customer"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-emerald-600" /> Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Joshi"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Payment Mode</span>
                <span className="text-[10px] text-slate-400 font-mono">Press F8 to cycle</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'khata', label: 'Khata (Credit)', icon: BookMarked },
                  { id: 'card', label: 'Card / POS', icon: CreditCard }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount / Deductions */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* BILLBOARD TOTAL BOX */}
          <div className="space-y-3">
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Subtotal ({cart.length} items):</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-mono">
                  <span>Discount:</span>
                  <span>-₹{Number(discount).toFixed(2)}</span>
                </div>
              )}

              {/* Billboard Payable Amount */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Net Payable Amount
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight mt-0.5">
                  ₹ {netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Complete Sale Action Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md transition-all ${
                cart.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-emerald-900/30'
              }`}
            >
              <span>⚡ Complete & Print Bill (F9)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Salt Substitutes Modal */}
      {substitutesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Salt Substitutes for {substitutesModal.original.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Composition: {substitutesModal.original.generic_salt}
                </p>
              </div>
              <button
                onClick={() => setSubstitutesModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {substitutesModal.substitutes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No other medicines found in stock with the exact same composition.
                </div>
              ) : (
                substitutesModal.substitutes.map((sub) => (
                  <div
                    key={sub.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{sub.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="rack-chip">📍 {sub.rack_location}</span>
                        <span className="font-mono text-emerald-700 font-semibold">
                          Stock: {sub.total_stock}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addItemToCart(sub, false);
                        setSubstitutesModal(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold"
                    >
                      Add This Brand
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSubstitutesModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      {completedInvoice && (
        <ReceiptModal
          invoice={completedInvoice}
          onClose={() => setCompletedInvoice(null)}
          onNewSale={() => {
            setCompletedInvoice(null);
            handleNewSale();
          }}
        />
      )}
    </div>
  );
}
