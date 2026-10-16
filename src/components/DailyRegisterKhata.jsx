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
  MessageCircle,
  Plus,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from './ReceiptModal';

export default function DailyRegisterKhata() {
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
  const [settleNote, setSettleNote] = useState('Cash payment settlement');
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
      alert('Name and Mobile are required');
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
      alert('Enter a valid amount!');
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

    const msg = `*🌿 ANAND MEDICAL & GENERAL STORES*%0A` +
      `--------------------------------%0A` +
      `नमस्ते *${customer.name}* जी,%0A` +
      `आनंद मेडिकल से आपका बकाया खाता शेष: *₹${Number(customer.balance).toFixed(2)}* है।%0A` +
      `कृपया सुविधा अनुसार काउंटर पर या Google Pay/PhonePe से भुगतान करें।%0A` +
      `--------------------------------%0A` +
      `संपर्क: +91 98220 12345%0A` +
      `धन्यवाद! आपका स्वास्थ्य, हमारी प्राथमिकता।`;

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
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-extrabold text-slate-900">
              📒 Daily Register, Collections & Khata Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily cash drawer balancing, UPI reconciliations, and family credit recovery.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>

          {subTab === 'khata' && (
            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Khata Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Stats Grid */}
      <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Today */}
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Today's Total Revenue
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
            ₹{summary.today?.total_sales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            {summary.today?.total_invoices || 0} Bills Generated
          </div>
        </div>

        {/* Cash in Drawer */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            <span>Cash in Hand</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-800 mt-0.5">
            ₹{summary.today?.cash_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-medium">
            Physical drawer cash
          </div>
        </div>

        {/* UPI Payments */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 uppercase tracking-wider">
            <span>UPI / QR</span>
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-blue-800 mt-0.5">
            ₹{summary.today?.upi_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-blue-700 mt-1 font-medium">
            Bank account settled
          </div>
        </div>

        {/* Khata Credit */}
        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-red-800 uppercase tracking-wider">
            <span>Khata Given Today</span>
            <BookMarked className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-red-700 mt-0.5">
            ₹{summary.today?.khata_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-red-600 mt-1 font-medium">
            Credit bills issued
          </div>
        </div>

        {/* Total Outstanding Khata */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 uppercase tracking-wider">
            <span>Total Pending Khata</span>
            <User className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-900 mt-0.5">
            ₹{summary.khataPending?.total_khata_pending?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-800 mt-1 font-medium">
            {summary.khataPending?.active_khata_customers || 0} families pending
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6 text-xs font-bold">
          <button
            onClick={() => setSubTab('register')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'register'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Today's Issued Bills & Invoices ({invoices.length})</span>
          </button>

          <button
            onClick={() => setSubTab('khata')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
              subTab === 'khata'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Family Khata Ledger & Udhaari ({customers.length})</span>
          </button>
        </div>

        {subTab === 'khata' && (
          <div className="relative w-64 pb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search family name or mobile..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Main Tab View */}
      <div className="flex-1 p-5 overflow-y-auto">
        {subTab === 'register' ? (
          /* Today's Invoices Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-bold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 w-36">Bill Number</th>
                  <th className="py-2.5 px-3.5 w-28">Time</th>
                  <th className="py-2.5 px-3.5 min-w-[180px]">Customer Name</th>
                  <th className="py-2.5 px-3.5 w-32">Mobile</th>
                  <th className="py-2.5 px-3.5 w-28">Doctor</th>
                  <th className="py-2.5 px-3.5 w-24">Mode</th>
                  <th className="py-2.5 px-3.5 w-24 text-right">Items</th>
                  <th className="py-2.5 px-3.5 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-10 text-center text-slate-400 font-sans">
                      No invoices recorded yet today.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{inv.invoice_no}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                        {new Date(inv.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                        {inv.customer_name}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">{inv.customer_mobile || '-'}</td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-600">{inv.doctor_name || '-'}</td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            inv.payment_mode === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.payment_mode === 'upi'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.payment_mode === 'khata'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {inv.payment_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-700">
                        {inv.item_count || 1}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-sm text-slate-900">
                        ₹{Number(inv.final_amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <button
                          onClick={async () => {
                            const details = await api.getInvoiceDetails(inv.id);
                            setSelectedInvoice(details || inv);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-bold">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5 min-w-[200px]">Family / Customer Name</th>
                  <th className="py-2.5 px-3.5 w-32">Mobile Number</th>
                  <th className="py-2.5 px-3.5 w-40">Last Activity</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Balance Due (₹)</th>
                  <th className="py-2.5 px-3.5 w-60 text-center">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400 font-sans">
                      No Khata customers found. Click "+ Add Khata Customer" to begin.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust, idx) => {
                    const hasBalance = cust.balance > 0;

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-sans font-bold text-slate-900">
                          {cust.name}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700">{cust.mobile}</td>
                        <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                          {cust.last_activity
                            ? new Date(cust.last_activity).toLocaleDateString('en-IN')
                            : 'Active'}
                        </td>
                        <td
                          className={`py-2.5 px-3.5 text-right font-extrabold text-sm ${
                            hasBalance ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          ₹{Number(cust.balance).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans space-x-2">
                          {hasBalance ? (
                            <>
                              <button
                                onClick={() => sendWhatsAppReminder(cust)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-colors"
                                title="Send reminder message on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Reminder</span>
                              </button>

                              <button
                                onClick={() => {
                                  setShowSettleModal(cust);
                                  setSettleAmount(cust.balance.toString());
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <span>Settle Payment</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ All Dues Clear
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Record Khata Payment
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: <b>{showSettleModal.name}</b> (Ph: {showSettleModal.mobile})
                </p>
              </div>
              <button
                onClick={() => setShowSettleModal(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center font-mono">
                <span className="text-red-700 font-bold">Current Balance Due:</span>
                <span className="text-lg font-extrabold text-red-700">
                  ₹{Number(showSettleModal.balance).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={showSettleModal.balance}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Receipt Note / Mode</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid cash at shop counter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
                >
                  Confirm & Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Khata Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Register New Khata Customer
              </h3>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 font-sans text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Family / Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vitthal Shinde (Krushi Seva)"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  required
                  placeholder="e.g. 9822114477"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
                >
                  Create Customer
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
          onClose={() => setSelectedInvoice(null)}
          onNewSale={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
