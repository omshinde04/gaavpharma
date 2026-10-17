import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  X,
  Sparkles,
  Percent,
  Layers,
  Clock,
  ShieldAlert,
  RotateCcw,
  Printer,
  Share2,
  BookOpen,
  Send,
  Copy,
  Check,
  ShoppingCart,
  Filter,
  ArrowRightCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function PurchaseDistributorManager({ currentUser, featureToggles, storeProfile }) {
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const allowCashierPurchases = featureToggles?.allow_cashier_purchase_inward === true ||
    featureToggles?.allow_cashier_purchase_inward === 'true' ||
    featureToggles?.allow_cashier_purchase_inward === 1;

  // If cashier and not allowed, display access restriction
  if (isCashier && !allowCashierPurchases) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Restricted Module (Store Owner Only)</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Wholesale purchase inwarding and supplier ledger data is confidential. Contact your store owner to enable cashier access in Store Admin Settings.
        </p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState('bills'); // 'bills' | 'distributors' | 'debit_notes' | 'shortage'
  const [purchases, setPurchases] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [shortageItems, setShortageItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total_bills: 0, total_spent: 0, total_payable: 0, distributor_count: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Shortage Diary ("तोटा नोंदवही") State
  const [shortageStatusFilter, setShortageStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ORDERED'
  const [shortageDistFilter, setShortageDistFilter] = useState('all');
  const [shortageViewMode, setShortageViewMode] = useState('grouped'); // 'grouped' | 'table'
  const [showAddShortageModal, setShowAddShortageModal] = useState(false);
  const [showWhatsAppPreviewModal, setShowWhatsAppPreviewModal] = useState(null); // { distributor, items, text }
  const [isSyncingShortages, setIsSyncingShortages] = useState(false);
  const [shortageToast, setShortageToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributorFilter, setSelectedDistributorFilter] = useState('all');

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(null); // distributor object
  const [showLedgerModal, setShowLedgerModal] = useState(null); // distributor object
  const [showBillDetailsModal, setShowBillDetailsModal] = useState(null); // purchase object
  const [showNewDebitNoteModal, setShowNewDebitNoteModal] = useState(false);
  const [showDebitNoteDetailsModal, setShowDebitNoteDetailsModal] = useState(null); // debit note object
  const [showDebitNotePrintModal, setShowDebitNotePrintModal] = useState(null); // debit note object
  const [ledgerData, setLedgerData] = useState(null);

  // Settle Payment State
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState('NEFT_UPI');
  const [settleReference, setSettleReference] = useState('');
  const [settleNote, setSettleNote] = useState('Payment settled');

  // New Distributor Form State
  const [newDistributor, setNewDistributor] = useState({
    name: '',
    phone: '',
    gstin: '',
    dl_number: '',
    address: '',
    payment_terms_days: 21
  });

  // New Purchase Inward Bill State
  const initialPurchaseForm = {
    distributor_id: '',
    purchase_invoice_no: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    payment_status: 'UNPAID',
    payment_mode: 'credit',
    paid_amount: '0',
    notes: '',
    due_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
  };
  const [purchaseForm, setPurchaseForm] = useState(initialPurchaseForm);

  const initialItemRow = {
    product_id: '',
    product_name: '',
    generic_salt: '',
    batch_no: '',
    expiry_date: '',
    qty: '',
    free_qty: '0',
    purchase_rate: '',
    gst_rate: '12',
    discount_percent: '0',
    mrp: ''
  };
  const [purchaseItems, setPurchaseItems] = useState([{ ...initialItemRow }]);

  // New Debit Note Form State
  const initialDebitNoteForm = {
    distributor_id: '',
    note_no: '',
    note_date: new Date().toISOString().slice(0, 10),
    reason: 'EXPIRY_RETURN',
    notes: ''
  };
  const [debitNoteForm, setDebitNoteForm] = useState(initialDebitNoteForm);

  const initialDebitItemRow = {
    product_id: '',
    product_name: '',
    generic_salt: '',
    batch_no: '',
    expiry_date: '',
    qty: '',
    purchase_rate: '',
    gst_rate: '12'
  };
  const [debitNoteItems, setDebitNoteItems] = useState([{ ...initialDebitItemRow }]);

  // New Shortage Item Form State
  const initialShortageForm = {
    product_id: '',
    medicine_name: '',
    generic_salt: '',
    current_stock: 0,
    min_stock_alert: 10,
    suggested_qty: 10,
    distributor_id: '',
    source: 'COUNTER_MANUAL',
    notes: ''
  };
  const [newShortageForm, setNewShortageForm] = useState(initialShortageForm);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [distList, purchaseList, prodList, summ, notesList, diaryList] = await Promise.all([
        api.getDistributors(),
        api.getPurchases(50),
        api.getAllProducts('all'),
        api.getPurchaseSummary(),
        api.getDebitNotes ? api.getDebitNotes(50) : Promise.resolve([]),
        api.getShortageDiary ? api.getShortageDiary({ status: 'ALL' }) : Promise.resolve([])
      ]);
      setDistributors(distList || []);
      setPurchases(purchaseList || []);
      setProducts(prodList || []);
      setDebitNotes(notesList || []);
      setShortageItems(diaryList || []);
      if (summ) setSummary(summ);
      if (distList && distList.length > 0 && !purchaseForm.distributor_id) {
        setPurchaseForm(prev => ({ ...prev, distributor_id: String(distList[0].id) }));
      }
      if (distList && distList.length > 0 && !debitNoteForm.distributor_id) {
        setDebitNoteForm(prev => ({ ...prev, distributor_id: String(distList[0].id) }));
      }
    } catch (err) {
      console.error('Error loading purchase manager data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live totals for Inward Modal
  const computedInvoiceTotals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalUnitsCount = 0;

    const rowDetails = purchaseItems.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const freeQty = parseFloat(item.free_qty) || 0;
      const ptr = parseFloat(item.purchase_rate) || 0;
      const discPercent = parseFloat(item.discount_percent) || 0;
      const gstPercent = parseFloat(item.gst_rate) || 0;

      const totalUnits = qty + freeQty;
      totalUnitsCount += totalUnits;

      const baseAmount = qty * ptr;
      const discAmount = baseAmount * (discPercent / 100);
      const taxableAmount = Math.max(0, baseAmount - discAmount);
      const gstAmount = taxableAmount * (gstPercent / 100);
      const lineTotal = taxableAmount + gstAmount;

      const landingCost = totalUnits > 0 ? lineTotal / totalUnits : ptr;

      subtotal += taxableAmount;
      totalTax += gstAmount;
      totalDiscount += discAmount;

      return {
        ...item,
        taxableAmount,
        gstAmount,
        lineTotal,
        landingCost: Number(landingCost.toFixed(2))
      };
    });

    const netAmount = subtotal + totalTax;

    return {
      rowDetails,
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      totalUnitsCount
    };
  }, [purchaseItems]);

  const handleAddItemRow = () => {
    setPurchaseItems(prev => [...prev, { ...initialItemRow }]);
  };

  const handleRemoveItemRow = (index) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setPurchaseItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If product_id changed, auto-fill product details
      if (field === 'product_id') {
        const prod = products.find(p => p.id === Number(value));
        if (prod) {
          updated[index].product_name = prod.name;
          updated[index].generic_salt = prod.generic_salt || '';
          if (prod.batches && prod.batches.length > 0) {
            const b = prod.batches[0];
            updated[index].mrp = String(b.mrp || '');
            updated[index].purchase_rate = String(b.purchase_rate || '');
          }
        }
      }
      return updated;
    });
  };

  const handleSavePurchaseBill = async (e) => {
    e.preventDefault();
    if (!purchaseForm.distributor_id) {
      alert('Please select a wholesale distributor.');
      return;
    }
    if (!purchaseForm.purchase_invoice_no.trim()) {
      alert('Distributor Bill / Invoice number is mandatory.');
      return;
    }
    if (purchaseItems.some(i => !i.product_id || !i.batch_no || !i.expiry_date || !i.qty || !i.purchase_rate || !i.mrp)) {
      alert('Please complete all medicine line items (Product, Batch, Expiry, Qty, PTR, MRP).');
      return;
    }

    try {
      const payload = {
        ...purchaseForm,
        subtotal: computedInvoiceTotals.subtotal,
        tax_amount: computedInvoiceTotals.totalTax,
        discount: computedInvoiceTotals.totalDiscount,
        net_amount: computedInvoiceTotals.netAmount,
        paid_amount: parseFloat(purchaseForm.paid_amount) || 0,
        payment_status: parseFloat(purchaseForm.paid_amount) >= computedInvoiceTotals.netAmount ? 'PAID' : (parseFloat(purchaseForm.paid_amount) > 0 ? 'PARTIAL' : 'UNPAID')
      };

      const itemsPayload = computedInvoiceTotals.rowDetails.map(r => ({
        product_id: Number(r.product_id),
        product_name: r.product_name,
        generic_salt: r.generic_salt,
        batch_no: r.batch_no.trim().toUpperCase(),
        expiry_date: r.expiry_date.trim(),
        qty: parseInt(r.qty, 10),
        free_qty: parseInt(r.free_qty, 10) || 0,
        purchase_rate: parseFloat(r.purchase_rate),
        mrp: parseFloat(r.mrp),
        gst_rate: parseFloat(r.gst_rate) || 12,
        discount_percent: parseFloat(r.discount_percent) || 0,
        landing_cost_per_unit: r.landingCost,
        total_amount: r.lineTotal
      }));

      await api.createPurchase(payload, itemsPayload);
      setShowInwardModal(false);
      setPurchaseForm(initialPurchaseForm);
      setPurchaseItems([{ ...initialItemRow }]);
      await loadData();
      alert(`Wholesale Purchase Bill #${payload.purchase_invoice_no} inwarded to stock successfully!`);
    } catch (err) {
      console.error('Failed to inward purchase bill:', err);
      alert('Error saving purchase bill. Please review all fields.');
    }
  };

  // Compute live totals for Debit Note Modal
  const computedDebitNoteTotals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalQty = 0;

    const rowDetails = debitNoteItems.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const ptr = parseFloat(item.purchase_rate) || 0;
      const gstPercent = parseFloat(item.gst_rate) || 0;

      totalQty += qty;
      const taxable = qty * ptr;
      const cgst = (taxable * (gstPercent / 2)) / 100;
      const sgst = (taxable * (gstPercent / 2)) / 100;
      const lineTax = cgst + sgst;
      const lineTotal = taxable + lineTax;

      subtotal += taxable;
      totalTax += lineTax;

      return {
        ...item,
        taxable,
        cgst,
        sgst,
        lineTax,
        lineTotal
      };
    });

    const totalClaim = subtotal + totalTax;

    return {
      rowDetails,
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalClaim: Number(totalClaim.toFixed(2)),
      totalQty
    };
  }, [debitNoteItems]);

  const handleAddDebitItemRow = () => {
    setDebitNoteItems(prev => [...prev, { ...initialDebitItemRow }]);
  };

  const handleRemoveDebitItemRow = (index) => {
    if (debitNoteItems.length === 1) return;
    setDebitNoteItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDebitItemChange = (index, field, value) => {
    setDebitNoteItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'product_id') {
        const prod = products.find(p => p.id === Number(value));
        if (prod) {
          updated[index].product_name = prod.name;
          updated[index].generic_salt = prod.generic_salt || '';
          if (prod.batches && prod.batches.length > 0) {
            const b = prod.batches[0];
            updated[index].batch_no = b.batch_no || '';
            updated[index].expiry_date = b.expiry_date || '';
            updated[index].purchase_rate = String(b.purchase_rate || '');
          }
        }
      }
      return updated;
    });
  };

  const handleSaveDebitNote = async (e) => {
    e.preventDefault();
    if (!debitNoteForm.distributor_id) {
      alert('Please select a wholesale distributor.');
      return;
    }
    const validItems = computedDebitNoteTotals.rowDetails.filter(r => r.product_id && r.batch_no && r.qty > 0 && r.purchase_rate > 0);
    if (validItems.length === 0) {
      alert('Please specify at least 1 valid returned medicine item with batch, quantity, and PTR.');
      return;
    }

    try {
      const payload = {
        ...debitNoteForm,
        subtotal: computedDebitNoteTotals.subtotal,
        tax_amount: computedDebitNoteTotals.totalTax,
        total_claim_amount: computedDebitNoteTotals.totalClaim
      };

      const itemsPayload = validItems.map(r => ({
        product_id: Number(r.product_id),
        product_name: r.product_name,
        batch_no: r.batch_no.trim().toUpperCase(),
        expiry_date: r.expiry_date.trim(),
        qty: parseInt(r.qty, 10),
        purchase_rate: parseFloat(r.purchase_rate),
        gst_rate: parseFloat(r.gst_rate) || 12,
        taxable_amount: r.taxable,
        cgst_amount: r.cgst,
        sgst_amount: r.sgst,
        total_amount: r.lineTotal
      }));

      const created = await api.createDebitNote(payload, itemsPayload);
      setShowNewDebitNoteModal(false);
      setDebitNoteForm(initialDebitNoteForm);
      setDebitNoteItems([{ ...initialDebitItemRow }]);
      await loadData();
      alert(`GST Expiry Debit Note #${created.note_no} created! ₹${created.total_claim_amount.toFixed(2)} credited to ledger.`);
    } catch (err) {
      console.error(err);
      alert('Failed to save debit note. Please check all fields.');
    }
  };

  const sendWhatsAppDebitSlip = (dn) => {
    const phone = dn.distributor_phone?.replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) {
      alert('Valid 10-digit mobile number not found for distributor.');
      return;
    }
    const storeName = storeProfile?.store_name || 'Divya Medical Stores';
    const msg = 
