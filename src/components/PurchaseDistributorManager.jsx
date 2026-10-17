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
  ShieldAlert
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

  const [activeSubTab, setActiveSubTab] = useState('bills'); // 'bills' | 'distributors'
  const [purchases, setPurchases] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total_bills: 0, total_spent: 0, total_payable: 0, distributor_count: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributorFilter, setSelectedDistributorFilter] = useState('all');

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(null); // distributor object
  const [showLedgerModal, setShowLedgerModal] = useState(null); // distributor object
  const [showBillDetailsModal, setShowBillDetailsModal] = useState(null); // purchase object
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [distList, purchaseList, prodList, summ] = await Promise.all([
        api.getDistributors(),
        api.getPurchases(50),
        api.getAllProducts('all'),
        api.getPurchaseSummary()
      ]);
      setDistributors(distList || []);
      setPurchases(purchaseList || []);
      setProducts(prodList || []);
      if (summ) setSummary(summ);
      if (distList && distList.length > 0 && !purchaseForm.distributor_id) {
        setPurchaseForm(prev => ({ ...prev, distributor_id: String(distList[0].id) }));
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
              Distributor Management & Purchase Inwards (खरेदी व सप्लायर खाते)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wholesale tax invoice inwarding, automatic batch stock updates, GST input claims, and vendor ledger.
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

          <button
            onClick={() => setShowAddDistributorModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>+ New Distributor</span>
          </button>

          <button
            onClick={() => setShowInwardModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Inward Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-4 gap-3.5 p-4 bg-slate-50 border-b border-slate-200/80 shrink-0">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Total Wholesale Purchases</span>
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
            <span>Total Accounts Payable (आपले देणे)</span>
            <DollarSign className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            ₹{summary.total_payable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">
            Pending supplier dues
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Registered Distributors</span>
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {distributors.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Stockists & wholesalers
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Standard Credit Window</span>
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            15 - 21 Days
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Avg distributor credit terms
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
        </div>

        {/* Search Input */}
        <div className="relative w-64 pb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={activeSubTab === 'bills' ? 'Search by bill no, supplier...' : 'Search supplier, phone, GSTIN...'}
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
    </div>
  );
}
