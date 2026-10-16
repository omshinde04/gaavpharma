import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Barcode,
  Tag,
  AlertCircle,
  PackageCheck,
  Calendar,
  Layers,
  CheckCircle2,
  MapPin,
  Pill,
  ShoppingBag
} from 'lucide-react';
import { api } from '../services/api';

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState('medicine'); // 'medicine' | 'general'
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(null); // product object
  const [isLoading, setIsLoading] = useState(true);

  // New Product Form State
  const [newProd, setNewProd] = useState({
    name: '',
    generic_salt: '',
    category: 'medicine',
    barcode: '',
    rack_location: '',
    strip_size: 10,
    is_schedule_h1: false,
    min_stock_alert: 5,
    batch_no: '',
    expiry_date: '',
    purchase_rate: '',
    mrp: '',
    stock_qty: ''
  });

  // New Batch Form State
  const [newBatch, setNewBatch] = useState({
    batch_no: '',
    expiry_date: '',
    purchase_rate: '',
    mrp: '',
    stock_qty: ''
  });

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllProducts(activeTab === 'medicine' ? 'medicine' : 'all');
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeTab]);

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'general' && p.category === 'medicine') return false;
    if (activeTab === 'medicine' && p.category !== 'medicine') return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.generic_salt && p.generic_salt.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.rack_location && p.rack_location.toLowerCase().includes(q))
    );
  });

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name.trim()) {
      alert('Product name is required.');
      return;
    }

    try {
      await api.addProduct({
        ...newProd,
        strip_size: parseInt(newProd.strip_size, 10) || 1,
        min_stock_alert: parseInt(newProd.min_stock_alert, 10) || 5,
        purchase_rate: parseFloat(newProd.purchase_rate) || 0,
        mrp: parseFloat(newProd.mrp) || 0,
        stock_qty: parseInt(newProd.stock_qty, 10) || 0
      });

      setShowAddProductModal(false);
      setNewProd({
        name: '',
        generic_salt: '',
        category: activeTab === 'medicine' ? 'medicine' : 'general',
        barcode: '',
        rack_location: '',
        strip_size: 10,
        is_schedule_h1: false,
        min_stock_alert: 5,
        batch_no: '',
        expiry_date: '',
        purchase_rate: '',
        mrp: '',
        stock_qty: ''
      });
      loadProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatch.batch_no || !newBatch.expiry_date || !newBatch.mrp) {
      alert('Batch number, expiry date, and MRP are mandatory.');
      return;
    }

    try {
      await api.addBatch({
        product_id: showAddBatchModal.id,
        batch_no: newBatch.batch_no.trim(),
        expiry_date: newBatch.expiry_date.trim(),
        purchase_rate: parseFloat(newBatch.purchase_rate) || 0,
        mrp: parseFloat(newBatch.mrp) || 0,
        stock_qty: parseInt(newBatch.stock_qty, 10) || 0
      });

      setShowAddBatchModal(null);
      setNewBatch({
        batch_no: '',
        expiry_date: '',
        purchase_rate: '',
        mrp: '',
        stock_qty: ''
      });
      loadProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to add batch');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Top Header & Actions */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Inventory Master Catalog
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage pharmaceutical stock, salt formulas, batch expiries, and retail goods.
          </p>
        </div>

        <button
          onClick={() => {
            setNewProd({
              ...newProd,
              category: activeTab === 'medicine' ? 'medicine' : 'general'
            });
            setShowAddProductModal(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Segmented Tabs & Search Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
        {/* Segmented Pill Selector */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('medicine')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'medicine'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>Prescription & OTC Medicines</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span>General FMCG & Care Items</span>
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${activeTab === 'medicine' ? 'medicines or salts' : 'FMCG or barcodes'}...`}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                <th className="py-2.5 px-3.5 min-w-[220px]">Item Name & Salt</th>
                <th className="py-2.5 px-3.5 w-32">Rack Location</th>
                <th className="py-2.5 px-3.5 w-28">Category</th>
                <th className="py-2.5 px-3.5 w-44">Active Batches & Expiry</th>
                <th className="py-2.5 px-3.5 w-24 text-right">Total Stock</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Stock Status</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-sans">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const totalStock = p.total_stock || 0;
                  const isLow = totalStock <= (p.min_stock_alert || 5);
                  const batches = p.batches || [];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-semibold text-slate-900 flex items-center space-x-1.5 leading-tight">
                          <span>{p.name}</span>
                          {p.is_schedule_h1 ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              H1
                            </span>
                          ) : null}
                        </div>
                        {p.generic_salt && (
                          <div className="text-[10px] text-slate-500 truncate max-w-sm mt-0.5">
                            {p.generic_salt}
                          </div>
                        )}
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Code: {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="rack-chip">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {p.rack_location || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        {batches.length === 0 ? (
                          <span className="text-slate-400 text-[10px]">No Batches</span>
                        ) : (
                          <div className="space-y-0.5">
                            {batches.slice(0, 2).map((b) => (
                              <div key={b.id} className="text-[10px] text-slate-600">
                                <b>{b.batch_no}</b> (Exp: {b.expiry_date}) • {b.stock_qty} pcs
                              </div>
                            ))}
                            {batches.length > 2 && (
                              <div className="text-[10px] text-emerald-700 font-medium font-sans">
                                +{batches.length - 2} more batches
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-slate-900">
                        {totalStock} {p.strip_size > 1 ? 'strips' : 'units'}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <button
                          onClick={() => setShowAddBatchModal(p)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded border border-slate-200 shadow-2xs transition-colors"
                        >
                          + New Batch
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[95vh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-semibold text-sm text-slate-900">
                Register New Inventory Product
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-medium text-slate-700 block mb-1">
                    Product / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder="e.g. Dolo 650 Tablet"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-medium text-slate-700 block mb-1">
                    Generic Salt Composition
                  </label>
                  <input
                    type="text"
                    value={newProd.generic_salt}
                    onChange={(e) => setNewProd({ ...newProd, generic_salt: e.target.value })}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white"
                  >
                    <option value="medicine">Medicine</option>
                    <option value="general">General / FMCG</option>
                    <option value="baby_care">Baby Care</option>
                    <option value="cosmetic">Cosmetics</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Rack / Shelf Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProd.rack_location}
                    onChange={(e) => setNewProd({ ...newProd, rack_location: e.target.value })}
                    placeholder="e.g. Rack A-1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Barcode (For Scanner)
                  </label>
                  <input
                    type="text"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    placeholder="e.g. 8901234567890"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Tablets per Strip
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.strip_size}
                    onChange={(e) => setNewProd({ ...newProd, strip_size: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="h1_checkbox"
                    checked={newProd.is_schedule_h1}
                    onChange={(e) => setNewProd({ ...newProd, is_schedule_h1: e.target.checked })}
                    className="w-3.5 h-3.5 text-rose-600 rounded"
                  />
                  <label htmlFor="h1_checkbox" className="font-medium text-rose-700">
                    Schedule H1 Prescription Flag
                  </label>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.min_stock_alert}
                    onChange={(e) => setNewProd({ ...newProd, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono focus:bg-white"
                  />
                </div>
              </div>

              {/* Initial Batch */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 font-mono">
                <div className="text-[10px] font-semibold text-slate-500 uppercase font-sans">
                  Opening Batch Receipt (Optional)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Batch No</label>
                    <input
                      type="text"
                      placeholder="e.g. DL5021"
                      value={newProd.batch_no}
                      onChange={(e) => setNewProd({ ...newProd, batch_no: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="e.g. 12/27"
                      value={newProd.expiry_date}
                      onChange={(e) => setNewProd({ ...newProd, expiry_date: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Quantity</label>
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={newProd.stock_qty}
                      onChange={(e) => setNewProd({ ...newProd, stock_qty: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">PTR (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 24.50"
                      value={newProd.purchase_rate}
                      onChange={(e) => setNewProd({ ...newProd, purchase_rate: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 34.00"
                      value={newProd.mrp}
                      onChange={(e) => setNewProd({ ...newProd, mrp: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2.5">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  New Batch Receipt
                </h3>
                <span className="text-xs text-slate-500 font-sans block mt-0.5">
                  {showAddBatchModal.name}
                </span>
              </div>
              <button
                onClick={() => setShowAddBatchModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 font-mono text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-0.5 font-sans">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AG9921"
                  value={newBatch.batch_no}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-0.5 font-sans">Expiry Date (MM/YY) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11/27"
                  value={newBatch.expiry_date}
                  onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 font-sans">
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 20"
                    value={newBatch.stock_qty}
                    onChange={(e) => setNewBatch({ ...newBatch, stock_qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-0.5">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 204.50"
                    value={newBatch.mrp}
                    onChange={(e) => setNewBatch({ ...newBatch, mrp: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div className="font-sans">
                <label className="font-medium text-slate-700 block mb-0.5">Purchase Rate (PTR)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 145.00"
                  value={newBatch.purchase_rate}
                  onChange={(e) => setNewBatch({ ...newBatch, purchase_rate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t font-sans">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-xs"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
