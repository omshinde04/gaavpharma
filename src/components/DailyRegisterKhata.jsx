import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Banknote,
  QrCode,
  CreditCard,
  BookMarked,
  FileText,
  User,
  Phone,
  MessageSquare,
  Plus,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Lock,
  Shield,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Download,
  Printer,
  Building2,
  Landmark,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';

const STANDARD_EXPENSE_HEADS = [
  'Shop Electricity / Light Bill (MSEDCL)',
  'Staff Salaries & Daily Wages',
  'Tea, Coffee & Staff Refreshments',
  'Shop Rent',
  'Packaging Bags & Thermal Rolls',
  'Courier & Transport Charges',
  'Shop Maintenance & Cleaning',
  'Miscellaneous Office Expenses'
];

const STANDARD_BANK_HEADS = [
  'State Bank of India (Current A/c)',
  'HDFC Bank (Current A/c)',
  'Bank of Maharashtra (Current A/c)',
  'Counter Cash Drawer'
];

export default function DailyRegisterKhata({ currentUser, featureToggles, storeProfile }) {
  const allowKhata = featureToggles?.allow_khata !== false && featureToggles?.allow_khata !== 'false' && featureToggles?.allow_khata !== 0;
  const allowWhatsApp = featureToggles?.allow_whatsapp !== false && featureToggles?.allow_whatsapp !== 'false' && featureToggles?.allow_whatsapp !== 0;
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const hideDrawerFromCashier = isCashier && (
    featureToggles?.hide_drawer_from_cashier === true ||
    featureToggles?.hide_drawer_from_cashier === 'true' ||
    featureToggles?.hide_drawer_from_cashier === 1
  );

  const [subTab, setSubTab] = useState('register'); // 'register' | 'khata' | 'vouchers'
  const [summary, setSummary] = useState({
    today: {
      total_sales: 0,
      cash_total: 0,
      upi_total: 0,
      khata_total: 0,
      card_total: 0,
      total_invoices: 0
    },
    khataPending: {
      total_khata_pending: 0,
      active_khata_customers: 0
    }
  });

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Khata Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(null); // customer object
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('Counter cash settlement');
  const [customerSearch, setCustomerSearch] = useState('');

  // Add Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  // Accounting Vouchers State (MediVision Parity: Photos 1, 3, 20)
  const [voucherFilter, setVoucherFilter] = useState('ALL'); // 'ALL' | 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL'
  const [showVoucherModal, setShowVoucherModal] = useState(null); // null or { type: 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL' }
  const [voucherForm, setVoucherForm] = useState({
    voucher_type: 'PAYMENT',
    voucher_no: '',
    date: new Date().toISOString().slice(0, 10),
    party_category: 'EXPENSE', // 'EXPENSE' | 'DISTRIBUTOR' | 'CUSTOMER' | 'BANK' | 'OTHER'
    party_id: '',
    party_name: STANDARD_EXPENSE_HEADS[0],
    amount: '',
    payment_mode: 'CASH', // 'CASH' | 'UPI' | 'BANK' | 'CHEQUE'
    reference_no: '',
    narration: ''
  });

  // Universal Report Filter State (MediVision "Define Criterion" - Photo 21)
  const [showCriterionModal, setShowCriterionModal] = useState(false);
  const [criterion, setCriterion] = useState({
    datePreset: 'today', // 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'ALL',
    search: ''
  });

  const loadData = async () => {
    try {
      const [summ, invs, custs, dists, vchs] = await Promise.all([
        api.getDailyRegisterSummary(),
        api.getInvoices(100),
        api.getKhataCustomers(),
        api.getDistributors(),
        api.getAccountingVouchers ? api.getAccountingVouchers() : []
      ]);
      if (summ) setSummary(summ);
      if (invs) setInvoices(invs);
      if (custs) setCustomers(custs);
      if (dists) setDistributors(dists);
      if (vchs) setVouchers(vchs);
    } catch (err) {
      console.error('Error loading register data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard Shortcuts (F5: Payment, F6: Receipt, F4: Contra, F7: Journal, F8: Define Criterion)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.matches('input, textarea, select')) return;

      if (e.key === 'F5') {
        e.preventDefault();
        openVoucherModal('PAYMENT');
      } else if (e.key === 'F6') {
        e.preventDefault();
        openVoucherModal('RECEIPT');
      } else if (e.key === 'F4') {
        e.preventDefault();
        openVoucherModal('CONTRA');
      } else if (e.key === 'F7') {
        e.preventDefault();
        openVoucherModal('JOURNAL');
      } else if (e.key === 'F8' || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        setShowCriterionModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowVoucherModal(null);
        setShowCriterionModal(false);
        setShowAddCustomer(false);
        setShowSettleModal(null);
        setSelectedInvoice(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customers, distributors]);

  const openVoucherModal = (type) => {
    const isPay = type === 'PAYMENT';
    const isRec = type === 'RECEIPT';
    const isCon = type === 'CONTRA';

    setVoucherForm({
      voucher_type: type,
      voucher_no: '',
      date: new Date().toISOString().slice(0, 10),
      party_category: isCon ? 'BANK' : isRec ? 'CUSTOMER' : isPay ? 'EXPENSE' : 'OTHER',
      party_id: '',
      party_name: isCon ? STANDARD_BANK_HEADS[0] : isPay ? STANDARD_EXPENSE_HEADS[0] : '',
      amount: '',
      payment_mode: 'CASH',
      reference_no: '',
      narration: ''
    });
    setShowVoucherModal({ type });
  };

  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    const amt = parseFloat(voucherForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!voucherForm.party_name.trim()) {
      alert('Please select or enter an Account Head / Party name.');
      return;
    }

    try {
      await api.createAccountingVoucher({
        voucher_type: voucherForm.voucher_type,
        voucher_no: voucherForm.voucher_no || undefined,
        date: voucherForm.date,
        party_type: voucherForm.party_category,
        party_id: voucherForm.party_id ? Number(voucherForm.party_id) : null,
        party_name: voucherForm.party_name,
        amount: amt,
        payment_mode: voucherForm.payment_mode,
        reference_no: voucherForm.reference_no,
        narration: voucherForm.narration
      });

      setShowVoucherModal(null);
      await loadData();
    } catch (err) {
      console.error('Failed to create voucher:', err);
      alert('Failed to save voucher. Please check inputs.');
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Are you sure you want to delete this voucher entry?')) return;
    try {
      await api.deleteAccountingVoucher(id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete voucher');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) {
      alert('Name and Mobile number are required.');
      return;
    }
    try {
      await api.addKhataCustomer(newCustName.trim(), newCustMobile.trim());
      setShowAddCustomer(false);
      setNewCustName('');
      setNewCustMobile('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to add customer. Ensure mobile number is unique.');
    }
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      await api.addKhataPayment(showSettleModal.id, amt, settleNote);
      setShowSettleModal(null);
      setSettleAmount('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to settle payment');
    }
  };

  const sendWhatsAppReminder = async (customer) => {
    const mobile = customer.mobile.replace(/\D/g, '');
    const phone = mobile.startsWith('91') ? mobile : `91${mobile}`;
    const storeTitle = (storeProfile?.store_name || 'Medical Stores').toUpperCase();
    const storeShort = storeProfile?.store_name || 'our pharmacy';
    const contactPhone = storeProfile?.phone || '+91 98220 12345';

    const msg = `*${storeTitle}*%0A` +
      `--------------------------------%0A` +
      `Namaste *${customer.name}* ji,%0A` +
      `This is a gentle payment reminder from ${storeShort}.%0A` +
      `Outstanding Khata Balance: *₹${Number(customer.balance).toFixed(2)}*%0A` +
      `Please clear the dues at your earliest convenience at our counter or via UPI.%0A` +
      `--------------------------------%0A` +
      `Contact: ${contactPhone}%0A` +
      `Thank you for your patronage.`;

    const url = `https://wa.me/${phone}?text=${msg}`;
    await api.openExternalUrl(url);
  };

  // Preset Date Range Helper for Criterion
  const applyDatePreset = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start = today;
      end = today;
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
      end = today;
    } else if (preset === 'month') {
      start.setDate(1);
      end = today;
    } else if (preset === 'all') {
      start = new Date('2020-01-01');
      end = today;
    }

    setCriterion(prev => ({
      ...prev,
      datePreset: preset,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    }));
  };

  // Filtered Invoices according to Criterion
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = (inv.created_at || '').slice(0, 10);
      if (criterion.startDate && invDate < criterion.startDate) return false;
      if (criterion.endDate && invDate > criterion.endDate) return false;

      if (criterion.paymentMode !== 'ALL' && inv.payment_mode !== criterion.paymentMode) {
        return false;
      }

      if (criterion.search.trim()) {
        const q = criterion.search.toLowerCase().trim();
        const match =
          inv.invoice_no?.toLowerCase().includes(q) ||
          inv.customer_name?.toLowerCase().includes(q) ||
          inv.customer_mobile?.includes(q) ||
          inv.doctor_name?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [invoices, criterion]);

  // Filtered Vouchers according to Tab & Criterion
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (voucherFilter !== 'ALL' && v.voucher_type !== voucherFilter) {
        return false;
      }

      const vDate = (v.date || v.created_at || '').slice(0, 10);
      if (criterion.startDate && vDate < criterion.startDate) return false;
      if (criterion.endDate && vDate > criterion.endDate) return false;

      if (criterion.search.trim()) {
        const q = criterion.search.toLowerCase().trim();
        const match =
          v.voucher_no?.toLowerCase().includes(q) ||
          v.party_name?.toLowerCase().includes(q) ||
          v.narration?.toLowerCase().includes(q) ||
          v.reference_no?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [vouchers, voucherFilter, criterion]);

  // Voucher Summary Metrics
  const voucherMetrics = useMemo(() => {
    let debitPayments = 0;
    let creditReceipts = 0;
    let contraTransfers = 0;

    vouchers.forEach((v) => {
      const amt = parseFloat(v.amount) || 0;
      if (v.voucher_type === 'PAYMENT') debitPayments += amt;
      else if (v.voucher_type === 'RECEIPT') creditReceipts += amt;
      else if (v.voucher_type === 'CONTRA') contraTransfers += amt;
    });

    return {
      debitPayments,
      creditReceipts,
      contraTransfers,
      netCash: creditReceipts - debitPayments
    };
  }, [vouchers]);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
  });

  // Export to CSV helper
  const handleExportCSV = () => {
    if (subTab === 'register') {
      const headers = ['Invoice No', 'Date Time', 'Customer Name', 'Mobile', 'Doctor', 'Payment Mode', 'Items', 'Total Amount'];
      const rows = filteredInvoices.map(inv => [
        inv.invoice_no,
        new Date(inv.created_at).toLocaleString('en-IN'),
        inv.customer_name,
        inv.customer_mobile || '',
        inv.doctor_name || '',
        inv.payment_mode,
        inv.item_count || 1,
        Number(inv.final_amount).toFixed(2)
      ]);
      downloadCSV('GaavPharma_Sales_Register.csv', headers, rows);
    } else if (subTab === 'vouchers') {
      const headers = ['Voucher No', 'Date', 'Type', 'Account Party', 'Payment Mode', 'Reference No', 'Amount', 'Narration'];
      const rows = filteredVouchers.map(v => [
        v.voucher_no,
        v.date,
        v.voucher_type,
        v.party_name,
        v.payment_mode,
        v.reference_no || '',
        Number(v.amount).toFixed(2),
        v.narration || ''
      ]);
      downloadCSV('GaavPharma_Accounting_Vouchers.csv', headers, rows);
    } else {
      const headers = ['Customer Name', 'Mobile', 'Balance Due'];
      const rows = filteredCustomers.map(c => [
        c.name,
        c.mobile,
        Number(c.balance).toFixed(2)
      ]);
      downloadCSV('GaavPharma_Khata_Ledger.csv', headers, rows);
    }
  };

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live Current Balance for Selected Party in Voucher Form
  const selectedPartyBalance = useMemo(() => {
    if (voucherForm.party_category === 'DISTRIBUTOR' && voucherForm.party_id) {
      const d = distributors.find(dist => String(dist.id) === String(voucherForm.party_id));
      return d ? { amount: d.pending_balance || 0, type: 'Cr' } : null;
    }
    if (voucherForm.party_category === 'CUSTOMER' && voucherForm.party_id) {
      const c = customers.find(cust => String(cust.id) === String(voucherForm.party_id));
      return c ? { amount: c.balance || 0, type: 'Dr' } : null;
    }
    return null;
  }, [voucherForm.party_category, voucherForm.party_id, distributors, customers]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Financial Register, Khata & Accounting Vouchers
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Daily drawer reconciliation, digital payment settlements, and complete MediVision-standard accounting vouchers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* MediVision Define Criterion Button (Photo 21) */}
          <button
            type="button"
            onClick={() => setShowCriterionModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold shadow-2xs transition-colors"
            title="Define Criterion Filter (F8 / Alt+C)"
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Define Criterion</span>
            <kbd className="text-[9px] bg-white border border-slate-300 px-1 rounded font-mono">F8</kbd>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors"
            title="Export Active Table to CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Quick Hotkey Vouchers */}
          <div className="flex items-center space-x-1 pl-1 border-l border-slate-200">
            <button
              type="button"
              onClick={() => openVoucherModal('PAYMENT')}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
              title="New Payment Voucher (F5)"
            >
              <ArrowUpRight className="w-3 h-3 text-rose-600" />
              <span>F5: Payment</span>
            </button>
            <button
              type="button"
              onClick={() => openVoucherModal('RECEIPT')}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
              title="New Receipt Voucher (F6)"
            >
              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
              <span>F6: Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => openVoucherModal('CONTRA')}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
              title="New Contra Cash/Bank Transfer (F4)"
            >
              <Landmark className="w-3 h-3 text-blue-600" />
              <span>F4: Contra</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {!isCashier && (invoices.length > 0 || customers.length > 0 || vouchers.length > 0) && (
            <button
              onClick={async () => {
                if (confirm('Delete all recorded bills, vouchers, and reset the register & khata balances to zero?')) {
                  await api.clearAllRecords();
                  await loadData();
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors"
              title="Wipe test records and reset register"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Records</span>
            </button>
          )}

          {subTab === 'khata' && (
            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Khata Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Stats Grid */}
      <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3">
        {subTab === 'vouchers' ? (
          /* Vouchers Financial Summary Bar */
          <>
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Payments (Debit)
              </div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                ₹{voucherMetrics.debitPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Expenses & Distributor Dues
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Total Receipts (Credit)</span>
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                ₹{voucherMetrics.creditReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Khata Collections & Income
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Contra (Bank Transfer)</span>
                <Landmark className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-bold font-mono text-blue-700 mt-1">
                ₹{voucherMetrics.contraTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Deposits & Withdrawals
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                <span>Cash in Hand</span>
                <Banknote className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                ₹{summary.today?.cash_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Physical drawer balance
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Net Cash Movement</span>
                <DollarSign className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className={`text-xl font-bold font-mono mt-1 ${voucherMetrics.netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {voucherMetrics.netCash >= 0 ? '+' : ''}₹{voucherMetrics.netCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Receipts minus Payments
              </div>
            </div>
          </>
        ) : (
          /* Standard Sales Register Summary Bar */
          <>
            {/* Total Today */}
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Today's Gross Sales
              </div>
              {hideDrawerFromCashier ? (
                <div className="flex items-center space-x-1.5 mt-1 text-slate-400">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-base font-semibold tracking-widest text-slate-400">••••••</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  ₹{summary.today?.total_sales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {hideDrawerFromCashier ? 'Confidential (Admin only)' : `${summary.today?.total_invoices || 0} Bills Issued`}
              </div>
            </div>

            {/* Cash in Drawer */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Cash in Hand</span>
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              {hideDrawerFromCashier ? (
                <div className="flex items-center space-x-1.5 mt-1 text-slate-400">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="font-mono text-base font-semibold tracking-widest text-slate-500">••••••</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  ₹{summary.today?.cash_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-0.5">
                {hideDrawerFromCashier ? 'Confidential drawer cash' : 'Physical drawer cash'}
              </div>
            </div>

            {/* UPI Payments */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>UPI / QR</span>
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ₹{summary.today?.upi_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Direct bank settlements
              </div>
            </div>

            {/* Khata Credit */}
            <div className="p-3 bg-white rounded-xl border border-rose-200/80 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-rose-700 uppercase tracking-wider">
                <span>Credit Given Today</span>
                <BookMarked className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                ₹{summary.today?.khata_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5">
                Khata debits issued
              </div>
            </div>

            {/* Total Outstanding Khata */}
            <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                <span>Total Khata Due</span>
                <Users className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                ₹{summary.khataPending?.total_khata_pending?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {summary.khataPending?.active_khata_customers || 0} active accounts
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sub Tabs Selector */}
      <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6 text-xs font-medium">
          <button
            onClick={() => setSubTab('register')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'register'
                ? 'border-emerald-600 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Issued Bills & Invoices ({filteredInvoices.length})</span>
          </button>

          <button
            onClick={() => {
              if (!allowKhata) {
                alert('Khata Credit Ledger has been turned OFF by the Store Admin.');
                return;
              }
              setSubTab('khata');
            }}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'khata'
                ? 'border-emerald-600 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-slate-400" />
            <span>Family Khata Accounts ({customers.length})</span>
            {!allowKhata && (
              <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-normal flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5 text-slate-400" /> Deactivated
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('vouchers')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'vouchers'
                ? 'border-emerald-600 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Cash & Bank Book / Vouchers ({filteredVouchers.length})</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
              MediVision
            </span>
          </button>
        </div>

        {subTab === 'khata' && (
          <div className="relative w-60 pb-2">
            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search family or mobile..."
              className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-emerald-600"
            />
          </div>
        )}

        {subTab === 'vouchers' && (
          <div className="flex items-center space-x-1.5 pb-2">
            {['ALL', 'PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL'].map(type => (
              <button
                key={type}
                onClick={() => setVoucherFilter(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  voucherFilter === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tab View */}
      <div className="flex-1 p-5 overflow-y-auto">
        {subTab === 'register' ? (
          /* TAB 1: Today's Invoices Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 w-36">Bill Number</th>
                  <th className="py-2.5 px-3.5 w-28">Time</th>
                  <th className="py-2.5 px-3.5 min-w-[180px]">Customer Name</th>
                  <th className="py-2.5 px-3.5 w-32">Mobile</th>
                  <th className="py-2.5 px-3.5 w-28">Doctor</th>
                  <th className="py-2.5 px-3.5 w-24">Payment Mode</th>
                  <th className="py-2.5 px-3.5 w-20 text-right">Items</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3.5 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-10 text-center text-slate-400 font-sans">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">{inv.invoice_no}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[10px]">
                        {new Date(inv.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900">
                        {inv.customer_name}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">{inv.customer_mobile || '-'}</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-600">{inv.doctor_name || '-'}</td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded uppercase ${
                            inv.payment_mode === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.payment_mode === 'upi'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : inv.payment_mode === 'khata'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {inv.payment_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-600">
                        {inv.item_count || 1}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-slate-900">
                        ₹{Number(inv.final_amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const details = await api.getInvoiceDetails(inv.id);
                              setSelectedInvoice(details || inv);
                            } catch (err) {
                              console.error('Failed to load invoice details:', err);
                              setSelectedInvoice(inv);
                            }
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 text-xs font-medium flex items-center justify-center gap-1 mx-auto shadow-2xs cursor-pointer transition-colors"
                        >
                          <Eye className="w-3 h-3 text-slate-400" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : subTab === 'khata' ? (
          /* TAB 2: Family Khata Ledger Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Family / Customer Name</th>
                  <th className="py-2.5 px-3.5 w-32">Mobile Number</th>
                  <th className="py-2.5 px-3.5 w-36">Last Transaction</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Balance Due (₹)</th>
                  <th className="py-2.5 px-3.5 w-60 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400 font-sans">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust, idx) => {
                    const hasBalance = cust.balance > 0;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-sans">
                          <div className="font-semibold text-slate-900">{cust.name}</div>
                          {cust.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{cust.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono">{cust.mobile}</td>
                        <td className="py-2.5 px-3.5 text-slate-500 text-[10px]">
                          {cust.last_transaction_at ? new Date(cust.last_transaction_at).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-rose-700">
                          ₹{Number(cust.balance || 0).toFixed(2)} Dr
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowSettleModal(cust);
                                setSettleAmount(String(cust.balance || ''));
                              }}
                              disabled={!hasBalance}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded text-xs font-medium shadow-2xs transition-colors"
                            >
                              Settle (जमा)
                            </button>
                            {allowWhatsApp && (
                              <button
                                type="button"
                                onClick={() => sendWhatsAppReminder(cust)}
                                disabled={!hasBalance}
                                className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded text-xs font-medium disabled:opacity-40 flex items-center gap-1 transition-colors"
                                title="Send WhatsApp reminder"
                              >
                                <MessageSquare className="w-3 h-3 text-green-600" /> WhatsApp
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 3: Accounting Vouchers & Cash/Bank Book (MediVision Parity: Photos 1, 3, 20) */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold font-mono">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 w-24">Date</th>
                  <th className="py-2.5 px-3.5 w-28">Voucher No</th>
                  <th className="py-2.5 px-3.5 w-24">Type</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Account Head / Party</th>
                  <th className="py-2.5 px-3.5 w-24">Mode</th>
                  <th className="py-2.5 px-3.5 w-32">Reference No</th>
                  <th className="py-2.5 px-3.5 w-28 text-right text-rose-700">Debit (₹)</th>
                  <th className="py-2.5 px-3.5 w-28 text-right text-emerald-700">Credit (₹)</th>
                  <th className="py-2.5 px-3.5 min-w-[150px]">Narration</th>
                  <th className="py-2.5 px-3.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400 font-sans">
                      No vouchers recorded matching the filter. Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">F5</kbd> for Payment or <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">F6</kbd> for Receipt.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v, idx) => {
                    const isPayment = v.voucher_type === 'PAYMENT';
                    const isReceipt = v.voucher_type === 'RECEIPT';
                    const isContra = v.voucher_type === 'CONTRA';
                    const isJournal = v.voucher_type === 'JOURNAL';

                    return (
                      <tr key={v.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-sans">
                          {new Date(v.date || v.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">{v.voucher_no}</td>
                        <td className="py-2.5 px-3.5 font-sans font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                              isPayment
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : isReceipt
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isContra
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {v.voucher_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                          {v.party_name}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 uppercase text-[10px]">
                          {v.payment_mode || 'CASH'}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 font-sans text-[10px]">
                          {v.reference_no || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-rose-700">
                          {isPayment || isContra ? `₹${Number(v.amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700">
                          {isReceipt ? `₹${Number(v.amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 font-sans text-slate-500 text-[10px] truncate max-w-xs">
                          {v.narration || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MediVision Voucher Creation Modal (Photos 1, 3, 20) */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {showVoucherModal.type === 'PAYMENT' && 'Payment Voucher (F5)'}
                  {showVoucherModal.type === 'RECEIPT' && 'Receipt Voucher (F6)'}
                  {showVoucherModal.type === 'CONTRA' && 'Contra Voucher: Cash/Bank (F4)'}
                  {showVoucherModal.type === 'JOURNAL' && 'Journal Voucher (F7)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Party / Account Category
                  </label>
                  <select
                    value={voucherForm.party_category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let defaultName = '';
                      if (cat === 'EXPENSE') defaultName = STANDARD_EXPENSE_HEADS[0];
                      else if (cat === 'BANK') defaultName = STANDARD_BANK_HEADS[0];
                      setVoucherForm({
                        ...voucherForm,
                        party_category: cat,
                        party_id: '',
                        party_name: defaultName
                      });
                    }}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="EXPENSE">Expense Head (Light, Rent, Tea)</option>
                    <option value="DISTRIBUTOR">Wholesale Distributor (Supplier)</option>
                    <option value="CUSTOMER">Khata Customer (Patient)</option>
                    <option value="BANK">Bank Account (SBI, HDFC)</option>
                    <option value="OTHER">Other Ledger Head</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Account Head Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Account Head / Party Name *
                </label>

                {voucherForm.party_category === 'EXPENSE' ? (
                  <select
                    value={voucherForm.party_name}
                    onChange={(e) => setVoucherForm({ ...voucherForm, party_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    {STANDARD_EXPENSE_HEADS.map(exp => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                ) : voucherForm.party_category === 'BANK' ? (
                  <select
                    value={voucherForm.party_name}
                    onChange={(e) => setVoucherForm({ ...voucherForm, party_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    {STANDARD_BANK_HEADS.map(bnk => (
                      <option key={bnk} value={bnk}>{bnk}</option>
                    ))}
                  </select>
                ) : voucherForm.party_category === 'DISTRIBUTOR' ? (
                  <select
                    value={voucherForm.party_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const d = distributors.find(dist => String(dist.id) === String(id));
                      setVoucherForm({
                        ...voucherForm,
                        party_id: id,
                        party_name: d ? d.name : ''
                      });
                    }}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="">-- Choose Wholesale Distributor --</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Pending: ₹{Number(d.pending_balance || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                ) : voucherForm.party_category === 'CUSTOMER' ? (
                  <select
                    value={voucherForm.party_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const c = customers.find(cust => String(cust.id) === String(id));
                      setVoucherForm({
                        ...voucherForm,
                        party_id: id,
                        party_name: c ? c.name : ''
                      });
                    }}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="">-- Choose Khata Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile}) - Due: ₹{Number(c.balance || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter account head name"
                    value={voucherForm.party_name}
                    onChange={(e) => setVoucherForm({ ...voucherForm, party_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                  />
                )}

                {/* MediVision Standard Photo 1 Live Current Balance Display */}
                {selectedPartyBalance && (
                  <div className="mt-1.5 p-2 bg-slate-100 rounded border border-slate-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 font-sans">Current Ledger Balance:</span>
                    <span className={`font-bold ${selectedPartyBalance.type === 'Cr' ? 'text-rose-700' : 'text-emerald-700'}`}>
                      [Cur Bal: ₹{Number(selectedPartyBalance.amount).toFixed(2)} {selectedPartyBalance.type}]
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-right font-mono font-bold text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={voucherForm.payment_mode}
                    onChange={(e) => setVoucherForm({ ...voucherForm, payment_mode: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                  >
                    <option value="CASH">CASH (Drawer)</option>
                    <option value="UPI">UPI / QR (Online)</option>
                    <option value="BANK">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reference No. / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #98124 or CHQ-449102"
                  value={voucherForm.reference_no}
                  onChange={(e) => setVoucherForm({ ...voucherForm, reference_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Narration / Remarks
                </label>
                <textarea
                  rows="2"
                  placeholder="Reason or notes for this voucher entry..."
                  value={voucherForm.narration}
                  onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white"
                ></textarea>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-[11px] text-slate-500 font-sans">
                  Press <kbd className="px-1 py-0.5 border bg-slate-100 rounded font-bold">Enter</kbd> to Save
                </span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(null)}
                    className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel (Esc)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs"
                  >
                    Save Voucher
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MediVision Define Criterion Modal (Photo 21) */}
      {showCriterionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Define Criterion (Report Filter)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCriterionModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Date Range Preset
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'week', label: '7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'all', label: 'All Time' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id)}
                      className={`py-1 rounded text-[10px] font-bold transition-colors ${
                        criterion.datePreset === p.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">From Date</label>
                  <input
                    type="date"
                    value={criterion.startDate}
                    onChange={(e) => setCriterion({ ...criterion, startDate: e.target.value, datePreset: 'custom' })}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">To Date</label>
                  <input
                    type="date"
                    value={criterion.endDate}
                    onChange={(e) => setCriterion({ ...criterion, endDate: e.target.value, datePreset: 'custom' })}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Mode Filter</label>
                <select
                  value={criterion.paymentMode}
                  onChange={(e) => setCriterion({ ...criterion, paymentMode: e.target.value })}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="cash">Cash Only</option>
                  <option value="upi">UPI Only</option>
                  <option value="khata">Khata / Credit Only</option>
                  <option value="card">Card Only</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Search Keyword</label>
                <input
                  type="text"
                  placeholder="Invoice No, Customer Name, Mobile, Doctor..."
                  value={criterion.search}
                  onChange={(e) => setCriterion({ ...criterion, search: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    applyDatePreset('today');
                    setCriterion(prev => ({ ...prev, paymentMode: 'ALL', search: '' }));
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Reset Criteria
                </button>
                <button
                  type="button"
                  onClick={() => setShowCriterionModal(false)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs"
                >
                  Apply Criteria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Khata Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="font-semibold text-sm text-slate-900">
                Settle Khata Debt (जमा नोंद)
              </h3>
              <button
                onClick={() => setShowSettleModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-3 font-sans text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Customer</span>
                <span className="font-semibold text-slate-900 text-sm">{showSettleModal.name}</span>
                <span className="text-slate-400 block text-[10px] font-mono">{showSettleModal.mobile}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Pending Dues:</span>
                <span className="font-bold font-mono text-rose-700 text-sm">
                  ₹{Number(showSettleModal.balance || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Payment Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Receipt Note</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Counter cash settlement"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-xs"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Khata Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="font-semibold text-sm text-slate-900">
                Register Khata Customer
              </h3>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 font-sans text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Customer / Family Head Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vitthal Shinde"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  required
                  placeholder="e.g. 9822114477"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details / Thermal Receipt Modal */}
      {selectedInvoice && (
        <ReceiptModal
          invoice={selectedInvoice}
          storeProfile={storeProfile}
          allowWhatsApp={allowWhatsApp}
          onClose={() => setSelectedInvoice(null)}
          onNewSale={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
