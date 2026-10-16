import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  User,
  Phone,
  Stethoscope,
  CreditCard,
  QrCode,
  Banknote,
  BookMarked,
  ArrowRight,
  MapPin,
  Scissors,
  Package,
  Layers,
  RotateCcw,
  Sparkles
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
      if (e.ctrlKey || e.altKey || e.metaKey) return;

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

      // Scanner keystroke timing
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

  // Perform live search
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

  // Khata balance lookup
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
        alert(`Barcode not found in catalog: ${barcode}`);
      }
    } catch (err) {
      console.error('Barcode error:', err);
    }
  };

  const addItemToCart = (product, isLoose = false) => {
    const batches = product.batches || [];
    const activeBatch = batches.length > 0 ? batches[0] : null;

    if (!activeBatch) {
      alert(`No stock available for ${product.name}`);
      return;
    }

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
      const initialQty = isLoose ? Math.min(4, stripSize) : 1;
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
        qty: initialQty,
        unit_price: unitPrice,
        total_price: Number((unitPrice * initialQty).toFixed(2))
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
    const baseMrp = item.all_batches[0]?.mrp || item.unit_price;
    item.unit_price = newIsLoose
      ? Math.round((baseMrp / item.strip_size) * 100) / 100
      : baseMrp;
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

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const netPayable = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cannot checkout: Bill is empty.');
      return;
    }

    if (paymentMode === 'khata' && !customerMobile) {
      alert('Customer mobile number is mandatory for Khata credit billing.');
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
      alert('Failed to process invoice.');
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
      {/* Top Search & Command Bar */}
      <div className="p-3 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine, salt, or scan barcode... (F4)"
              className="w-full pl-10 pr-28 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-600 transition-all"
              autoFocus
            />
            <div className="absolute right-2.5 flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <span className="bg-slate-100 text-slate-500 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                <Barcode className="w-3 h-3 text-slate-400" /> Scanner Ready
              </span>
            </div>
          </div>

          {/* Instant Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-40 divide-y divide-slate-100 animate-in fade-in duration-100">
              {searchResults.map((prod) => {
                const totalStock = prod.total_stock || 0;
                const activeBatch = prod.active_batch;
                const isOutOfStock = totalStock <= 0;

                return (
                  <div
                    key={prod.id}
                    className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                    onClick={() => addItemToCart(prod, false)}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700">
                          {prod.name}
                        </span>
                        <span className="rack-chip">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {prod.rack_location || 'General'}
                        </span>
                        {prod.is_schedule_h1 ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Schedule H1
                          </span>
                        ) : null}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono uppercase">
                          {prod.category}
                        </span>
                      </div>

                      {prod.generic_salt && (
                        <div className="text-[11px] text-slate-500 font-normal truncate max-w-md mt-0.5">
                          {prod.generic_salt}
                          {prod.strip_size > 1 && (
                            <span className="text-slate-400 ml-1.5 font-mono">
                              ({prod.strip_size} tabs/strip)
                            </span>
                          )}
                        </div>
                      )}

                      {activeBatch && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center space-x-2">
                          <span>Batch: <b className="text-slate-700">{activeBatch.batch_no}</b></span>
                          <span className="text-slate-300">•</span>
                          <span>Exp: <b className="text-slate-700">{activeBatch.expiry_date}</b></span>
                          <span className="text-slate-300">•</span>
                          <span>MRP: <b className="text-slate-900">₹{Number(activeBatch.mrp).toFixed(2)}</b></span>
                          <span className="text-slate-300">•</span>
                          <span>Stock: <b className="text-emerald-700">{totalStock}</b></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {prod.generic_salt && (
                        <button
                          onClick={(e) => viewSubstitutes(prod, e)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
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
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1 transition-colors"
                        >
                          <Scissors className="w-3 h-3 text-emerald-600" />
                          <span>Cut Tabs</span>
                        </button>
                      )}

                      <button
                        disabled={isOutOfStock}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isOutOfStock ? 'Out of Stock' : 'Add Strip'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Counter Top Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleNewSale}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>New Bill (F2)</span>
          </button>
        </div>
      </div>

      {/* Main Billing Workspace (Data Table + Right Dock) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Table of Bill Items */}
        <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700 tracking-wide">BILL ITEMS</span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.2 rounded-full text-[11px] font-mono">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              High density counter mode
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-100/80 flex items-center justify-center text-slate-400">
                  <Barcode className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-slate-700">Billing Counter Ready</div>
                  <div className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                    Scan any product barcode or type medicine name above to populate bill.
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold sticky top-0 z-10">
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3 min-w-[200px]">Product & Salt</th>
                    <th className="py-2 px-3 w-28">Rack</th>
                    <th className="py-2 px-3 w-32">Batch (FIFO)</th>
                    <th className="py-2 px-3 w-28">Unit Mode</th>
                    <th className="py-2 px-3 w-28 text-center">Quantity</th>
                    <th className="py-2 px-3 w-24 text-right">Unit Rate</th>
                    <th className="py-2 px-3 w-28 text-right">Amount (₹)</th>
                    <th className="py-2 px-3 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {cart.map((item, idx) => (
                    <tr
                      key={`${item.product_id}-${item.batch_id}-${item.is_loose_tablet}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.product_name}
                        </div>
                        {item.generic_salt && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs font-normal mt-0.5">
                            {item.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className="rack-chip">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {item.rack_location || 'General'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.batch_id}
                          onChange={(e) => switchBatch(idx, e.target.value)}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-800 focus:border-emerald-600"
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
                            className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors inline-flex items-center gap-1 ${
                              item.is_loose_tablet
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {item.is_loose_tablet ? (
                              <>
                                <Scissors className="w-2.5 h-2.5 text-amber-600" />
                                <span>Loose Tabs</span>
                              </>
                            ) : (
                              <>
                                <Package className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Full Strip</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Unit Item
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded bg-white shadow-2xs">
                          <button
                            onClick={() => updateCartItemQty(idx, -1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => setCartItemDirectQty(idx, e.target.value)}
                            className="w-10 text-center text-xs font-semibold text-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => updateCartItemQty(idx, 1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        ₹{Number(item.total_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => removeCartItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Modern SaaS Checkout Dock */}
        <div className="w-80 bg-slate-50 p-3.5 flex flex-col justify-between overflow-y-auto shrink-0 border-l border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* Customer & Prescription Details */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Customer & Doctor</span>
                {existingKhataBalance !== null && (
                  <span className="text-[10px] font-mono font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Khata Due: ₹{existingKhataBalance.toFixed(2)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">
                  Customer Mobile Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-3 h-3 absolute left-2.5 text-slate-400" />
                  <input
                    type="tel"
                    maxLength="10"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">
                  Customer Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-3 h-3 absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Cash Customer"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">
                  Prescribing Doctor (Optional)
                </label>
                <div className="relative flex items-center">
                  <Stethoscope className="w-3 h-3 absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Joshi"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Segmented Payment Mode Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                <span>Payment Mode</span>
                <span className="text-[10px] text-slate-400 font-mono">F8</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'khata', label: 'Khata Credit', icon: BookMarked },
                  { id: 'card', label: 'Card / POS', icon: CreditCard }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex items-center space-x-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Bill Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-20 text-right px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono font-medium text-xs focus:bg-white"
              />
            </div>
          </div>

          {/* BILLBOARD TOTAL BOX & PRIMARY ACTION */}
          <div className="space-y-2.5">
            <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-md border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Subtotal ({cart.length} items):</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-400 font-mono">
                  <span>Discount:</span>
                  <span>-₹{Number(discount).toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Net Amount Due
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight mt-0.5">
                  ₹ {netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-sm'
              }`}
            >
              <span>Complete Sale & Print (F9)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Substitutes Modal */}
      {substitutesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b pb-2.5">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Salt Substitutes: {substitutesModal.original.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Composition: {substitutesModal.original.generic_salt}
                </p>
              </div>
              <button
                onClick={() => setSubstitutesModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {substitutesModal.substitutes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No other medicines found with this exact salt composition.
                </div>
              ) : (
                substitutesModal.substitutes.map((sub) => (
                  <div
                    key={sub.id}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-md"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{sub.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="rack-chip">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {sub.rack_location}
                        </span>
                        <span className="font-mono text-emerald-700 font-medium">
                          In Stock: {sub.total_stock}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addItemToCart(sub, false);
                        setSubstitutesModal(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
                    >
                      Select Brand
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSubstitutesModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
              >
                Dismiss
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
