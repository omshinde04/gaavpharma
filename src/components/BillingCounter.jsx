import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
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
  Sparkles,
  PauseCircle,
  PlayCircle,
  Clock,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';

export default function BillingCounter({ currentUser, featureToggles, storeProfile }) {
  const allowKhata = featureToggles?.allow_khata !== false && featureToggles?.allow_khata !== 'false' && featureToggles?.allow_khata !== 0;
  const allowLooseTablets = featureToggles?.allow_loose_tablets !== false && featureToggles?.allow_loose_tablets !== 'false' && featureToggles?.allow_loose_tablets !== 0;
  const allowWhatsApp = featureToggles?.allow_whatsapp !== false && featureToggles?.allow_whatsapp !== 'false' && featureToggles?.allow_whatsapp !== 0;
  const enforceH1Doctor = featureToggles?.enforce_h1_doctor === true || featureToggles?.enforce_h1_doctor === 'true' || featureToggles?.enforce_h1_doctor === 1;
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const maxCashierDiscount = Number(featureToggles?.max_cashier_discount ?? 10);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [substitutesModal, setSubstitutesModal] = useState(null);

  // Cart state
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'upi' | 'khata' | 'card'
  const [discount, setDiscount] = useState(0);

  // Customer / Doctor Details (FDA Schedule H1 Rule 65)
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNo, setDoctorRegNo] = useState('');
  const [existingKhataBalance, setExistingKhataBalance] = useState(null);

  // Peak Hour "Hold & Resume" State (F6)
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const saved = localStorage.getItem('gaavpharma_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [shortageToast, setShortageToast] = useState(null);

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
      if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) {
          handleHoldBill();
        } else {
          setShowHeldModal((prev) => !prev);
        }
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
  }, [cart, paymentMode, discount, customerMobile, customerName, customerAddress, doctorName, doctorRegNo, heldBills]);

  const cyclePaymentMode = () => {
    const modes = allowKhata ? ['cash', 'upi', 'khata', 'card'] : ['cash', 'upi', 'card'];
    const currentIdx = modes.indexOf(paymentMode);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % modes.length : 0;
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

  const handleQuickAddShortage = async (product) => {
    try {
      const medicineName = product.name || product.medicine_name || searchQuery.trim();
      if (!medicineName) return;
      await api.addShortageItem({
        product_id: product.id || null,
        medicine_name: medicineName,
        generic_salt: product.generic_salt || '',
        current_stock: product.total_stock || 0,
        min_stock_alert: product.min_stock_alert || 10,
        suggested_qty: 10,
        source: 'CUSTOMER_DEMAND',
        notes: 'Walk-in customer demanded at counter'
      });
      setShortageToast(`"${medicineName}" तोटा नोंदवहीत जोडले! (Added to Shortage Diary)`);
      setTimeout(() => setShortageToast(null), 3500);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding shortage item:', err);
    }
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
    setCustomerAddress('');
    setDoctorName('');
    setDoctorRegNo('');
    setDiscount(0);
    setPaymentMode('cash');
    setExistingKhataBalance(null);
    searchInputRef.current?.focus();
  };

  // Peak Hour "Hold & Resume" Handlers (F6)
  const handleHoldBill = () => {
    if (cart.length === 0) {
      setShowHeldModal(true);
      return;
    }
    const newHeld = {
      id: 'HOLD-' + Date.now(),
      heldAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Cash Customer',
      customerMobile: customerMobile.trim() || '',
      customerAddress: customerAddress.trim() || '',
      doctorName: doctorName.trim() || '',
      doctorRegNo: doctorRegNo.trim() || '',
      cart: [...cart],
      discount,
      paymentMode,
      totalAmount: netPayable
    };
    const updated = [newHeld, ...heldBills];
    setHeldBills(updated);
    try {
      localStorage.setItem('gaavpharma_held_bills', JSON.stringify(updated));
    } catch (e) {}
    handleNewSale();
    alert(`Bill for "${newHeld.customerName}" held safely (F6). Counter is now cleared for next customer!`);
  };

  const handleResumeBill = (held) => {
    if (cart.length > 0) {
      if (!window.confirm('Current active bill has items. Replace with this held bill?')) {
        return;
      }
    }
    setCart(held.cart || []);
    setCustomerName(held.customerName || '');
    setCustomerMobile(held.customerMobile || '');
    setCustomerAddress(held.customerAddress || '');
    setDoctorName(held.doctorName || '');
    setDoctorRegNo(held.doctorRegNo || '');
    setDiscount(held.discount || 0);
    setPaymentMode(held.paymentMode || 'cash');

    const updated = heldBills.filter((h) => h.id !== held.id);
    setHeldBills(updated);
    try {
      localStorage.setItem('gaavpharma_held_bills', JSON.stringify(updated));
    } catch (e) {}
    setShowHeldModal(false);
  };

  const handleDiscardHeldBill = (id) => {
    if (!window.confirm('Discard this held bill permanently?')) return;
    const updated = heldBills.filter((h) => h.id !== id);
    setHeldBills(updated);
    try {
      localStorage.setItem('gaavpharma_held_bills', JSON.stringify(updated));
    } catch (e) {}
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const netPayable = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleDiscountChange = (val) => {
    const num = parseFloat(val) || 0;
    if (isCashier && subtotal > 0) {
      const maxVal = (subtotal * maxCashierDiscount) / 100;
      if (num > maxVal + 0.01) {
        alert(`Cashier discount is capped at ${maxCashierDiscount}% (₹${maxVal.toFixed(2)}) by Store Admin policy.`);
        setDiscount(Number(maxVal.toFixed(2)));
        return;
      }
    }
    setDiscount(val);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cannot checkout: Bill is empty.');
      return;
    }

    if (paymentMode === 'khata') {
      if (!allowKhata) {
        alert('Khata credit billing is currently disabled by Store Admin settings.');
        return;
      }
      if (!customerMobile) {
        alert('Customer mobile number is mandatory for Khata credit billing.');
        return;
      }
    }

    // Schedule H1 Drug Compliance Check
    const hasH1Item = cart.some((it) => it.is_schedule_h1 === 1);
    if (hasH1Item && enforceH1Doctor && !doctorName.trim()) {
      alert(
        '⚠️ Schedule H1 Compliance:\n' +
        'This bill contains Schedule H1 medicines (e.g. Augmentin / Azithromycin).\n' +
        'Doctor\'s Name is strictly required under Drugs & Cosmetics Rules.'
      );
      return;
    }

    // Cashier Discount Limit Enforcement
    if (isCashier && subtotal > 0) {
      const maxVal = (subtotal * maxCashierDiscount) / 100;
      if ((parseFloat(discount) || 0) > maxVal + 0.05) {
        alert(`Cashier discount cannot exceed ${maxCashierDiscount}% (₹${maxVal.toFixed(2)}).`);
        return;
      }
    }

    try {
      const invoiceData = {
        customer_name: customerName.trim() || 'Cash Customer',
        customer_mobile: customerMobile.trim() || null,
        customer_address: customerAddress.trim() || 'Ghoti',
        doctor_name: doctorName.trim() || null,
        doctor_reg_no: doctorRegNo.trim() || null,
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

                      {allowLooseTablets && prod.category === 'medicine' && prod.strip_size > 1 && (
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

                      {isOutOfStock ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddShortage(prod);
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition-colors"
                          title="ग्राहक मागणी / तोटा नोंदवहीत नोंदवा"
                        >
                          <BookMarked className="w-3.5 h-3.5 text-amber-600" />
                          <span>+ तोटा नोंदवा</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => addItemToCart(prod, false)}
                          className="px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Strip</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Missing Medicine Quick Shortage Banner */}
          {searchResults.length === 0 && searchQuery.trim().length > 1 && !isSearching && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-amber-300 p-3 z-40 animate-in fade-in duration-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    "{searchQuery}" नॉट इन स्टॉक / उपलब्ध नाही
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Walk-in customer demanded this medicine? Log it to Shortage Diary (तोटा वही).
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAddShortage({ name: searchQuery.trim(), generic_salt: '', current_stock: 0 })}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>+ तोटा नोंदवा (Add to Shortage)</span>
              </button>
            </div>
          )}
        </div>

        {/* Counter Top Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {heldBills.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Held Bills</span>
              <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-mono">
                {heldBills.length}
              </span>
              <kbd className="text-[9px] bg-amber-200/60 text-amber-800 px-1 rounded font-mono">F6</kbd>
            </button>
          )}

          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-xs transition-colors ${
              cart.length === 0
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
            }`}
            title="Hold current bill and clear counter for next customer (F6)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Hold Bill (F6)</span>
          </button>

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
                          allowLooseTablets ? (
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
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              Full Strip ({item.strip_size}s)
                            </span>
                          )
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
            {/* Customer & Prescription Details (FDA Schedule H1 Compliant) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Customer & Doctor</span>
                {existingKhataBalance !== null && (
                  <span className="text-[10px] font-mono font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Khata Due: ₹{existingKhataBalance.toFixed(2)}
                  </span>
                )}
              </div>

              {/* FDA Schedule H1 Alert Notice */}
              {cart.some((it) => it.is_schedule_h1 === 1 || it.is_schedule_h1 === true) && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 space-y-1 text-amber-950">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px] text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>FDA Schedule H1 Active (Rule 65)</span>
                  </div>
                  <div className="text-[10px] text-amber-800 leading-tight">
                    Prescribing Doctor & Patient Village are legally required for the statutory audit register.
                  </div>
                </div>
              )}

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
                  Customer / Patient Name
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
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-medium text-slate-500 block">
                    Patient Village / Address
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">FDA H1</span>
                </div>
                <div className="relative flex items-center">
                  <MapPin className="w-3 h-3 absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="e.g. Ghoti, Igatpuri, Bhavali..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {['Ghoti', 'Igatpuri', 'Bhavali', 'Waki', 'Kavnai'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCustomerAddress(v)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[9px] font-medium text-slate-600 rounded transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">
                  Prescribing Doctor {cart.some((it) => it.is_schedule_h1 === 1 || it.is_schedule_h1 === true) && <span className="text-rose-600 font-bold">*</span>}
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

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-medium text-slate-500 block">
                    Doctor MMC Reg. No.
                  </label>
                  <span className="text-[9px] text-slate-400 font-mono">Rule 65</span>
                </div>
                <input
                  type="text"
                  value={doctorRegNo}
                  onChange={(e) => setDoctorRegNo(e.target.value)}
                  placeholder="e.g. MMC-2015/04/1892"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white transition-all"
                />
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
                  ...(allowKhata ? [{ id: 'khata', label: 'Khata Credit', icon: BookMarked }] : []),
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
              <div className="flex items-center space-x-1.5">
                <span className="font-medium text-slate-600">Bill Discount (₹):</span>
                {isCashier && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded font-mono">
                    Max {maxCashierDiscount}%
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
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

      {/* Peak Hour Held Bills Modal (F6) */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Held Counter Bills (राखून ठेवलेली बिले)</h3>
                  <p className="text-[11px] text-slate-400">
                    {heldBills.length} parked customer {heldBills.length === 1 ? 'bill' : 'bills'} in peak hour queue • Hotkey <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-amber-300">F6</kbd>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHeldModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Held Bills List */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-2">
              {heldBills.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <PauseCircle className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <div className="text-xs font-semibold text-slate-600">No Bills Currently on Hold</div>
                  <div className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    During busy counter rush, click "Hold Bill (F6)" to park a customer's cart and serve the next person instantly!
                  </div>
                </div>
              ) : (
                heldBills.map((held, idx) => (
                  <div
                    key={held.id}
                    className="pt-2 first:pt-0 pb-2 flex items-start justify-between gap-3 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{held.customerName}</span>
                        {held.customerMobile && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {held.customerMobile}
                          </span>
                        )}
                        {held.customerAddress && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {held.customerAddress}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(held.heldAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Items Summary */}
                      <div className="text-[11px] text-slate-600 line-clamp-2">
                        {(held.cart || []).map((it) => `${it.product_name} (${it.qty}${it.is_loose_tablet ? ' tabs' : ' strips'})`).join(', ')}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-700 pt-0.5">
                        <span className="font-mono text-emerald-700 font-bold">
                          ₹{Number(held.totalAmount || 0).toFixed(2)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{held.cart?.length || 0} items</span>
                        {held.doctorName && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Dr. {held.doctorName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleResumeBill(held)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        onClick={() => handleDiscardHeldBill(held.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition-colors"
                        title="Discard held bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Tip: Press <kbd className="font-mono bg-white border px-1 py-0.5 rounded text-slate-700 font-semibold">F6</kbd> anywhere on counter to quick-hold or recall.
              </span>
              <button
                onClick={() => setShowHeldModal(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs"
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
          storeProfile={storeProfile}
          allowWhatsApp={allowWhatsApp}
          onClose={() => setCompletedInvoice(null)}
          onNewSale={() => {
            setCompletedInvoice(null);
            handleNewSale();
          }}
        />
      )}

      {/* Shortage Quick Notification Toast */}
      {shortageToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-amber-500/40 flex items-center space-x-2.5 animate-in slide-in-from-bottom duration-200">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-amber-200">{shortageToast}</span>
        </div>
      )}
    </div>
  );
}