`*GST EXPIRY RETURN MEMO / DEBIT NOTE*
🏥 *${storeName}*
To: *${dn.distributor_name}*
📄 Debit Note No: *#${dn.note_no}*
📅 Date: ${dn.note_date}
📦 Items: ${dn.item_count || (dn.items ? dn.items.length : 1)} returned

💰 *Taxable Return:* ₹${Number(dn.subtotal).toFixed(2)}
⚖️ *GST (CGST+SGST):* ₹${Number(dn.tax_amount).toFixed(2)}
🔴 *TOTAL CLAIM CREDITED:* *₹${Number(dn.total_claim_amount).toFixed(2)}*

_This debit note amount has been adjusted against your ledger pending balance under Sec 34 CGST Act._
Generated via GaavPharma Pharmacy ERP`;

    const encoded = encodeURIComponent(msg);
    api.openExternalUrl(`https://wa.me/91${phone}?text=${encoded}`);
  };

  const handleCreateDistributor = async (e) => {
    e.preventDefault();
    if (!newDistributor.name.trim() || !newDistributor.phone.trim()) {
      alert('Distributor Name and Phone Number are required.');
      return;
    }
    try {
      await api.addDistributor(newDistributor);
      setShowAddDistributorModal(false);
      setNewDistributor({ name: '', phone: '', gstin: '', dl_number: '', address: '', payment_terms_days: 21 });
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to register distributor.');
    }
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Enter a valid settlement amount.');
      return;
    }
    try {
      await api.addDistributorPayment(showSettleModal.id, amt, settleMode, settleReference, settleNote);
      setShowSettleModal(null);
      setSettleAmount('');
      setSettleReference('');
      await loadData();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to record payment.');
    }
  };

  const handleOpenLedger = async (dist) => {
    setShowLedgerModal(dist);
    try {
      const data = await api.getDistributorLedger(dist.id);
      setLedgerData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendWhatsAppStatement = (dist) => {
    const phone = dist.phone?.replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) {
      alert('Valid 10-digit mobile number not found for distributor.');
      return;
    }
    const storeName = storeProfile?.store_name || 'Divya Medical Stores';
    const msg =
      `*PURCHASE LEDGER STATEMENT*%0A` +
      `--------------------------------%0A` +
      `To: *${dist.name}*%0A` +
      `From: *${storeName}*%0A` +
      `Current Pending Balance: *₹${Number(dist.pending_balance || 0).toFixed(2)}*%0A` +
      `Date: ${new Date().toLocaleDateString('en-IN')}%0A` +
      `--------------------------------%0A` +
      `Please verify and confirm the ledger account balance.`;

    const url = `https://wa.me/${phone.startsWith('91') ? phone : `91${phone}`}?text=${msg}`;
    api.openExternalUrl(url);
  };

  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || p.purchase_invoice_no?.toLowerCase().includes(q) || p.distributor_name?.toLowerCase().includes(q);
    const matchDist = selectedDistributorFilter === 'all' || String(p.distributor_id) === String(selectedDistributorFilter);
    return matchQuery && matchDist;
  });

  const filteredDistributors = distributors.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    return !q || d.name?.toLowerCase().includes(q) || d.phone?.includes(q) || d.gstin?.toLowerCase().includes(q);
  });

  const filteredDebitNotes = debitNotes.filter(dn => {
    const q = searchQuery.toLowerCase().trim();
    return !q || dn.note_no?.toLowerCase().includes(q) || dn.distributor_name?.toLowerCase().includes(q);
  });

  const totalDebitClaim = useMemo(() => {
    return debitNotes.reduce((acc, dn) => acc + (dn.total_claim_amount || 0), 0);
  }, [debitNotes]);

  // Shortage Handlers ("तोटा नोंदवही")
  const handleSyncAutoShortages = async () => {
    setIsSyncingShortages(true);
    try {
      const res = await api.syncAutoShortages();
      const updated = await api.getShortageDiary({ status: 'ALL' });
      setShortageItems(updated || []);
      setShortageToast(`तोटा वही सिंक पूर्ण! ${res?.syncedCount || 0} औषधे नोंदवली गेली.`);
      setTimeout(() => setShortageToast(null), 3500);
    } catch (err) {
      console.error('Error syncing shortages:', err);
    } finally {
      setIsSyncingShortages(false);
    }
  };

  const handleSaveNewShortageItem = async (e) => {
    e.preventDefault();
    if (!newShortageForm.medicine_name.trim()) {
      alert('Please enter medicine name');
      return;
    }
    try {
      await api.addShortageItem(newShortageForm);
      setShowAddShortageModal(false);
      setNewShortageForm(initialShortageForm);
      const updated = await api.getShortageDiary({ status: 'ALL' });
      setShortageItems(updated || []);
      setShortageToast('नवीन औषध तोटा नोंदवहीत जोडले गेले!');
      setTimeout(() => setShortageToast(null), 3000);
    } catch (err) {
      console.error('Error saving shortage:', err);
      alert(err.message);
    }
  };

  const handleUpdateShortageQty = async (id, delta) => {
    const item = shortageItems.find(s => s.id === id);
    if (!item) return;
    const newQty = Math.max(1, (item.suggested_qty || 10) + delta);
    try {
      await api.updateShortageItem(id, { suggested_qty: newQty });
      setShortageItems(prev => prev.map(s => s.id === id ? { ...s, suggested_qty: newQty } : s));
    } catch (err) {
      console.error('Error updating qty:', err);
    }
  };

  const handleToggleOrderStatus = async (item) => {
    try {
      const newStatus = item.status === 'ORDERED' ? 'PENDING' : 'ORDERED';
      await api.updateShortageItem(item.id, { status: newStatus });
      setShortageItems(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus, ordered_at: newStatus === 'ORDERED' ? new Date().toISOString() : null } : s));
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteShortage = async (id) => {
    if (!confirm('ही औषध नोंद तोटा वहीतून हटवायची आहे का?')) return;
    try {
      await api.deleteShortageItem(id);
      setShortageItems(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting shortage:', err);
    }
  };

  const handleSendGroupWhatsAppPO = async (distributor, items) => {
    const text = api.generateWhatsAppPOText({ storeProfile, distributor, items });
    const rawPhone = distributor?.phone ? distributor.phone.replace(/[^0-9]/g, '') : '';
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    api.openExternalUrl(url);
    await api.markShortageAsOrdered(items.map(i => i.id), distributor?.id);
    const updated = await api.getShortageDiary({ status: 'ALL' });
    setShortageItems(updated || []);
    setShortageToast(`WhatsApp खरेदी ऑर्डर पाठवली! ${items.length} आयटम्स ORDERED मार्क झाले.`);
    setTimeout(() => setShortageToast(null), 4000);
  };

  const handleCopyGroupPOText = (distributor, items) => {
    const text = api.generateWhatsAppPOText({ storeProfile, distributor, items });
    navigator.clipboard.writeText(text);
    setCopiedId(distributor?.id || 'unassigned');
    setTimeout(() => setCopiedId(null), 2500);
    setShortageToast('खरेदी ऑर्डर क्लिपबोर्डवर कॉपी केली!');
    setTimeout(() => setShortageToast(null), 3000);
  };

  const handleConvertGroupToInward = (distributor, items) => {
    if (distributor && distributor.id) {
      setPurchaseForm(prev => ({
        ...prev,
        distributor_id: String(distributor.id)
      }));
    }
    const rows = items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      const firstBatch = prod?.batches?.[0];
      return {
        product_id: item.product_id ? String(item.product_id) : '',
        product_name: item.medicine_name,
        generic_salt: item.generic_salt || prod?.generic_salt || '',
        batch_no: '',
        expiry_date: '',
        qty: String(item.suggested_qty || 10),
        free_qty: '0',
        purchase_rate: firstBatch ? String(firstBatch.purchase_rate || '') : '',
        gst_rate: '12',
        discount_percent: '0',
        mrp: firstBatch ? String(firstBatch.mrp || '') : ''
      };
    });
    setPurchaseItems(rows.length > 0 ? rows : [{ ...initialItemRow }]);
    setShowInwardModal(true);
  };

  const filteredShortageItems = useMemo(() => {
    return shortageItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        item.medicine_name?.toLowerCase().includes(q) ||
        item.generic_salt?.toLowerCase().includes(q) ||
        item.dist_name?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q);

      const matchStatus = shortageStatusFilter === 'ALL' || item.status === shortageStatusFilter;
      const matchDist = shortageDistFilter === 'all' ||
        (shortageDistFilter === 'unassigned' && !item.distributor_id) ||
        String(item.distributor_id) === String(shortageDistFilter);

      return matchQuery && matchStatus && matchDist;
    });
  }, [shortageItems, searchQuery, shortageStatusFilter, shortageDistFilter]);

  const shortageDistributorGroups = useMemo(() => {
    const groups = {};
    filteredShortageItems.forEach(item => {
      const distId = item.distributor_id || 'unassigned';
      if (!groups[distId]) {
        const distObj = distributors.find(d => String(d.id) === String(distId));
        groups[distId] = {
          distributorId: distId,
          distributor: distObj || { id: null, name: item.dist_name || 'Unassigned Wholesalers (सप्लायर निवडायचा आहे)', phone: '' },
          items: []
        };
      }
      groups[distId].items.push(item);
    });
    return Object.values(groups);
  }, [filteredShortageItems, distributors]);

  const pendingShortageCount = useMemo(() => {
    return shortageItems.filter(s => s.status === 'PENDING').length;
  }, [shortageItems]);

  const orderedShortageCount = useMemo(() => {
    return shortageItems.filter(s => s.status === 'ORDERED').length;
  }, [shortageItems]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none font-sans text-xs">
      {/* Top Header Bar */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Distributor Management, Wholesale & Debit Notes (खरेदी, सप्लायर खाते व माल परतावा)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wholesale tax invoices, auto stock updates, GST Input Credit, vendor ledgers, and Section 34 Expiry Debit Notes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {activeSubTab === 'shortage' ? (
            <>
              <button
                onClick={handleSyncAutoShortages}
                disabled={isSyncingShortages}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-colors"
                title="Check all products against min stock alert and auto-fill shortages"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncingShortages ? 'animate-spin' : ''}`} />
                <span>Auto-Scan Shortages</span>
              </button>

              <button
                onClick={() => setShowAddShortageModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ तोटा नोंदवा (Add Item)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddDistributorModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>+ New Distributor</span>
              </button>

              <button
                onClick={() => setShowNewDebitNoteModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold shadow-2xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>+ Expiry Debit Note</span>
              </button>

              <button
                onClick={() => setShowInwardModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Inward Purchase Bill</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200/80 shrink-0">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Wholesale Purchases</span>
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            ₹{summary.total_spent?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {summary.total_bills || 0} bills recorded
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-rose-800 uppercase tracking-wider">
            <span>Payable (आपले देणे)</span>
            <DollarSign className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            ₹{summary.total_payable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">
            Pending supplier dues
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-rose-800 uppercase tracking-wider">
            <span>Expiry Claims (परतावा)</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            ₹{totalDebitClaim.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">
            {debitNotes.length} GST debit notes
          </div>
        </div>

        <div 
          onClick={() => setActiveSubTab('shortage')}
          className="p-3 bg-white rounded-xl border border-amber-300 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
            <span>Shortage Diary (तोटा नोंद)</span>
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1 flex items-baseline gap-2">
            <span>{pendingShortageCount}</span>
            <span className="text-[11px] font-normal text-slate-500 font-sans">
              to order ({orderedShortageCount} sent)
            </span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
            <span>1-Click WhatsApp POs</span>
            <ArrowRightCircle className="w-2.5 h-2.5 text-amber-600" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Stockists & Wholesalers</span>
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {distributors.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Ghoti & Nashik agencies
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="px-5 pt-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex space-x-6 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('bills')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bills'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Inwarded Bills ({purchases.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('distributors')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'distributors'
                ? 'border-blue-600 text-blue-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Distributor Directory & Ledgers ({distributors.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('debit_notes')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'debit_notes'
                ? 'border-rose-600 text-rose-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Expiry Debit Notes (माल परतावा) ({debitNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shortage')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'shortage'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Shortage Diary & WhatsApp Orders (तोटा नोंदवही)</span>
            {pendingShortageCount > 0 ? (
              <span className="bg-amber-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {pendingShortageCount}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">({shortageItems.length})</span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64 pb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'bills'
                ? 'Search by bill no, supplier...'
                : activeSubTab === 'distributors'
                ? 'Search supplier, phone, GSTIN...'
                : activeSubTab === 'debit_notes'
                ? 'Search debit note no, supplier...'
                : 'Search shortage medicine, salt, stockist...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeSubTab === 'bills' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 w-36">Invoice No</th>
                  <th className="py-2.5 px-3.5 w-28">Bill Date</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Distributor / Agency</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Items</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Taxable</th>
                  <th className="py-2.5 px-3.5 w-28 text-right">GST</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Total Net (₹)</th>
                  <th className="py-2.5 px-3.5 w-28 text-center">Status</th>
                  <th className="py-2.5 px-3.5 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400 font-sans">
                      <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div>No wholesale purchase bills recorded yet.</div>
                      <button
                        onClick={() => setShowInwardModal(true)}
                        className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                      >
                        + Inward your first distributor invoice
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{p.purchase_invoice_no}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[10px]">{p.invoice_date}</td>
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900">
                        {p.distributor_name}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">{p.item_count || (p.items ? p.items.length : 1)}</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600">₹{Number(p.subtotal || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600">₹{Number(p.tax_amount || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">₹{Number(p.net_amount || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            p.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          onClick={() => setShowBillDetailsModal(p)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-sans inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'distributors' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Agency / Distributor</th>
                  <th className="py-2.5 px-3.5 w-32">Mobile</th>
                  <th className="py-2.5 px-3.5 w-36">GSTIN</th>
                  <th className="py-2.5 px-3.5 w-32">DL No</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Credit Term</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Net Payable (देणे)</th>
                  <th className="py-2.5 px-3.5 text-center w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredDistributors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-400 font-sans">
                      No distributors found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredDistributors.map((d, idx) => {
                    const hasDues = (d.pending_balance || 0) > 0;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                          {d.name}
                          {d.address && <div className="text-[10px] font-normal text-slate-400">{d.address}</div>}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">{d.phone || '-'}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-[10px]">{d.gstin || '-'}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-[10px]">{d.dl_number || '-'}</td>
                        <td className="py-2.5 px-3.5 text-center text-slate-500 font-sans">{d.payment_terms_days || 21} Days</td>
                        <td className={`py-2.5 px-3.5 text-right font-bold ${hasDues ? 'text-rose-600 text-xs' : 'text-emerald-700'}`}>
                          ₹{Number(d.pending_balance || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans space-x-1.5">
                          {hasDues && (
                            <button
                              onClick={() => {
                                setShowSettleModal(d);
                                setSettleAmount(String(d.pending_balance));
                              }}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Settle</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenLedger(d)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium inline-flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ledger</span>
                          </button>
                          <button
                            onClick={() => sendWhatsAppStatement(d)}
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            title="Send WhatsApp balance confirmation"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 3: Expiry Debit Notes (माल परतावा) */}
        {activeSubTab === 'debit_notes' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 w-36">Debit Note No</th>
                  <th className="py-2.5 px-3.5 w-28">Issue Date</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Distributor / Stockist</th>
                  <th className="py-2.5 px-3.5 w-32">Return Reason</th>
                  <th className="py-2.5 px-3.5 w-20 text-center">Items</th>
                  <th className="py-2.5 px-3.5 w-28 text-right">Taxable (PTR)</th>
                  <th className="py-2.5 px-3.5 w-28 text-right">GST Claim</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Total Claim (₹)</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Status</th>
                  <th className="py-2.5 px-3.5 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredDebitNotes.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400 font-sans">
                      <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div>No GST Expiry Debit Notes issued yet.</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Return near-expiry medicines to stockists to reverse GST and reduce your supplier debt.
                      </p>
                      <button
                        onClick={() => setShowNewDebitNoteModal(true)}
                        className="mt-2 text-xs text-rose-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Issue your first Expiry Debit Note</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredDebitNotes.map((dn, idx) => (
                    <tr key={dn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{dn.note_no}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[10px]">{dn.note_date}</td>
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900">
                        <div>{dn.distributor_name}</div>
                        {dn.distributor_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">{dn.distributor_phone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {dn.reason === 'EXPIRY_RETURN' ? 'Expiry Return' : dn.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">{dn.item_count || (dn.items ? dn.items.length : 1)}</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600">₹{Number(dn.subtotal || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600">₹{Number(dn.tax_amount || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-700">₹{Number(dn.total_claim_amount || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {dn.status || 'ISSUED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans space-x-1 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            const details = await api.getDebitNoteDetails(dn.id);
                            setShowDebitNoteDetailsModal(details || dn);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                          title="View Return Items"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            const details = await api.getDebitNoteDetails(dn.id);
                            setShowDebitNotePrintModal(details || dn);
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors"
                          title="Print Delivery Slip for Agency Van"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => sendWhatsAppDebitSlip(dn)}
                          className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors"
                          title="Send WhatsApp Debit Memo"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 4: Shortage Diary & WhatsApp Purchase Orders ("तोटा नोंदवही") */}
        {activeSubTab === 'shortage' && (
          <div className="space-y-4">
            {/* Shortage Filter & View Mode Controls Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
              {/* Left: Status Filter Pills */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <span>Status:</span>
                </span>
                <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setShortageStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      shortageStatusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({shortageItems.length})
                  </button>
                  <button
                    onClick={() => setShortageStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                      shortageStatusFilter === 'PENDING'
                        ? 'bg-white text-amber-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Pending ({pendingShortageCount})</span>
                  </button>
                  <button
                    onClick={() => setShortageStatusFilter('ORDERED')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                      shortageStatusFilter === 'ORDERED'
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-3 h-3 text-blue-600" />
                    <span>Ordered ({orderedShortageCount})</span>
                  </button>
                </div>
              </div>

              {/* Middle: Distributor Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-500">Stockist:</span>
                <select
                  value={shortageDistFilter}
                  onChange={(e) => setShortageDistFilter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white"
                >
                  <option value="all">All Stockists & Wholesalers</option>
                  <option value="unassigned">Unassigned (सप्लायर ठरवायचा आहे)</option>
                  {distributors.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Right: View Mode Toggle */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setShortageViewMode('grouped')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    shortageViewMode === 'grouped'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <span>Group by Stockist</span>
                </button>
                <button
                  onClick={() => setShortageViewMode('table')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    shortageViewMode === 'table'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3 h-3 text-slate-600" />
                  <span>List View</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredShortageItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200/80 shadow-2xs">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">तोटा नोंदवहीत कोणतीही औषध नोंद नाही (Shortage Diary is Clear)</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  All medicines are currently stocked above their minimum alert levels. You can auto-scan your entire inventory or manually log walk-in customer demand.
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button
                    onClick={handleSyncAutoShortages}
                    disabled={isSyncingShortages}
                    className="px-3.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncingShortages ? 'animate-spin' : ''}`} />
                    <span>Auto-Scan Inventory for Low Stock</span>
                  </button>
                  <button
                    onClick={() => setShowAddShortageModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Manually Log Medicine Demand</span>
                  </button>
                </div>
              </div>
            ) : shortageViewMode === 'grouped' ? (
              /* Grouped by Distributor Cards View */
              <div className="grid grid-cols-1 gap-4">
                {shortageDistributorGroups.map((group) => {
                  const dist = group.distributor;
                  const isUnassigned = group.distributorId === 'unassigned' || !dist?.id;
                  const pendingItems = group.items.filter(i => i.status === 'PENDING');
                  const orderedItems = group.items.filter(i => i.status === 'ORDERED');

                  return (
                    <div
                      key={group.distributorId}
                      className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
                        isUnassigned
                          ? 'border-slate-300'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isUnassigned
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-sm text-slate-900 tracking-tight">
                                {dist?.name || 'Unassigned Wholesalers (सप्लायर ठरवायचा आहे)'}
                              </h4>
                              {pendingItems.length > 0 && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full text-[10px] font-bold">
                                  {pendingItems.length} to order
                                </span>
                              )}
                              {orderedItems.length > 0 && (
                                <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.2 rounded-full text-[10px] font-semibold flex items-center gap-1">
                                  <Truck className="w-2.5 h-2.5" />
                                  <span>{orderedItems.length} ordered</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-3 mt-0.5">
                              {dist?.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{dist.phone}</span>
                                </span>
                              )}
                              {dist?.dl_number && (
                                <span className="font-mono text-slate-400">
                                  DL: {dist.dl_number}
                                </span>
                              )}
                              {dist?.address && (
                                <span className="text-slate-400 truncate max-w-xs">
                                  {dist.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Fast Group Order Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyGroupPOText(dist, group.items)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors flex items-center gap-1"
                            title="Copy formatted purchase order text to clipboard"
                          >
                            {copiedId === (dist?.id || 'unassigned') ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy PO</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setShowWhatsAppPreviewModal({ distributor: dist, items: group.items, text: api.generateWhatsAppPOText({ storeProfile, distributor: dist, items: group.items }) })}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                            title="Preview formatted WhatsApp Purchase Order"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => handleSendGroupWhatsAppPO(dist, group.items)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                            title="Open WhatsApp with structured purchase order message"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send WhatsApp PO</span>
                          </button>

                          {!isUnassigned && (
                            <button
                              onClick={() => handleConvertGroupToInward(dist, group.items)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                              title="Pre-fill Wholesale Inward bill modal with these ordered items"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Convert to Inward Bill</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200/80 font-semibold">
                            <th className="py-2 px-3.5 w-10 text-center">#</th>
                            <th className="py-2 px-3.5 min-w-[200px]">Medicine Name & Salt</th>
                            <th className="py-2 px-3.5 w-28 text-center">Current Stock</th>
                            <th className="py-2 px-3.5 w-36 text-center">Order Qty (Strips)</th>
                            <th className="py-2 px-3.5 w-32">Source / Trigger</th>
                            <th className="py-2 px-3.5 min-w-[140px]">Notes</th>
                            <th className="py-2 px-3.5 w-24 text-center">Status</th>
                            <th className="py-2 px-3.5 w-24 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item, idx) => {
                            const isCriticalZero = (item.current_stock ?? 0) <= 0;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[10px]">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <div className="font-bold text-slate-900 text-xs">{item.medicine_name}</div>
                                  {item.generic_salt && (
                                    <div className="text-[10px] text-slate-500 font-normal truncate max-w-md">
                                      {item.generic_salt}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                    isCriticalZero
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {item.current_stock ?? 0} strips
                                  </span>
                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    Min alert: {item.min_stock_alert ?? 10}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5 text-center">
                                  <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                                    <button
                                      onClick={() => handleUpdateShortageQty(item.id, -5)}
                                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                                      title="-5 strips"
                                    >
                                      -
                                    </button>
                                    <span className="px-2.5 py-1 text-xs font-bold font-mono text-slate-900 min-w-[36px] text-center bg-slate-50">
                                      {item.suggested_qty || 10}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateShortageQty(item.id, 5)}
                                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                                      title="+5 strips"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                    item.source === 'CUSTOMER_DEMAND'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : item.source === 'AUTO_STOCK_ALERT'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {item.source === 'CUSTOMER_DEMAND'
                                      ? 'ग्राहक मागणी'
                                      : item.source === 'AUTO_STOCK_ALERT'
                                      ? 'Auto Alert'
                                      : 'Counter Manual'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 text-[11px] text-slate-500">
                                  {item.notes || '—'}
                                </td>
                                <td className="py-2.5 px-3.5 text-center font-sans">
                                  <button
                                    onClick={() => handleToggleOrderStatus(item)}
                                    className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                                      item.status === 'ORDERED'
                                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                    }`}
                                    title="Click to toggle status"
                                  >
                                    {item.status === 'ORDERED' ? 'ऑर्डर दिली' : 'ऑर्डर देणे बाकी'}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3.5 text-center space-x-1 whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteShortage(item.id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    title="Delete from shortage register"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat List / Table View */
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                      <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                      <th className="py-2.5 px-3.5 min-w-[200px]">Medicine Name & Salt</th>
                      <th className="py-2.5 px-3.5 w-32">Distributor / Stockist</th>
                      <th className="py-2.5 px-3.5 w-28 text-center">Current Stock</th>
                      <th className="py-2.5 px-3.5 w-32 text-center">Order Qty</th>
                      <th className="py-2.5 px-3.5 w-28">Source</th>
                      <th className="py-2.5 px-3.5 min-w-[140px]">Notes</th>
                      <th className="py-2.5 px-3.5 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3.5 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredShortageItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-900">{item.medicine_name}</div>
                          {item.generic_salt && (
                            <div className="text-[10px] text-slate-500 truncate max-w-sm">{item.generic_salt}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-800">
                          {item.dist_name || 'Unassigned'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            (item.current_stock ?? 0) <= 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {item.current_stock ?? 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              onClick={() => handleUpdateShortageQty(item.id, -5)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 py-0.5 text-xs font-bold font-mono text-slate-900 min-w-[32px] text-center bg-slate-50">
                              {item.suggested_qty || 10}
                            </span>
                            <button
                              onClick={() => handleUpdateShortageQty(item.id, 5)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">{item.notes || '—'}</td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            onClick={() => handleToggleOrderStatus(item)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.status === 'ORDERED'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {item.status}
                          </button>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            onClick={() => handleDeleteShortage(item.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Inward New Wholesale Purchase Bill */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Inward Distributor Purchase Invoice (नवीन खरेदी बिल नोंदवा)</h3>
                  <p className="text-[10px] text-slate-400">Stock will be automatically updated with new batch numbers & MRPs</p>
                </div>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSavePurchaseBill} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* Header Information: Distributor, Invoice No, Dates */}
                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Distributor / Agency *</label>
                    <select
                      value={purchaseForm.distributor_id}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, distributor_id: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900"
                    >
                      <option value="">-- Select Wholesaler --</option>
                      {distributors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Distributor Bill No. *</label>
                    <input
                      type="text"
                      placeholder="e.g. MH-INV-9948"
                      value={purchaseForm.purchase_invoice_no}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_invoice_no: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold uppercase text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      value={purchaseForm.invoice_date}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_date: e.target.value })}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Credit Due Date</label>
                    <input
                      type="date"
                      value={purchaseForm.due_date}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Medicine Items Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Medicine Line Items & Batch Details</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-semibold inline-flex items-center gap-1 border border-blue-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine Row</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200 tracking-wider">
                          <th className="py-2 px-2.5 min-w-[180px]">Medicine Name</th>
                          <th className="py-2 px-2 w-24">Batch No</th>
                          <th className="py-2 px-2 w-20">Exp (MM/YY)</th>
                          <th className="py-2 px-2 w-16 text-center">Billed Qty</th>
                          <th className="py-2 px-2 w-16 text-center">Free Qty</th>
                          <th className="py-2 px-2 w-20 text-right">PTR (₹)</th>
                          <th className="py-2 px-2 w-20 text-center">GST %</th>
                          <th className="py-2 px-2 w-16 text-center">Disc %</th>
                          <th className="py-2 px-2 w-20 text-right">MRP (₹)</th>
                          <th className="py-2 px-2 w-24 text-right">Landing/Unit</th>
                          <th className="py-2 px-2 w-24 text-right">Total (₹)</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {purchaseItems.map((item, idx) => {
                          const computed = computedInvoiceTotals.rowDetails[idx] || {};
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-1.5">
                                <select
                                  value={item.product_id}
                                  onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                  required
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-sans font-medium"
                                >
                                  <option value="">-- Choose Medicine --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.generic_salt || 'No Salt'})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="BATCH"
                                  required
                                  value={item.batch_no}
                                  onChange={(e) => handleItemChange(idx, 'batch_no', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold uppercase"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="12/27"
                                  required
                                  value={item.expiry_date}
                                  onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-mono"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="10"
                                  required
                                  value={item.qty}
                                  onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={item.free_qty}
                                  onChange={(e) => handleItemChange(idx, 'free_qty', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-amber-50/50 border border-amber-300 rounded text-center text-xs font-bold text-amber-900"
                                  title="Free schemes e.g. 10+2 free"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  required
                                  value={item.purchase_rate}
                                  onChange={(e) => handleItemChange(idx, 'purchase_rate', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={item.gst_rate}
                                  onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                                  className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-center text-xs"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                </select>
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="0"
                                  value={item.discount_percent}
                                  onChange={(e) => handleItemChange(idx, 'discount_percent', e.target.value)}
                                  className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-center text-xs"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  required
                                  value={item.mrp}
                                  onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold text-emerald-800"
                                />
                              </td>
                              <td className="p-1.5 text-right font-bold text-blue-700 text-xs">
                                ₹{computed.landingCost || '0.00'}
                              </td>
                              <td className="p-1.5 text-right font-bold text-slate-900 text-xs">
                                ₹{computed.lineTotal ? computed.lineTotal.toFixed(2) : '0.00'}
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  disabled={purchaseItems.length === 1}
                                  className="text-slate-400 hover:text-rose-600 disabled:opacity-20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Summary & Payment Terms */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Payment Mode</label>
                      <select
                        value={purchaseForm.payment_mode}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_mode: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                      >
                        <option value="credit">Distributor Credit (खरेदी उधारी)</option>
                        <option value="cash">Counter Cash Settlement</option>
                        <option value="upi">Immediate UPI Transfer</option>
                        <option value="cheque">Bank Cheque Payment</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Paid Now at Delivery (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={purchaseForm.paid_amount}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, paid_amount: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Units (Billed + Free):</span>
                      <span className="font-bold">{computedInvoiceTotals.totalUnitsCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Subtotal:</span>
                      <span>₹{computedInvoiceTotals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total GST (CGST + SGST):</span>
                      <span>₹{computedInvoiceTotals.totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Invoice Discount:</span>
                      <span>-₹{computedInvoiceTotals.totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm text-blue-900">
                      <span>Grand Net Total:</span>
                      <span>₹{computedInvoiceTotals.netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Inward to Inventory Stock & Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Settle Distributor Payment */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Settle Supplier Payment ({showSettleModal.name})</h3>
              <button onClick={() => setShowSettleModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSettlePayment} className="p-4 space-y-3 font-sans text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <div className="text-[10px] uppercase font-semibold">Total Pending Debt (एकूण देणे):</div>
                <div className="text-lg font-mono font-bold mt-0.5">₹{Number(showSettleModal.pending_balance || 0).toFixed(2)}</div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Mode</label>
                <select
                  value={settleMode}
                  onChange={(e) => setSettleMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="NEFT_UPI">UPI / Bank Direct Transfer</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Counter Cash Drawer Payout</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cheque No / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-994821 or Cheque #44920"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note / Description</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-xs"
                >
                  Record Payment & Deduct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Distributor Ledger History */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">Wholesale Ledger Statement: {showLedgerModal.name}</h3>
                <p className="text-[10px] text-slate-400">Phone: {showLedgerModal.phone || '-'} | GSTIN: {showLedgerModal.gstin || '-'}</p>
              </div>
              <button onClick={() => setShowLedgerModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 text-xs">Total Outstanding Debt:</span>
                  <div className="text-xl font-bold text-rose-700">₹{Number(showLedgerModal.pending_balance || 0).toFixed(2)}</div>
                </div>
                <button
                  onClick={() => sendWhatsAppStatement(showLedgerModal)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Statement</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3 text-right">Debit (+)</th>
                      <th className="py-2 px-3 text-right">Credit (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {(!ledgerData || !ledgerData.entries || ledgerData.entries.length === 0) ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                          No ledger transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.entries.map((e, idx) => {
                        const isPurchase = e.type === 'PURCHASE_BILL';
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500 text-[10px]">
                              {new Date(e.created_at).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2 px-3 font-sans font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${isPurchase ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'}`}>
                                {e.type}
                              </span>
                            </td>
                            <td className="py-2 px-3">{e.reference_no || '-'}</td>
                            <td className="py-2 px-3 text-slate-500 uppercase text-[10px]">{e.payment_mode || '-'}</td>
                            <td className="py-2 px-3 text-right font-bold text-rose-700">
                              {isPurchase ? `₹${Number(e.amount).toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {!isPurchase ? `₹${Number(e.amount).toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowLedgerModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: + Add Distributor */}
      {showAddDistributorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Distributor / Agency</h3>
              <button onClick={() => setShowAddDistributorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDistributor} className="p-4 space-y-3 font-sans text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Distributor / Agency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahaveer Pharma Distributors"
                  value={newDistributor.name}
                  onChange={(e) => setNewDistributor({ ...newDistributor, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="text"
                  required
                  placeholder="9822012345"
                  value={newDistributor.phone}
                  onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="27AABCM..."
                    value={newDistributor.gstin}
                    onChange={(e) => setNewDistributor({ ...newDistributor, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Drug License (DL No)</label>
                  <input
                    type="text"
                    placeholder="20B/21B..."
                    value={newDistributor.dl_number}
                    onChange={(e) => setNewDistributor({ ...newDistributor, dl_number: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Credit Terms (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDistributor.payment_terms_days}
                    onChange={(e) => setNewDistributor({ ...newDistributor, payment_terms_days: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Nashik"
                    value={newDistributor.address}
                    onChange={(e) => setNewDistributor({ ...newDistributor, address: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddDistributorModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs"
                >
                  Save Distributor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: View Inward Bill Details */}
      {showBillDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">Wholesale Purchase Invoice #{showBillDetailsModal.purchase_invoice_no}</h3>
                <p className="text-[10px] text-slate-400">Supplier: {showBillDetailsModal.distributor_name} | Date: {showBillDetailsModal.invoice_date}</p>
              </div>
              <button onClick={() => setShowBillDetailsModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px]">Distributor:</span>
                  <div className="font-bold font-sans">{showBillDetailsModal.distributor_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Payment Status:</span>
                  <div className="font-bold uppercase text-rose-700">{showBillDetailsModal.payment_status}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Payment Mode:</span>
                  <div className="font-bold uppercase">{showBillDetailsModal.payment_mode}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Grand Net Amount:</span>
                  <div className="font-bold text-sm text-blue-900">₹{Number(showBillDetailsModal.net_amount || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Exp</th>
                      <th className="py-2 px-3 text-center">Billed Qty</th>
                      <th className="py-2 px-3 text-center">Free Qty</th>
                      <th className="py-2 px-3 text-right">PTR</th>
                      <th className="py-2 px-3 text-center">GST %</th>
                      <th className="py-2 px-3 text-right">Landing Cost</th>
                      <th className="py-2 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {(!showBillDetailsModal.items || showBillDetailsModal.items.length === 0) ? (
                      <tr>
                        <td colSpan="10" className="py-6 text-center text-slate-400 font-sans">
                          No line items found.
                        </td>
                      </tr>
                    ) : (
                      showBillDetailsModal.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-semibold">{it.product_name || 'Medicine'}</td>
                          <td className="py-2 px-3 font-bold">{it.batch_no}</td>
                          <td className="py-2 px-3 text-slate-500">{it.expiry_date}</td>
                          <td className="py-2 px-3 text-center font-bold">{it.qty}</td>
                          <td className="py-2 px-3 text-center text-amber-700 font-bold">{it.free_qty || 0}</td>
                          <td className="py-2 px-3 text-right">₹{Number(it.purchase_rate || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">{it.gst_rate || 12}%</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-700">₹{Number(it.landing_cost_per_unit || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold">₹{Number(it.total_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowBillDetailsModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Create New GST Expiry Debit Note */}
      {showNewDebitNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Issue GST Expiry Debit Note (माल परतावा व डेबिट नोट नोंदणी)</h3>
                  <p className="text-[10px] text-slate-400">Section 34 CGST Act compliant credit claim against supplier debt</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewDebitNoteModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveDebitNote} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-3 shrink-0">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stockist / Distributor *</label>
                  <select
                    value={debitNoteForm.distributor_id}
                    onChange={(e) => setDebitNoteForm(prev => ({ ...prev, distributor_id: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium focus:border-rose-500"
                    required
                  >
                    <option value="">Select Stockist</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''} — Debt: ₹{Number(d.pending_balance || 0).toFixed(0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Debit Note No (Auto if blank)</label>
                  <input
                    type="text"
                    placeholder="e.g. DN-202610-001"
                    value={debitNoteForm.note_no}
                    onChange={(e) => setDebitNoteForm(prev => ({ ...prev, note_no: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Return Date</label>
                  <input
                    type="date"
                    value={debitNoteForm.note_date}
                    onChange={(e) => setDebitNoteForm(prev => ({ ...prev, note_date: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Return Reason</label>
                  <select
                    value={debitNoteForm.reason}
                    onChange={(e) => setDebitNoteForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="EXPIRY_RETURN">Near-Expiry / Expired Return</option>
                    <option value="BREAKAGE">Breakage / Leaked in Transit</option>
                    <option value="BATCH_RECALL">Manufacturer Batch Recall</option>
                    <option value="WRONG_SUPPLY">Wrong Medicine Supplied</option>
                  </select>
                </div>
              </div>

              {/* Items Line Table */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Returned Medicine Batches</span>
                    <span className="text-[10px] font-normal text-slate-500">(Stock will be deducted from active counter batches)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDebitItemRow}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-600" />
                    <span>+ Add Return Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200">
                        <th className="py-2 px-2.5 w-8">#</th>
                        <th className="py-2 px-2.5 min-w-[200px]">Medicine / Item *</th>
                        <th className="py-2 px-2.5 w-28">Batch No *</th>
                        <th className="py-2 px-2.5 w-24">Expiry *</th>
                        <th className="py-2 px-2.5 w-20 text-right">Return Qty *</th>
                        <th className="py-2 px-2.5 w-24 text-right">PTR Rate *</th>
                        <th className="py-2 px-2.5 w-20 text-center">GST %</th>
                        <th className="py-2 px-2.5 w-24 text-right">Taxable</th>
                        <th className="py-2 px-2.5 w-24 text-right">Claim Net</th>
                        <th className="py-2 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                      {computedDebitNoteTotals.rowDetails.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-2.5 text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-sans">
                            <select
                              value={row.product_id}
                              onChange={(e) => handleDebitItemChange(idx, 'product_id', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-medium"
                              required
                            >
                              <option value="">Select Medicine</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.category})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              placeholder="Batch"
                              value={row.batch_no}
                              onChange={(e) => handleDebitItemChange(idx, 'batch_no', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1 uppercase font-bold"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={row.expiry_date}
                              onChange={(e) => handleDebitItemChange(idx, 'expiry_date', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={row.qty}
                              onChange={(e) => handleDebitItemChange(idx, 'qty', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1 text-right font-bold"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="PTR"
                              value={row.purchase_rate}
                              onChange={(e) => handleDebitItemChange(idx, 'purchase_rate', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1 text-right"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <select
                              value={row.gst_rate}
                              onChange={(e) => handleDebitItemChange(idx, 'gst_rate', e.target.value)}
                              className="border border-slate-200 rounded p-1 text-center"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                            </select>
                          </td>
                          <td className="py-2 px-2.5 text-right font-semibold text-slate-700">
                            ₹{row.taxable.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-rose-700">
                            ₹{row.lineTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDebitItemRow(idx)}
                              disabled={debitNoteItems.length === 1}
                              className="text-slate-300 hover:text-rose-600 disabled:opacity-20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer with Live Summary */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Returned Units:</span>
                    <span className="font-bold text-sm text-slate-200">{computedDebitNoteTotals.totalQty} items</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Taxable Return:</span>
                    <span className="font-bold text-sm text-slate-200">₹{computedDebitNoteTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">GST (CGST+SGST):</span>
                    <span className="font-bold text-sm text-emerald-400">₹{computedDebitNoteTotals.totalTax.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Credit Claim (आपले देणे कमी):</span>
                    <span className="font-bold text-base text-rose-400">₹{computedDebitNoteTotals.totalClaim.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowNewDebitNoteModal(false)}
                    className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Save & Issue GST Debit Note</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: View Debit Note Details */}
      {showDebitNoteDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">GST Debit Note Details (#{showDebitNoteDetailsModal.note_no})</h3>
                <p className="text-[10px] text-slate-400">Issued on {showDebitNoteDetailsModal.note_date} to {showDebitNoteDetailsModal.distributor_name}</p>
              </div>
              <button onClick={() => setShowDebitNoteDetailsModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[10px]">Distributor / Stockist:</span>
                  <div className="font-bold text-slate-800 font-sans">{showDebitNoteDetailsModal.distributor_name}</div>
                  <div className="text-[10px] text-slate-500">GSTIN: {showDebitNoteDetailsModal.distributor_gstin || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Taxable Return (PTR):</span>
                  <div className="font-bold text-slate-800">₹{Number(showDebitNoteDetailsModal.subtotal || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">GST: ₹{Number(showDebitNoteDetailsModal.tax_amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Net Ledger Credit Claim:</span>
                  <div className="font-bold text-sm text-rose-700">₹{Number(showDebitNoteDetailsModal.total_claim_amount || 0).toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-600 font-sans font-semibold">Credited to Apale Dena</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold border-b border-slate-200">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Exp</th>
                      <th className="py-2 px-3 text-center">Return Qty</th>
                      <th className="py-2 px-3 text-right">PTR Rate</th>
                      <th className="py-2 px-3 text-center">GST %</th>
                      <th className="py-2 px-3 text-right">Taxable</th>
                      <th className="py-2 px-3 text-right">Claim Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {(!showDebitNoteDetailsModal.items || showDebitNoteDetailsModal.items.length === 0) ? (
                      <tr>
                        <td colSpan="9" className="py-6 text-center text-slate-400 font-sans">
                          No line items found.
                        </td>
                      </tr>
                    ) : (
                      showDebitNoteDetailsModal.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-semibold">{it.product_name || 'Medicine'}</td>
                          <td className="py-2 px-3 font-bold">{it.batch_no}</td>
                          <td className="py-2 px-3 text-slate-500">{it.expiry_date}</td>
                          <td className="py-2 px-3 text-center font-bold text-rose-600">{it.qty}</td>
                          <td className="py-2 px-3 text-right">₹{Number(it.purchase_rate || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">{it.gst_rate || 12}%</td>
                          <td className="py-2 px-3 text-right font-medium">₹{Number(it.taxable_amount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-700">₹{Number(it.total_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDebitNoteDetailsModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Print Official GST Debit Note Voucher (MediVision Parity for Agency Van) */}
      {showDebitNotePrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" /> Print Official GST Debit Voucher
              </span>
              <button onClick={() => setShowDebitNotePrintModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Voucher Paper Preview */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
              <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm font-mono text-xs space-y-4 max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center border-b border-slate-300 pb-3">
                  <h2 className="text-base font-bold font-sans uppercase tracking-wide text-slate-900">
                    {storeProfile?.store_name || 'Divya Medical Stores'}
                  </h2>
                  <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                    {storeProfile?.address || 'Main Road, Ghoti-Igatpuri, Dist. Nashik, MH'}
                  </p>
                  <div className="text-[10px] text-slate-700 flex justify-center gap-4 mt-1 font-sans">
                    <span><b>DL No:</b> {storeProfile?.dl_number || '20B/21B-MH-SOL-194829'}</span>
                    <span><b>GSTIN:</b> {storeProfile?.gstin || '27AABCS1429P1Z1'}</span>
                    <span><b>Phone:</b> {storeProfile?.phone || '9373545169'}</span>
                  </div>
                  <div className="mt-2 inline-block px-3 py-0.5 rounded bg-slate-900 text-white font-sans text-xs font-bold uppercase tracking-wider">
                    GST DEBIT NOTE / SUPPLIER EXPIRY RETURN MEMO
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans mt-0.5">(Issued Under Section 34 of the Central Goods & Services Tax Act, 2017)</p>
                </div>

                {/* Voucher Meta */}
                <div className="grid grid-cols-2 gap-4 text-[11px] border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">RETURNED TO STOCKIST:</span>
                    <span className="font-bold text-slate-900 font-sans block">{showDebitNotePrintModal.distributor_name}</span>
                    <span className="text-slate-600 font-sans text-[10px] block">{showDebitNotePrintModal.distributor_address || 'Wholesale Market, Nashik'}</span>
                    <span className="text-slate-600 font-sans text-[10px] block">GSTIN: {showDebitNotePrintModal.distributor_gstin || '27XXXXX0000X1Z1'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">DEBIT NOTE DETAILS:</span>
                    <span className="font-bold text-slate-900 block">Note No: #{showDebitNotePrintModal.note_no}</span>
                    <span className="text-slate-600 block">Date: {showDebitNotePrintModal.note_date}</span>
                    <span className="text-slate-600 block">Reason: {showDebitNotePrintModal.reason || 'Expiry Return'}</span>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-700">
                      <th className="py-1">#</th>
                      <th className="py-1">Item Description</th>
                      <th className="py-1">Batch</th>
                      <th className="py-1">Exp</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">PTR</th>
                      <th className="py-1 text-center">GST%</th>
                      <th className="py-1 text-right">Taxable</th>
                      <th className="py-1 text-right">CGST</th>
                      <th className="py-1 text-right">SGST</th>
                      <th className="py-1 text-right">Total Claim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showDebitNotePrintModal.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1 text-slate-400">{idx + 1}</td>
                        <td className="py-1 font-sans font-medium text-slate-900">{it.product_name}</td>
                        <td className="py-1 font-bold">{it.batch_no}</td>
                        <td className="py-1 text-rose-600">{it.expiry_date}</td>
                        <td className="py-1 text-center font-bold">{it.qty}</td>
                        <td className="py-1 text-right">₹{Number(it.purchase_rate).toFixed(2)}</td>
                        <td className="py-1 text-center">{it.gst_rate || 12}%</td>
                        <td className="py-1 text-right">₹{Number(it.taxable_amount).toFixed(2)}</td>
                        <td className="py-1 text-right">₹{Number(it.cgst_amount).toFixed(2)}</td>
                        <td className="py-1 text-right">₹{Number(it.sgst_amount).toFixed(2)}</td>
                        <td className="py-1 text-right font-bold">₹{Number(it.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-slate-300 pt-2 space-y-1 text-right font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Taxable Value:</span>
                    <span>₹{Number(showDebitNotePrintModal.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total GST Reversal Claim:</span>
                    <span>₹{Number(showDebitNotePrintModal.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-sm text-slate-900">
                    <span>NET AMOUNT DEBITED / CREDITED:</span>
                    <span className="text-rose-700">₹{Number(showDebitNotePrintModal.total_claim_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic border-t border-slate-200 pt-2 font-sans">
                  Declaration: We hereby confirm that the above listed medicines were returned due to expiry/damage and the corresponding GST input credit reversal is accounted for under Section 34 of the CGST Act.
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 pt-8 text-center text-xs font-sans text-slate-700">
                  <div>
                    <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-semibold">
                      Agency Van Receiver's Sign
                    </div>
                    <span className="text-[10px] text-slate-400">Date & Stamp</span>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-44 mx-auto pt-1 font-semibold">
                      For {storeProfile?.store_name || 'Divya Medical Stores'}
                    </div>
                    <span className="text-[10px] text-slate-400">Authorized Pharmacist</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowDebitNotePrintModal(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Shortage Item ("तोटा वही नोंद") */}
      {showAddShortageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">तोटा नोंदवहीत नवीन औषध जोडा (Add to Shortage Diary)</h3>
                  <p className="text-[10px] text-slate-400">Log low stock medicines or walk-in customer demand for purchase ordering</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddShortageModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewShortageItem} className="p-4 space-y-3.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Medicine Brand / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dolo 650, Augmentin 625 Duo, Azithral..."
                  value={newShortageForm.medicine_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = products.find(p => p.name.toLowerCase() === val.toLowerCase());
                    setNewShortageForm(prev => ({
                      ...prev,
                      medicine_name: val,
                      product_id: matched ? String(matched.id) : prev.product_id,
                      generic_salt: matched ? (matched.generic_salt || '') : prev.generic_salt,
                      current_stock: matched ? (matched.total_stock || 0) : prev.current_stock
                    }));
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-amber-500"
                />
                {/* Catalog Quick Pick */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-slate-400 self-center">Quick pick from catalog:</span>
                  {products.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setNewShortageForm(prev => ({
                          ...prev,
                          product_id: String(p.id),
                          medicine_name: p.name,
                          generic_salt: p.generic_salt || '',
                          current_stock: p.total_stock || 0,
                          min_stock_alert: p.min_stock_alert || 10
                        }));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-medium transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Generic Composition / Salt (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 650mg"
                  value={newShortageForm.generic_salt}
                  onChange={(e) => setNewShortageForm({ ...newShortageForm, generic_salt: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Re-order Strips / Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newShortageForm.suggested_qty}
                    onChange={(e) => setNewShortageForm({ ...newShortageForm, suggested_qty: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newShortageForm.current_stock}
                    onChange={(e) => setNewShortageForm({ ...newShortageForm, current_stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assigned Stockist / Wholesaler (Optional)
                </label>
                <select
                  value={newShortageForm.distributor_id}
                  onChange={(e) => setNewShortageForm({ ...newShortageForm, distributor_id: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="">Unassigned (सप्लायर नंतर ठरवा)</option>
                  {distributors.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name} ({d.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Demand Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CUSTOMER_DEMAND', label: 'ग्राहक मागणी (Customer)' },
                    { id: 'AUTO_STOCK_ALERT', label: 'Low Stock Alert' },
                    { id: 'COUNTER_MANUAL', label: 'Counter Manual' }
                  ].map(src => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setNewShortageForm({ ...newShortageForm, source: src.id })}
                      className={`p-2 rounded-lg border text-center text-[11px] font-semibold transition-all ${
                        newShortageForm.source === src.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Customer Info</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. S. K. Joshi prescription, Baburao asked for 2 strips..."
                  value={newShortageForm.notes}
                  onChange={(e) => setNewShortageForm({ ...newShortageForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddShortageModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save to Diary (तोटा वहीत नोंदवा)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WhatsApp Purchase Order Preview */}
      {showWhatsAppPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">WhatsApp Purchase Order Preview (खरेदी ऑर्डर)</h3>
                  <p className="text-[10px] text-emerald-200">To: {showWhatsAppPreviewModal.distributor?.name || 'Stockist'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppPreviewModal(null)}
                className="w-7 h-7 rounded-lg bg-emerald-900 hover:bg-emerald-700 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-100/70">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                {showWhatsAppPreviewModal.text}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showWhatsAppPreviewModal.text);
                  setShortageToast('खरेदी ऑर्डर क्लिपबोर्डवर कॉपी केली!');
                  setTimeout(() => setShortageToast(null), 3000);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Order Text</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWhatsAppPreviewModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSendGroupWhatsAppPO(showWhatsAppPreviewModal.distributor, showWhatsAppPreviewModal.items);
                    setShowWhatsAppPreviewModal(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Shortage Toast */}
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
