import React from 'react';
import { Printer, MessageCircle, X, CheckCircle, Store, Phone, Calendar, User, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function ReceiptModal({ invoice, onClose, onNewSale }) {
  if (!invoice) return null;

  const handlePrint = async () => {
    await api.printReceipt();
  };

  const generateWhatsAppUrl = () => {
    const mobile = invoice.customer_mobile?.replace(/\D/g, '') || '';
    const phoneWithCountry = mobile.startsWith('91') ? mobile : `91${mobile}`;

    const itemsSummary = (invoice.items || [])
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.product_name || 'Item'}* ${
            it.is_loose_tablet ? `(${it.qty} tabs)` : `(${it.qty} strip)`
          } - ₹${Number(it.total_price).toFixed(2)}`
      )
      .join('%0A');

    const msg = `*🌿 ANAND MEDICAL & GENERAL STORES*%0A` +
      `Near Bus Stand, Main Road%0A` +
      `DL: 20B/21B-MH-SOL-194829%0A` +
      `GSTIN: 27AABCA1234F1Z9%0A` +
      `--------------------------------%0A` +
      `*Bill No:* ${invoice.invoice_no}%0A` +
      `*Date:* ${new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN')}%0A` +
      `*Customer:* ${invoice.customer_name || 'Cash Customer'}%0A` +
      (invoice.doctor_name ? `*Doctor:* ${invoice.doctor_name}%0A` : '') +
      `--------------------------------%0A` +
      `*ITEMS:*%0A${itemsSummary}%0A` +
      `--------------------------------%0A` +
      `*TOTAL AMOUNT:* ₹${Number(invoice.final_amount).toFixed(2)}%0A` +
      `*Payment Mode:* ${invoice.payment_mode?.toUpperCase()}%0A` +
      `--------------------------------%0A` +
      `Thank you for your visit! Get well soon.%0A` +
      `Call / WhatsApp: +91 98220 12345`;

    return `https://wa.me/${phoneWithCountry ? phoneWithCountry : ''}?text=${msg}`;
  };

  const handleWhatsApp = async () => {
    const url = generateWhatsAppUrl();
    await api.openExternalUrl(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-base">Sale Completed Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt (80mm width standard) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-[320px] text-[12px] font-mono text-slate-900 leading-tight space-y-3"
          >
            {/* Receipt Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
              <div className="font-extrabold text-sm tracking-wide text-slate-950 uppercase">
                Anand Medical & General Stores
              </div>
              <div className="text-[11px] text-slate-600">Near Bus Stand, Main Road</div>
              <div className="text-[10px] text-slate-500">DL: 20B/21B-MH-SOL-194829</div>
              <div className="text-[10px] text-slate-500">GSTIN: 27AABCA1234F1Z9</div>
              <div className="text-[10px] text-slate-500">Ph: +91 98220 12345</div>
            </div>

            {/* Bill Meta */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="font-bold">Bill No:</span>
                <span className="font-bold">{invoice.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN')}{' '}
                  {new Date(invoice.created_at || Date.now()).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold truncate max-w-[170px]">
                  {invoice.customer_name || 'Cash Customer'}
                </span>
              </div>
              {invoice.customer_mobile && (
                <div className="flex justify-between">
                  <span>Mobile:</span>
                  <span>{invoice.customer_mobile}</span>
                </div>
              )}
              {invoice.doctor_name && (
                <div className="flex justify-between">
                  <span>Doctor:</span>
                  <span>{invoice.doctor_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-bold uppercase text-emerald-800">
                  {invoice.payment_mode}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200">
                <span className="w-[140px]">Item / Batch</span>
                <span className="text-right w-[40px]">Qty</span>
                <span className="text-right w-[50px]">Rate</span>
                <span className="text-right w-[60px]">Amt (₹)</span>
              </div>

              {(invoice.items || []).map((it, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold truncate w-[140px] text-slate-950">
                      {it.product_name || 'Item'}
                    </span>
                    <span className="text-right w-[40px]">
                      {it.qty} {it.is_loose_tablet ? 'T' : 'S'}
                    </span>
                    <span className="text-right w-[50px]">
                      {Number(it.unit_price).toFixed(2)}
                    </span>
                    <span className="text-right font-semibold w-[60px]">
                      {Number(it.total_price).toFixed(2)}
                    </span>
                  </div>
                  {(it.batch_no || it.expiry_date) && (
                    <div className="text-[10px] text-slate-500 pl-1">
                      B: {it.batch_no || '-'} | Exp: {it.expiry_date || '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Calculation */}
            <div className="space-y-1 text-right text-[11px] pb-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(invoice.total_amount).toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-₹{Number(invoice.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span className="text-emerald-800">
                  ₹{Number(invoice.final_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-1 text-[10px] text-slate-500 space-y-0.5">
              <div>Thank You for Choosing Anand Medical!</div>
              <div>Get Well Soon • Keep Medicines in Cool Place</div>
              <div className="text-[9px] pt-1 text-slate-400">Powered by GaavPharma POS</div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onNewSale}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            + Next Bill (F2)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
              title="Send bill directly to customer on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Bill</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Thermal Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
