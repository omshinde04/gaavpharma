import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';

export default function DailyRegisterKhata({ currentUser, featureToggles, storeProfile }) {
  const allowKhata = featureToggles?.allow_khata !== false && featureToggles?.allow_khata !== 'false' && featureToggles?.allow_khata !== 0;
  const allowWhatsApp = featureToggles?.allow_whatsapp !== false && featureToggles?.allow_whatsapp !== 'false' && featureToggles?.allow_whatsapp !== 0;
  const isCashier = currentUser?.role?.toLowerCase() === 'cashier';
  const hideDrawerFromCashier = isCashier && (
    featureToggles?.hide_drawer_from_cashier === true ||
    featureToggles?.hide_drawer_from_cashier === 'true' ||
    featureToggles?.hide_drawer_from_cashier === 1
  );

  const [subTab, setSubTab] = useState('register'); // 'register' | 'khata'
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

  const loadData = async () => {
    try {
      const summ = await api.getDailyRegisterSummary();
      const invs = await api.getInvoices(50);
      const custs = await api.getKhataCustomers();
      if (summ) setSummary(summ);
      if (invs) setInvoices(invs);
      if (custs) setCustomers(custs);
    } catch (err) {
      console.error('Error loading register data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Financial Register & Khata Ledger
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Daily drawer reconciliation, digital payment settlements, and customer credit ledger.
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
      </div>

      {/* Sub Tabs Selector */}
      <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6 text-xs font-medium">
          <button
            onClick={() => setSubTab('register')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'register'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Issued Bills & Invoices ({invoices.length})</span>
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
                ? 'border-emerald-600 text-slate-900 font-semibold'
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
      </div>

      {/* Main Tab View */}
      <div className="flex-1 p-5 overflow-y-auto">
        {subTab === 'register' ? (
          /* Today's Invoices Table */
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
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-10 text-center text-slate-400 font-sans">
                      No invoices recorded yet today.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
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
        ) : (
          /* Family Khata Ledger Table */
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
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                          {cust.name}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">{cust.mobile}</td>
                        <td className="py-2.5 px-3.5 text-slate-500 text-[10px]">
                          {cust.last_activity
                            ? new Date(cust.last_activity).toLocaleDateString('en-IN')
                            : 'Active'}
                        </td>
                        <td
                          className={`py-2.5 px-3.5 text-right font-bold ${
                            hasBalance ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          ₹{Number(cust.balance).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans space-x-1.5">
                          {hasBalance ? (
                            <>
                              <button
                                onClick={() => sendWhatsAppReminder(cust)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 text-xs font-medium inline-flex items-center gap-1 shadow-2xs transition-colors"
                                title="Send reminder message on WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp Reminder</span>
                              </button>

                              <button
                                onClick={() => {
                                  setShowSettleModal(cust);
                                  setSettleAmount(cust.balance.toString());
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium inline-flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <span>Settle Payment</span>
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              <CheckCircle2 className="w-3 h-3" /> Settled
                            </span>
                          )}
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

      {/* Settle Khata Payment Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2.5">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Record Khata Payment
                </h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  {showSettleModal.name} • {showSettleModal.mobile}
                </p>
              </div>
              <button
                onClick={() => setShowSettleModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200/80 flex justify-between items-center font-mono">
                <span className="text-rose-700 text-xs">Current Balance Due:</span>
                <span className="text-base font-bold text-rose-700">
                  ₹{Number(showSettleModal.balance).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Payment Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={showSettleModal.balance}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-semibold focus:bg-white"
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
