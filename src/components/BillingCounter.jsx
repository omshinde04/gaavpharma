import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Check,
  ArrowRightLeft,
  Calendar,
  Building2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';
import FastProductCreateModal from './FastProductCreateModal';
import ProductTransactionsModal from './ProductTransactionsModal';
import SalesReturnModal from './SalesReturnModal';


// Helper to create an empty multi-bill slot (Slots 1 to 10)
const createEmptySlot = (id) => ({
  id,
  cart: [],
  customerMobile: '',
  customerName: '',
  customerAddress: '',
  doctorName: '',
  doctorRegNo: '',
  discount: 0,
  paymentMode: 'cash',
  existingKhataBalance: null
});

export default function BillingCounter({ currentUser, featureToggles, storeProfile }) {
  const allowKhata = featureToggles?.allow_khata !== false && featureToggles?.allow_khata !== 'false' && featureToggles?.allow_khata !== 0;
  const allowLooseTablets = featureToggles?.allow_loose_tablets !== false && featureToggles?.allow_loose_tablets !== 'false' && featureToggles?.allow_loose_tablets !== 0;
  const allowWhatsApp = featureToggles?.allow_whatsapp !== false && featureToggles?.allow_whatsapp !== 'false' && featureToggles?.allow_whatsapp !== 0;
  const enforceH1Doctor = featureToggles?.enforce_h1_doctor === true || featureToggles?.enforce_h1_doctor === 'true' || featureToggles?.enforce_h1_doctor === 1;
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const maxCashierDiscount = Number(featureToggles?.max_cashier_discount ?? 10);

  // 10-Slot Multi-Bill State (MediVision Parity: Slots 1 to 10)
  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('gaavpharma_counter_slots_10');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 10) return parsed;
      }
    } catch (e) {}
    return Array.from({ length: 10 }, (_, i) => createEmptySlot(i + 1));
  });
  const [activeSlotIdx, setActiveSlotIdx] = useState(0); // 0 to 9

  // Active Slot Derived State
  const activeSlot = slots[activeSlotIdx] || slots[0];
  const cart = activeSlot.cart || [];
  const paymentMode = activeSlot.paymentMode || 'cash';
  const discount = activeSlot.discount || 0;
  const customerMobile = activeSlot.customerMobile || '';
  const customerName = activeSlot.customerName || '';
  const customerAddress = activeSlot.customerAddress || '';
  const doctorName = activeSlot.doctorName || '';
  const doctorRegNo = activeSlot.doctorRegNo || '';
  const existingKhataBalance = activeSlot.existingKhataBalance;

  // Search & Autocomplete State (Stage 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [substitutesModal, setSubstitutesModal] = useState(null);

  // MediVision Stage 2: "Available Stock" Dedicated Batch Selection Modal
  const [batchSelectModal, setBatchSelectModal] = useState(null);
  // shape: { product, batches: [], selectedIndex: 0, qty: 1, isLoose: false }

  // MediVision Multi-Bill Item Shift Modal ("Shift Item?")
  const [shiftItemModal, setShiftItemModal] = useState(null);
  // shape: { itemIndex: number, targetSlot: number }

  // Live Bottom Inspector Product Focus
  const [focusedProduct, setFocusedProduct] = useState(null);

  // Live Bottom Expiry Radar Ticker Items
  const [expiryTickerItems, setExpiryTickerItems] = useState([]);

  // Shortage notification toast
  const [shortageToast, setShortageToast] = useState(null);

  // Receipt Modal
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Phase 2 Modals State (Photos 8, 9, 16, 17, 19)
  const [fastProductModalOpen, setFastProductModalOpen] = useState(false);
  const [fastProductInitialName, setFastProductInitialName] = useState('');
  const [transactionsModal, setTransactionsModal] = useState(null); // { productId, productName, batchId }
  const [salesReturnModalOpen, setSalesReturnModalOpen] = useState(false);


  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const searchInputRef = useRef(null);
  const customerMobileRef = useRef(null);
  const batchQtyInputRef = useRef(null);

  // Persist slots to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('gaavpharma_counter_slots_10', JSON.stringify(slots));
    } catch (e) {}
  }, [slots]);

  // Load Expiry Ticker Items on Mount
  useEffect(() => {
    api.getExpiryRadarData().then((res) => {
      if (res && res.batches) {
        const sorted = [...res.batches]
          .filter((b) => b.status === 'critical' || b.status === 'warning')
          .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
        setExpiryTickerItems(sorted.slice(0, 15));
      }
    }).catch((e) => console.warn('Ticker load error:', e));
  }, []);

  // Update current slot helper
  const updateActiveSlot = (updater) => {
    setSlots((prevSlots) => {
      const next = [...prevSlots];
      const cur = next[activeSlotIdx];
      next[activeSlotIdx] = typeof updater === 'function' ? updater(cur) : { ...cur, ...updater };
      return next;
    });
  };

  // Phase 2 Handlers: Fast Product Add & Stock Ledger
  const openFastProductModal = (name = '') => {
    setFastProductInitialName(name || searchQuery || '');
    setFastProductModalOpen(true);
  };

  const handleFastProductCreated = (product, batch) => {
    const stripSize = product.strip_size || 10;
    const unitPrice = batch.mrp || 0;
    const newItem = {
      product_id: product.id,
      product_name: product.name,
      generic_salt: product.generic_salt,
      category: product.category,
      company: 'General',
      rack_location: product.rack_location || 'Rack A-1',
      strip_size: stripSize,
      is_schedule_h1: product.is_schedule_h1,
      batch_id: batch.id,
      batch_no: batch.batch_no,
      expiry_date: batch.expiry_date,
      all_batches: [batch],
      is_loose_tablet: false,
      qty: 1,
      unit_price: unitPrice,
      total_price: Number(unitPrice.toFixed(2))
    };
    updateActiveSlot({ cart: [newItem, ...cart] });
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const openTransactionsModal = (productId, productName, batchId = null) => {
    setTransactionsModal({ productId, productName, batchId });
  };

  // Keyboard Shortcuts (F-Keys, Alt+1..0 for Slots, Enter-Flow)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Alt + 1 through Alt + 9, Alt + 0: Switch Multi-Bill Slots
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const keyNum = parseInt(e.key, 10);
        if (!isNaN(keyNum)) {
          e.preventDefault();
          const targetSlotIdx = keyNum === 0 ? 9 : keyNum - 1;
          setActiveSlotIdx(targetSlotIdx);
          return;
        }
      }

      // F2 or Ctrl+N: Clear Current Slot / New Bill
      if (e.key === 'F2' || (isCtrlOrMeta && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        handleNewSale();
        return;
      }

      // F3 or Insert: Fast Product & Batch Creation (Photos 8 & 9)
      if (e.key === 'F3' || e.key === 'Insert') {
        e.preventDefault();
        openFastProductModal(searchQuery);
        return;
      }

      // Alt+T: Open Product Movement Transaction Ledger (Photo 16)
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        if (focusedProduct) {
          openTransactionsModal(focusedProduct.id, focusedProduct.name);
        } else if (cart.length > 0) {
          openTransactionsModal(cart[0].product_id, cart[0].product_name, cart[0].batch_id);
        } else {
          openFastProductModal(searchQuery);
        }
        return;
      }

      // Alt+R: Open Customer Sales Return / Credit Note (Photos 17 & 19)
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setSalesReturnModalOpen(true);
        return;
      }

      // F4 or Ctrl+F: Focus Search Input
      if (e.key === 'F4' || (isCtrlOrMeta && (e.key === 'f' || e.key === 'F'))) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // F8 or Alt+P: Cycle Payment Mode (Cash, UPI, Khata, Card)
      if (e.key === 'F8' || (e.altKey && (e.key === 'p' || e.key === 'P'))) {
        e.preventDefault();
        cyclePaymentMode();
        return;
      }

      // F9 or Ctrl+Enter: Complete Sale & Print
      if (e.key === 'F9' || (isCtrlOrMeta && e.key === 'Enter')) {
        e.preventDefault();
        handleCompleteSale();
        return;
      }

      // Alt+H: Jump to Patient / Doctor Rx Details
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        customerMobileRef.current?.focus();
        return;
      }

      // Barcode Scanner Listener
      if (e.ctrlKey || e.altKey || e.metaKey) return;

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
  }, [activeSlotIdx, slots, batchSelectModal, shiftItemModal, focusedProduct, cart, searchQuery]);


  const cyclePaymentMode = () => {
    const modes = allowKhata ? ['cash', 'upi', 'khata', 'card'] : ['cash', 'upi', 'card'];
    const currentIdx = modes.indexOf(paymentMode);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % modes.length : 0;
    updateActiveSlot({ paymentMode: modes[nextIdx] });
  };

  // Live Search Autocomplete (Stage 1)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await api.searchProducts(searchQuery);
          setSearchResults(res || []);
          setHighlightedIndex(0);
          if (res && res.length > 0) {
            setFocusedProduct(res[0]);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setHighlightedIndex(0);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Stage 1 Keyboard Navigation in Search Input
  const handleSearchInputKeyDown = (e) => {
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = (highlightedIndex + 1) % searchResults.length;
        setHighlightedIndex(nextIdx);
        setFocusedProduct(searchResults[nextIdx]);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = (highlightedIndex - 1 + searchResults.length) % searchResults.length;
        setHighlightedIndex(prevIdx);
        setFocusedProduct(searchResults[prevIdx]);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedProd = searchResults[highlightedIndex] || searchResults[0];
        if (selectedProd) {
          openBatchSelectionModal(selectedProd);
        }
        return;
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Stage 2: Open "Available Stock" Dedicated Batch Selection Modal
  const openBatchSelectionModal = (product) => {
    const rawBatches = product.batches || [];
    if (rawBatches.length === 0) {
      alert(`"${product.name}" चा औषध साठा संपलेला आहे (Out of Stock).`);
      return;
    }

    // Sort batches by earliest expiry (FEFO)
    const sortedBatches = [...rawBatches].sort((a, b) => {
      const parseDate = (d) => {
        if (!d) return 999999;
        const parts = d.split('/');
        if (parts.length === 2) return parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
        return 999999;
      };
      return parseDate(a.expiry_date) - parseDate(b.expiry_date);
    });

    setBatchSelectModal({
      product,
      batches: sortedBatches,
      selectedIndex: 0,
      qty: 1,
      isLoose: false
    });
    setFocusedProduct(product);
    setSearchQuery('');
    setSearchResults([]);

    // Auto-focus quantity input slightly after modal renders
    setTimeout(() => {
      batchQtyInputRef.current?.focus();
      batchQtyInputRef.current?.select();
    }, 80);
  };

  // Confirm Batch Selection & Add Item to Active Slot Cart
  const confirmBatchSelection = () => {
    if (!batchSelectModal) return;
    const { product, batches, selectedIndex, qty, isLoose } = batchSelectModal;
    const selectedBatch = batches[selectedIndex] || batches[0];

    if (!selectedBatch) {
      setBatchSelectModal(null);
      return;
    }

    const validQty = Math.max(1, parseInt(qty, 10) || 1);
    const stripSize = product.strip_size || 10;
    const unitPrice = isLoose
      ? Math.round((selectedBatch.mrp / stripSize) * 100) / 100
      : selectedBatch.mrp;

    const existingIndex = cart.findIndex(
      (item) =>
        item.product_id === product.id &&
        item.batch_id === selectedBatch.id &&
        item.is_loose_tablet === isLoose
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += validQty;
      updatedCart[existingIndex].total_price = Number(
        (updatedCart[existingIndex].qty * updatedCart[existingIndex].unit_price).toFixed(2)
      );
      updateActiveSlot({ cart: updatedCart });
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        generic_salt: product.generic_salt,
        category: product.category,
        company: product.company || 'Micro Labs',
        rack_location: product.rack_location || 'Rack A-1',
        strip_size: stripSize,
        is_schedule_h1: product.is_schedule_h1,
        batch_id: selectedBatch.id,
        batch_no: selectedBatch.batch_no,
        expiry_date: selectedBatch.expiry_date,
        all_batches: batches,
        is_loose_tablet: isLoose,
        qty: validQty,
        unit_price: unitPrice,
        total_price: Number((unitPrice * validQty).toFixed(2))
      };
      updateActiveSlot({ cart: [newItem, ...cart] });
    }

    setBatchSelectModal(null);
    searchInputRef.current?.focus();
  };

  // Multi-Bill Item Shift Handlers (Photo 22: "Shift Item?")
  const openShiftItemDialog = (itemIndex) => {
    // Pick the first available alternate slot
    const target = slots.find((_, idx) => idx !== activeSlotIdx)?.id || 1;
    setShiftItemModal({ itemIndex, targetSlot: target });
  };

  const confirmShiftItem = () => {
    if (!shiftItemModal) return;
    const { itemIndex, targetSlot } = shiftItemModal;
    const itemToMove = cart[itemIndex];
    if (!itemToMove) {
      setShiftItemModal(null);
      return;
    }

    const targetIdx = targetSlot - 1;
    setSlots((prevSlots) => {
      const next = [...prevSlots];
      // 1. Remove from active slot
      const sourceCart = next[activeSlotIdx].cart.filter((_, idx) => idx !== itemIndex);
      next[activeSlotIdx] = { ...next[activeSlotIdx], cart: sourceCart };

      // 2. Add to target slot
      const destCart = [itemToMove, ...(next[targetIdx].cart || [])];
      next[targetIdx] = { ...next[targetIdx], cart: destCart };
      return next;
    });

    setShiftItemModal(null);
  };

  // Barcode Scanner Handler
  const handleBarcodeScan = async (barcode) => {
    try {
      const prod = await api.getProductByBarcode(barcode);
      if (prod) {
        openBatchSelectionModal(prod);
      } else {
        alert(`Barcode not found in catalog: ${barcode}`);
      }
    } catch (err) {
      console.error('Barcode error:', err);
    }
  };

  // Khata Balance Lookup by Mobile
  useEffect(() => {
    if (customerMobile.length === 10) {
      api.getKhataCustomers().then((custs) => {
        const found = custs.find((c) => c.mobile === customerMobile);
        if (found) {
          updateActiveSlot({
            customerName: found.name,
            existingKhataBalance: found.balance
          });
        } else {
          updateActiveSlot({ existingKhataBalance: null });
        }
      });
    } else {
      updateActiveSlot({ existingKhataBalance: null });
    }
  }, [customerMobile]);

  // Cart Qty Helpers
  const updateCartItemQty = (index, delta) => {
    const updated = [...cart];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }
    updated[index].qty = newQty;
    updated[index].total_price = Number((newQty * updated[index].unit_price).toFixed(2));
    updateActiveSlot({ cart: updated });
  };

  const setCartItemDirectQty = (index, val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const updated = [...cart];
    updated[index].qty = parsed;
    updated[index].total_price = Number((parsed * updated[index].unit_price).toFixed(2));
    updateActiveSlot({ cart: updated });
  };

  const removeCartItem = (index) => {
    updateActiveSlot({ cart: cart.filter((_, i) => i !== index) });
  };

  const handleNewSale = () => {
    updateActiveSlot(createEmptySlot(activeSlot.id));
    searchInputRef.current?.focus();
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
        updateActiveSlot({ discount: Number(maxVal.toFixed(2)) });
        return;
      }
    }
    updateActiveSlot({ discount: val });
  };

  // Checkout & Sale Completion
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('बिलामध्ये एकही औषध नाही (Cart is empty).');
      return;
    }

    if (paymentMode === 'khata') {
      if (!allowKhata) {
        alert('उधारी खाते (Khata Credit) बिलिंग ॲडमिनद्वारे बंद आहे.');
        return;
      }
      if (!customerMobile) {
        alert('उधारी बिलासाठी ग्राहकाचा १०-अंकी मोबाईल नंबर आवश्यक आहे.');
        return;
      }
    }

    // Schedule H1 Drug Compliance Check
    const hasH1Item = cart.some((it) => it.is_schedule_h1 === 1);
    if (hasH1Item && enforceH1Doctor && !doctorName.trim()) {
      alert(
        '⚠️ Schedule H1 Compliance:\n' +
        'या बिलामध्ये शेड्यूल H1 औषधे समाविष्ट आहेत.\n' +
        'डॉक्टरांचे नाव (Doctor Name) प्रविष्ट करणे कायद्यानुसार बंधनकारक आहे.'
      );
      return;
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

      // Clear current active slot upon successful sale
      handleNewSale();
    } catch (err) {
      console.error('Invoice error:', err);
      alert('बिल पूर्ण करताना त्रुटी आली: ' + err.message);
    }
  };

  // Fast Substitute Lookup
  const viewSubstitutes = async (prod, e) => {
    e.stopPropagation();
    try {
      const subs = await api.findSaltSubstitutes(prod.generic_salt, prod.id);
      setSubstitutesModal({ original: prod, substitutes: subs });
    } catch (err) {
      console.error(err);
    }
  };

  // Bottom Inspector Info (Fallback to first cart item or default)
  const inspectorData = useMemo(() => {
    if (focusedProduct) {
      return {
        drug: focusedProduct.generic_salt || 'Paracetamol 650mg',
        shelf: focusedProduct.rack_location || 'Rack A-1',
        comp: focusedProduct.company || 'Micro Labs',
        pack: `${focusedProduct.strip_size || 10} TAB`,
        batchQty: focusedProduct.batches?.[0]?.stock_qty || 0,
        totalQty: focusedProduct.total_stock || 0
      };
    }
    if (cart.length > 0) {
      const top = cart[0];
      return {
        drug: top.generic_salt || 'Paracetamol 650mg',
        shelf: top.rack_location || 'Rack A-1',
        comp: top.company || 'Micro Labs',
        pack: `${top.strip_size || 10} TAB`,
        batchQty: top.qty,
        totalQty: top.qty
      };
    }
    return {
      drug: 'काउंटर तयार आहे (Ready for billing)',
      shelf: 'Rack A-1',
      comp: storeProfile?.store_name || 'Divya Medical Stores',
      pack: '10 TAB',
      batchQty: 0,
      totalQty: 0
    };
  }, [focusedProduct, cart, storeProfile]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 text-slate-900 overflow-hidden select-none font-sans">
      
      {/* 1. TOP MULTI-BILL HOLD BAR (MediVision Parity: Slots 1 to 10) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1.5 px-3 bg-white border-b border-slate-200 text-xs shrink-0 shadow-2xs">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>SLOTS:</span>
        </span>

        {slots.map((s, idx) => {
          const isActive = idx === activeSlotIdx;
          const count = s.cart.reduce((sum, item) => sum + item.qty, 0);
          const total = s.cart.reduce((sum, item) => sum + item.total_price, 0);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSlotIdx(idx)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all select-none shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-xs ring-1 ring-emerald-500'
                  : count > 0
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
              title={`Alt+${(idx + 1) % 10} to jump to Slot ${s.id}`}
            >
              <span>{s.id}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                  isActive ? 'bg-emerald-800 text-emerald-50' : 'bg-emerald-200/90 text-emerald-900'
                }`}>
                  ₹{total.toFixed(0)} ({count})
                </span>
              )}
            </button>
          );
        })}

        {/* Phase 2: Action Buttons & Live Active Slot Running Total */}
        <div className="ml-auto flex items-center space-x-2 text-xs shrink-0">
          <button
            onClick={() => openFastProductModal(searchQuery)}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition-all"
            title="Fast Add Medicine & Batch (F3 / Ins)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Fast Item (F3)</span>
          </button>

          <button
            onClick={() => setSalesReturnModalOpen(true)}
            className="px-2.5 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-mono font-bold text-xs flex items-center space-x-1.5 transition-all"
            title="Customer Sales Return & Credit Note (Alt+R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
            <span>Return (Alt+R)</span>
          </button>

          <button
            onClick={() => {
              if (focusedProduct) {
                openTransactionsModal(focusedProduct.id, focusedProduct.name);
              } else if (cart.length > 0) {
                openTransactionsModal(cart[0].product_id, cart[0].product_name, cart[0].batch_id);
              } else {
                openFastProductModal(searchQuery);
              }
            }}
            className="px-2.5 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 font-mono font-bold text-xs flex items-center space-x-1.5 transition-all"
            title="Product Movement Transaction Ledger (Alt+T)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-700" />
            <span>Ledger (Alt+T)</span>
          </button>

          <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono font-bold text-xs flex items-center space-x-2">
            <span>Slot {activeSlotIdx + 1} =&gt;</span>
            <span className="text-emerald-950 text-sm font-extrabold">₹{netPayable.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono hidden xl:inline">
            F3: Add • Alt+T: Ledger • Alt+R: Return • F9: Print
          </span>
        </div>
      </div>


      {/* 2. TOP FAST SEARCH & MEDICINE AUTOCOMPLETE BAR (Stage 1) */}
      <div className="p-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-emerald-600" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="औषध शोधा किंवा बारकोड स्कॅन करा... (F4)"
              className="w-full pl-10 pr-32 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-all font-mono shadow-2xs"
              autoFocus
            />
            <div className="absolute right-2.5 flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                <Barcode className="w-3 h-3 text-emerald-600" /> ↑↓ नेव्हिगेट • Enter बॅच निवडा
              </span>
            </div>
          </div>

          {/* Instant Search Dropdown (Stage 1: Photo 14) */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-40 divide-y divide-slate-100 animate-in fade-in duration-100 font-mono text-slate-900">
              {searchResults.map((prod, idx) => {
                const totalStock = prod.total_stock || 0;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={prod.id}
                    className={`p-2.5 transition-colors flex items-center justify-between cursor-pointer ${
                      isHighlighted
                        ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                    onClick={() => openBatchSelectionModal(prod)}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs tracking-wide">
                          {prod.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                          isHighlighted
                            ? 'bg-white/20 text-white border border-white/40'
                            : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          {prod.rack_location || 'Rack A-1'}
                        </span>
                        {prod.is_schedule_h1 ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isHighlighted
                              ? 'bg-rose-900 text-white border border-rose-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-300'
                          }`}>
                            H1
                          </span>
                        ) : null}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase ${
                          isHighlighted
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {prod.category}
                        </span>
                      </div>

                      {prod.generic_salt && (
                        <div className={`text-[10px] font-normal truncate max-w-lg mt-0.5 ${
                          isHighlighted ? 'text-emerald-100' : 'text-slate-500'
                        }`}>
                          {prod.generic_salt} ({prod.strip_size || 10} tabs/strip)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
                      <span className={isHighlighted ? 'text-white font-bold' : 'text-emerald-700 font-bold'}>
                        Stock: {totalStock}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        isHighlighted
                          ? 'bg-white/20 text-white border border-white/40'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}>
                        Enter बॅच निवडा &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Search: Fast Add Item Prompt (Photo 8 & 9) */}
          {searchQuery.trim().length > 1 && searchResults.length === 0 && !isSearching && (
            <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-40 text-center animate-in fade-in duration-100 font-mono">
              <p className="text-xs text-slate-600 mb-2 font-medium">
                '{searchQuery}' औषध उपलब्ध नाही (Medicine not found in stock)
              </p>
              <button
                type="button"
                onClick={() => openFastProductModal(searchQuery)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>नवीन औषध व बॅच त्वरित तयार करा (F3 / Ins)</span>
              </button>
            </div>
          )}
        </div>


        {/* Quick Clear Current Bill Button (F2) */}
        <button
          onClick={handleNewSale}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono flex items-center space-x-1.5 border border-slate-300 shrink-0 font-medium transition-colors"
          title="Clear current slot bill (F2)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
          <span>New Bill (F2)</span>
        </button>
      </div>

      {/* 3. MAIN CENTER WORKSPACE: CART TABLE & DOCK */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: High-Density Counter Table */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          
          {/* Table Header Bar */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-slate-900 tracking-wider">
                CUSTOMER {activeSlotIdx + 1} BILL
              </span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 rounded text-[10px] font-bold">
                {cart.length} {cart.length === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-slate-600">Total:</span>
              <strong className="text-emerald-700 font-mono text-sm font-extrabold">₹{subtotal.toFixed(2)}</strong>
            </div>
          </div>

          {/* Table Body Container */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                  <Barcode className="w-6 h-6" />
                </div>
                <div className="text-center font-mono">
                  <div className="text-xs font-bold text-slate-700">काउंटर सज्ज आहे (Slot {activeSlotIdx + 1} Ready)</div>
                  <div className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                    औषधाचे नाव टाईप करा (F4) किंवा बारकोड स्कॅन करा.
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold sticky top-0 z-10">
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3 min-w-[200px]">Product & Salt</th>
                    <th className="py-2 px-3 w-28">Shelf (Rack)</th>
                    <th className="py-2 px-3 w-32">Batch (FIFO)</th>
                    <th className="py-2 px-3 w-24">Exp</th>
                    <th className="py-2 px-3 w-20 text-center">Qty</th>
                    <th className="py-2 px-3 w-24 text-right">Unit MRP</th>
                    <th className="py-2 px-3 w-28 text-right">Amount (₹)</th>
                    <th className="py-2 px-3 w-24 text-center">Shift</th>
                    <th className="py-2 px-3 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800">
                  {cart.map((item, idx) => (
                    <tr
                      key={`${item.product_id}-${item.batch_id}-${item.is_loose_tablet}`}
                      onMouseEnter={() => setFocusedProduct(item)}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.product_name}
                          {item.is_loose_tablet && (
                            <span className="text-[9px] ml-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Loose
                            </span>
                          )}
                        </div>
                        {item.generic_salt && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs font-normal mt-0.5">
                            {item.generic_salt}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold">
                          {item.rack_location || 'Rack A-1'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {item.batch_no}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {item.expiry_date}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-2xs">
                          <button
                            onClick={() => updateCartItemQty(idx, -1)}
                            className="px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => setCartItemDirectQty(idx, e.target.value)}
                            className="w-10 text-center text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                          />
                          <button
                            onClick={() => updateCartItemQty(idx, 1)}
                            className="px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 font-medium">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        ₹{Number(item.total_price).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openTransactionsModal(item.product_id, item.product_name, item.batch_id)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 border border-slate-300 hover:border-blue-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            title="View Stock Ledger (Alt+T)"
                          >
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>Ledger</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openShiftItemDialog(idx)}
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                            title="Shift item to another customer bill"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                            <span>Shift</span>
                          </button>
                        </div>
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

        {/* Right Side: High-Speed Checkout Sidebar */}
        <div className="w-80 bg-slate-50 p-3 flex flex-col justify-between overflow-y-auto shrink-0 border-l border-slate-200 space-y-3 font-mono">
          <div className="space-y-3">
            
            {/* Customer Khata & Mobile Section */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                <span>Customer Details</span>
                {existingKhataBalance !== null && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Khata Due: ₹{existingKhataBalance.toFixed(2)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-600 mb-0.5 block font-medium">
                  Mobile Number (Alt+H)
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-3 h-3 absolute left-2.5 text-slate-400" />
                  <input
                    ref={customerMobileRef}
                    type="tel"
                    maxLength="10"
                    value={customerMobile}
                    onChange={(e) => updateActiveSlot({ customerMobile: e.target.value.replace(/\D/g, '') })}
                    placeholder="10-digit mobile..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-600 mb-0.5 block font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => updateActiveSlot({ customerName: e.target.value })}
                  placeholder="Cash Customer / Name"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-sans text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Schedule H1 Doctor fields if required */}
              {cart.some((it) => it.is_schedule_h1 === 1) && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>FDA Schedule H1 Active</span>
                  </div>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => updateActiveSlot({ doctorName: e.target.value })}
                    placeholder="Prescribing Doctor Name..."
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    value={doctorRegNo}
                    onChange={(e) => updateActiveSlot({ doctorRegNo: e.target.value })}
                    placeholder="Doctor Reg No (MMC)..."
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600"
                  />
                </div>
              )}
            </div>

            {/* Payment Mode Selector (F8 / Alt+P) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Payment Mode (F8)</span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase">{paymentMode}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {['cash', 'upi', 'khata', 'card'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateActiveSlot({ paymentMode: mode })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase transition-all ${
                      paymentMode === mode
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-semibold'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount input */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Discount (₹):</span>
              <input
                type="number"
                min="0"
                step="1"
                value={discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

          </div>

          {/* Bottom Checkout Button & Total */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Net Payable</span>
              <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-md shadow-emerald-600/30'
              }`}
            >
              <span>बिल पूर्ण करा (F9 / Ctrl+Enter)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* 4. LIVE BOTTOM INSPECTOR PANEL (Photo 23) */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 text-xs text-slate-700 flex items-center justify-between font-mono shrink-0 select-none shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Drug (Generic Salt)</span>
            <span className="font-bold text-slate-900 truncate block max-w-xs text-xs">
              {inspectorData.drug}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Shelf (Rack Location)</span>
            <span className="font-bold text-amber-700 block text-xs">
              {inspectorData.shelf}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Company / Pack</span>
            <span className="text-slate-700 block text-xs">
              {inspectorData.comp} ({inspectorData.pack})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Stock (Batch / Total)</span>
            <span className="font-bold text-emerald-700 block text-xs">
              Batch: {inspectorData.batchQty} | Total: {inspectorData.totalQty}
            </span>
          </div>
        </div>
      </div>

      {/* 5. LIVE EXPIRY & RACK ALERT TICKER (Photos 1, 3, 7, 23) */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-1 text-[11px] font-mono text-slate-600 flex items-center overflow-hidden shrink-0 select-none">
        <span className="text-rose-700 font-bold flex items-center space-x-1 shrink-0 mr-3">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span>EXPIRY TICKER :</span>
        </span>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="animate-marquee inline-block">
            {expiryTickerItems.length > 0 ? (
              expiryTickerItems.map((item, idx) => (
                <span key={idx} className="mr-6 inline-flex items-center space-x-1.5">
                  <span className="text-slate-900 font-bold">{item.product_name}</span>
                  <span className="text-amber-700 font-semibold">[Shelf: {item.rack_location || 'Rack A-1'}]</span>
                  <span className="text-rose-700 font-semibold">Exp: {item.expiry_date}</span>
                  <span className="text-slate-600">(Qty: {item.stock_qty})</span>
                  <span className="text-slate-400">•</span>
                </span>
              ))
            ) : (
              <span className="text-slate-500 font-medium">कोणतेही औषध पुढील ३० दिवसात मुदत संपत नाही (All stock safe)</span>
            )}
          </div>
        </div>
      </div>

      {/* 6. BOTTOM FUNCTION KEYS BAR */}
      <div className="bg-white border-t border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-600 shrink-0 select-none">
        <div className="flex items-center space-x-3 overflow-x-auto">
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold border border-slate-300 shadow-2xs">F2</kbd> New Bill</span>
          <span><kbd className="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900 font-bold border border-emerald-300 shadow-2xs">F3</kbd> Fast Item</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold border border-slate-300 shadow-2xs">F4</kbd> Search</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold border border-slate-300 shadow-2xs">Alt+1..0</kbd> Slots</span>
          <span><kbd className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-bold border border-blue-300 shadow-2xs">Alt+T</kbd> Ledger</span>
          <span><kbd className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-900 font-bold border border-purple-300 shadow-2xs">Alt+R</kbd> Return</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold border border-slate-300 shadow-2xs">F8</kbd> Mode ({paymentMode.toUpperCase()})</span>
          <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold border border-slate-300 shadow-2xs">F9</kbd> Complete</span>
        </div>

        <div className="text-[10px] text-emerald-700 font-bold hidden sm:inline">
          ⚡ 100% Zero-Mouse Counter
        </div>
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* MediVision Stage 2: "Available Stock" Dedicated Batch Selection Pop-up (Photos 11 & 12) */}
      {batchSelectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 font-mono animate-in zoom-in-95">
            
            {/* Header */}
            <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Available Stock of {batchSelectModal.product.name} ({batchSelectModal.product.strip_size || 10} TAB)
                </h3>
                <p className="text-xs text-emerald-100 font-mono mt-0.5">
                  Stockist : {batchSelectModal.product.stockist_name || 'KACHOLIYA MEDICAL AGEN'} • Rack: {batchSelectModal.product.rack_location || 'General'}
                </p>
              </div>
              <div className="text-right text-xs text-slate-200 font-mono">
                <span className="bg-emerald-800/80 px-2.5 py-1 rounded text-white border border-emerald-500 font-bold">
                  {batchSelectModal.batches.length} Batches in Stock
                </span>
              </div>
            </div>

            {/* Batches Table (FEFO Sorted) */}
            <div className="overflow-y-auto flex-1 p-3">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200 font-bold">
                    <th className="py-2 px-3">Batch</th>
                    <th className="py-2 px-3">Exp.Date</th>
                    <th className="py-2 px-3">Doc. No.</th>
                    <th className="py-2 px-3">Doc. Date</th>
                    <th className="py-2 px-3 text-right">Pur.Rate</th>
                    <th className="py-2 px-3 text-right">MRP</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-center font-bold text-emerald-700">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800">
                  {batchSelectModal.batches.map((b, idx) => {
                    const isSelected = batchSelectModal.selectedIndex === idx;
                    const isNearExpiry = b.expiry_date === '10/26' || b.expiry_date === '11/26' || b.status === 'critical';
                    return (
                      <tr
                        key={b.id || idx}
                        onClick={() => setBatchSelectModal(prev => ({ ...prev, selectedIndex: idx }))}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500 shadow-sm'
                            : isNearExpiry
                              ? 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                              : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold">{b.batch_no}</td>
                        <td className="py-2.5 px-3">
                          <span className={isNearExpiry && !isSelected ? 'text-rose-700 font-bold' : ''}>
                            {b.expiry_date}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>{b.doc_no || 'CR/' + (5000 + (b.id || 1) * 19)}</td>
                        <td className={`py-2.5 px-3 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>{b.doc_date || '20/06/2026'}</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(b.purchase_rate || b.mrp * 0.7).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(b.mrp).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(b.mrp).toFixed(2)}</td>
                        <td className={`py-2.5 px-3 text-center font-bold ${isSelected ? 'text-white' : 'text-emerald-700'}`}>
                          {b.stock_qty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Quantity Input & Hotkeys */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <label className="font-bold text-slate-700">विक्री नग (Qty):</label>
                <input
                  ref={batchQtyInputRef}
                  type="number"
                  min="1"
                  max={batchSelectModal.batches[batchSelectModal.selectedIndex]?.stock_qty || 999}
                  value={batchSelectModal.qty}
                  onChange={(e) => setBatchSelectModal(prev => ({ ...prev, qty: parseInt(e.target.value, 10) || 1 }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmBatchSelection();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setBatchSelectModal(null);
                      searchInputRef.current?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setBatchSelectModal(prev => ({
                        ...prev,
                        selectedIndex: (prev.selectedIndex - 1 + prev.batches.length) % prev.batches.length
                      }));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setBatchSelectModal(prev => ({
                        ...prev,
                        selectedIndex: (prev.selectedIndex + 1) % prev.batches.length
                      }));
                    }
                  }}
                  className="w-20 px-2 py-1 bg-white border border-emerald-500 rounded text-center text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-400 focus:outline-none shadow-2xs"
                  autoFocus
                />
                {allowLooseTablets && batchSelectModal.product.category === 'medicine' && batchSelectModal.product.strip_size > 1 && (
                  <label className="flex items-center space-x-1.5 text-slate-700 text-xs cursor-pointer ml-3 font-medium">
                    <input
                      type="checkbox"
                      checked={batchSelectModal.isLoose}
                      onChange={(e) => setBatchSelectModal(prev => ({ ...prev, isLoose: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Loose Tabs (सुट्या गोळ्या)</span>
                  </label>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setBatchSelectModal(null);
                    searchInputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition-colors"
                >
                  रद्द करा (Esc)
                </button>
                <button
                  onClick={confirmBatchSelection}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm flex items-center space-x-1 transition-colors"
                >
                  <span>बिलामध्ये जोडा (Enter)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MediVision Multi-Bill Item Shift Modal (Photo 22: "Shift Item?") */}
      {shiftItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900 font-mono animate-in zoom-in-95">
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 text-xs font-bold text-blue-900 flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span>Shift Item?</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    Do you want to add this item to the list of customer{' '}
                    <select
                      value={shiftItemModal.targetSlot}
                      onChange={(e) => setShiftItemModal(prev => ({ ...prev, targetSlot: Number(e.target.value) }))}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-mono mx-1 focus:border-blue-500 shadow-2xs"
                    >
                      {slots.map((s, idx) => (
                        idx !== activeSlotIdx && (
                          <option key={s.id} value={s.id}>
                            Customer {s.id} {s.customerName ? `(${s.customerName})` : ''}
                          </option>
                        )
                      ))}
                    </select>{' '}
                    from the list of customer {activeSlotIdx + 1}?
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    Item: <strong className="text-amber-800">{cart[shiftItemModal.itemIndex]?.product_name}</strong> (Qty: {cart[shiftItemModal.itemIndex]?.qty})
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShiftItemModal(null)}
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition-colors"
                >
                  No (Esc)
                </button>
                <button
                  onClick={confirmShiftItem}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold shadow-sm transition-colors"
                  autoFocus
                >
                  Yes (Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salt Substitutes Modal */}
      {substitutesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-3 font-mono text-slate-900 animate-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Salt Substitutes: {substitutesModal.original.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Composition: {substitutesModal.original.generic_salt}
                </p>
              </div>
              <button
                onClick={() => setSubstitutesModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {substitutesModal.substitutes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  समान घटक असलेले इतर कोणतेही औषध उपलब्ध नाही.
                </div>
              ) : (
                substitutesModal.substitutes.map((sub) => (
                  <div
                    key={sub.id}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-md transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{sub.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="text-amber-800 font-bold">
                          Rack: {sub.rack_location || 'Rack A-1'}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          In Stock: {sub.total_stock}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        openBatchSelectionModal(sub);
                        setSubstitutesModal(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs transition-colors"
                    >
                      Select Brand
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-200">
              <button
                onClick={() => setSubstitutesModal(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium shadow-2xs transition-colors"
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
        <div className="fixed bottom-12 right-6 z-50 bg-white text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-amber-400 flex items-center space-x-2.5 animate-in slide-in-from-bottom duration-200 font-mono">
          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-amber-900">{shortageToast}</span>
        </div>
      )}

      {/* Phase 2: In-Line Fast Product & Batch Creation (Photos 8 & 9 - F3 / Ins) */}
      <FastProductCreateModal
        isOpen={fastProductModalOpen}
        initialName={fastProductInitialName}
        onClose={() => setFastProductModalOpen(false)}
        onProductCreated={handleFastProductCreated}
      />

      {/* Phase 2: Product Movement Transaction Ledger (Photo 16 - Alt+T) */}
      <ProductTransactionsModal
        isOpen={!!transactionsModal}
        productId={transactionsModal?.productId}
        productName={transactionsModal?.productName}
        initialBatchId={transactionsModal?.batchId}
        onClose={() => setTransactionsModal(null)}
      />

      {/* Phase 2: Customer Sales Return / Credit Note (Photos 17 & 19 - Alt+R) */}
      <SalesReturnModal
        isOpen={salesReturnModalOpen}
        onClose={() => setSalesReturnModalOpen(false)}
        onReturnCompleted={(res) => {
          setShortageToast(`रिटर्न नोंद #${res.return_no} यशस्वी!`);
          setTimeout(() => setShortageToast(null), 4000);
        }}
      />

    </div>

  );
}
