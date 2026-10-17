import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PlusCircle,
  Package,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  Check,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function FastProductCreateModal({
  isOpen,
  initialName = '',
  onClose,
  onProductCreated
}) {
  const [formData, setFormData] = useState({
    name: '',
    generic_salt: '',
    category: 'medicine',
    rack_location: 'Rack A-1',
    strip_size: 10,
    is_schedule_h1: false,
    min_stock_alert: 5,
    batch_no: '',
    expiry_date: '',
    purchase_rate: '',
    mrp: '',
    stock_qty: 10
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Refs for zero-mouse Enter key navigation
  const nameRef = useRef(null);
  const saltRef = useRef(null);
  const categoryRef = useRef(null);
  const rackRef = useRef(null);
  const stripRef = useRef(null);
  const h1Ref = useRef(null);
  const batchRef = useRef(null);
  const expRef = useRef(null);
  const purchaseRef = useRef(null);
  const mrpRef = useRef(null);
  const qtyRef = useRef(null);
  const submitBtnRef = useRef(null);

  // Field sequence for Enter key navigation
  const fieldRefs = [
    nameRef,
    saltRef,
    categoryRef,
    rackRef,
    stripRef,
    h1Ref,
    batchRef,
    expRef,
    purchaseRef,
    mrpRef,
    qtyRef
  ];

  useEffect(() => {
    if (isOpen) {
      // Auto generate initial batch expiry (2 years from now)
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);

      setFormData({
        name: initialName || '',
        generic_salt: '',
        category: 'medicine',
        rack_location: 'Rack A-1',
        strip_size: 10,
        is_schedule_h1: false,
        min_stock_alert: 5,
        batch_no: 'B-' + Math.floor(1000 + Math.random() * 9000),
        expiry_date: `${mm}/${yy}`,
        purchase_rate: '',
        mrp: '',
        stock_qty: 10
      });
      setError('');

      setTimeout(() => {
        if (initialName && initialName.trim()) {
          // If name was already typed in search, jump to salt or batch
          saltRef.current?.focus();
        } else {
          nameRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, initialName]);

  // Global hotkeys inside modal (Esc to cancel, Ctrl+Enter or F10 to save)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F10' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleFieldKeyDown = (e, currentIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex === fieldRefs.length - 1) {
        // Last field: submit form!
        handleSubmit();
      } else {
        // Move to next field
        const nextRef = fieldRefs[currentIndex + 1];
        if (nextRef && nextRef.current) {
          nextRef.current.focus();
          if (nextRef.current.select) nextRef.current.select();
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setError('कृपया औषधाचे नाव प्रविष्ट करा (Product Name is required)');
      nameRef.current?.focus();
      return;
    }
    if (!formData.mrp || parseFloat(formData.mrp) <= 0) {
      setError('कृपया योग्य MRP प्रविष्ट करा (Valid MRP is required)');
      mrpRef.current?.focus();
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: formData.name.trim(),
        generic_salt: formData.generic_salt?.trim() || null,
        category: formData.category || 'medicine',
        rack_location: formData.rack_location?.trim() || 'Rack A-1',
        strip_size: parseInt(formData.strip_size, 10) || 10,
        is_schedule_h1: formData.is_schedule_h1 ? 1 : 0,
        min_stock_alert: parseInt(formData.min_stock_alert, 10) || 5,
        batch_no: formData.batch_no?.trim() || 'BATCH-01',
        expiry_date: formData.expiry_date?.trim() || '12/28',
        purchase_rate: parseFloat(formData.purchase_rate) || (parseFloat(formData.mrp) * 0.75),
        mrp: parseFloat(formData.mrp) || 0,
        stock_qty: parseInt(formData.stock_qty, 10) || 0
      };

      const res = await api.fastCreateProductWithBatch(payload);
      if (res && res.success) {
        onProductCreated(res.product, res.batch);
        onClose();
      } else {
        setError('औषध सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
      }
    } catch (err) {
      setError(`त्रुटी: ${err.message || 'Error creating product'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  जलद औषध व बॅच नोंदणी (In-Line Fast Item Master)
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  F3 / Ins
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                बिलिंग काउंटर न सोडता ५ सेकंदात औषध व बॅच ॲड करा आणि थेट बिलात जोडा
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="बंद करा (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Section 1: Item Core Details */}
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" /> १. औषधाचा मुख्य तपशील (Medicine Details)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  औषधाचे नाव (Product / Brand Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  placeholder="उदा. Dolo 650, Augmentin 625 Duo, Pan-D"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Generic Salt / घटक (Salt Formula)
                </label>
                <input
                  ref={saltRef}
                  type="text"
                  placeholder="उदा. Paracetamol 650mg"
                  value={formData.generic_salt}
                  onChange={(e) => setFormData({ ...formData, generic_salt: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्रकार (Category)
                </label>
                <select
                  ref={categoryRef}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 2)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="medicine">गोळ्या / कॅप्सूल (Tablet/Capsule)</option>
                  <option value="syrup">सिरप / लिक्विड (Syrup/Liquid)</option>
                  <option value="injection">इंजेक्शन (Injection)</option>
                  <option value="ointment">मलम / ऑइंटमेंट (Ointment/Cream)</option>
                  <option value="general">जनरल / कॉस्मेटिक (General/FMCG)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  रॅक / कपाट जागा (Rack Location)
                </label>
                <input
                  ref={rackRef}
                  type="text"
                  placeholder="उदा. Rack A-1, Drawer 3"
                  value={formData.rack_location}
                  onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 3)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  स्ट्रिप साईझ (Strip Size / Units per Pack)
                </label>
                <input
                  ref={stripRef}
                  type="number"
                  min="1"
                  value={formData.strip_size}
                  onChange={(e) => setFormData({ ...formData, strip_size: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 4)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    ref={h1Ref}
                    type="checkbox"
                    checked={formData.is_schedule_h1}
                    onChange={(e) => setFormData({ ...formData, is_schedule_h1: e.target.checked })}
                    onKeyDown={(e) => handleFieldKeyDown(e, 5)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span>Schedule H1 औषध (FDA रजिस्टर नोंद अनिवार्य)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {formData.is_schedule_h1 ? '🔴 Red Line Rx' : 'Normal Medicine'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Batch & Pricing */}
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> २. पहिली बॅच व किंमत (Batch & Stock)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  बॅच नंबर (Batch No)
                </label>
                <input
                  ref={batchRef}
                  type="text"
                  placeholder="BATCH-01"
                  value={formData.batch_no}
                  onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 6)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  एक्सपायरी (MM/YY)
                </label>
                <input
                  ref={expRef}
                  type="text"
                  placeholder="12/28"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 7)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  खरेदी दर (Purchase ₹)
                </label>
                <input
                  ref={purchaseRef}
                  type="number"
                  step="0.01"
                  placeholder="22.50"
                  value={formData.purchase_rate}
                  onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 8)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MRP (विक्री दर ₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={mrpRef}
                  type="number"
                  step="0.01"
                  required
                  placeholder="34.00"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 9)}
                  className="w-full px-3 py-2 text-sm bg-white border border-emerald-400 rounded-lg text-emerald-900 font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  सुरुवातीचा स्टॉक (Initial Stock Units)
                </label>
                <input
                  ref={qtyRef}
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, 10)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-2 pt-5 text-xs text-slate-500">
                <span className="font-semibold">💡 टीप:</span>
                <span>'Enter' दाबून पुढील फील्डवर जा किंवा सेव्ह करा. माऊस वापरण्याची गरज नाही!</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">
                Enter
              </kbd>
              <span>Next / Submit</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">
                F10
              </kbd>
              <span>Fast Save</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">
                Esc
              </kbd>
              <span>Cancel</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
              >
                रद्द करा (Esc)
              </button>
              <button
                ref={submitBtnRef}
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span>सेव्ह होत आहे...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>सेव्ह करा व बिलात जोडा (Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
