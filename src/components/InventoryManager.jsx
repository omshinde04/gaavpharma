import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Barcode,
  Tag,
  AlertCircle,
  PackageCheck,
  Calendar,
  Layers,
  CheckCircle2,
  Edit2
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
    // Opening batch
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
      alert('Product name is required!');
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
      alert('Batch No, Expiry Date, and MRP are required!');
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
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              📦 Master Inventory & Stock Catalog
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical medicines, salts, rack allocations, and general FMCG goods.
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
          className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
        {/* Main Category Tabs */}
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('medicine')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'medicine'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>💊 Prescription & OTC Medicines</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🛒 FMCG, Baby Care & Cosmetics</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${activeTab === 'medicine' ? 'medicines or salts' : 'FMCG or barcodes'}...`}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Products Table Container */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-bold">
                <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                <th className="py-2.5 px-3.5 min-w-[220px]">Item Name & Formulation</th>
                <th className="py-2.5 px-3.5 w-32">Rack Location</th>
                <th className="py-2.5 px-3.5 w-28">Category</th>
                <th className="py-2.5 px-3.5 w-44">Active Batches & Expiry</th>
                <th className="py-2.5 px-3.5 w-24 text-right">Total Stock</th>
                <th className="py-2.5 px-3.5 w-24 text-right">Stock Alert</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-sans">
                    No items found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const totalStock = p.total_stock || 0;
                  const isLow = totalStock <= (p.min_stock_alert || 5);
                  const batches = p.batches || [];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{p.name}</span>
                          {p.is_schedule_h1 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 border border-red-300">
                              H1
                            </span>
                          ) : null}
                        </div>
                        {p.generic_salt && (
                          <div className="text-[11px] text-slate-500 truncate max-w-sm">
                            {p.generic_salt}
                          </div>
                        )}
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Barcode: {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="rack-chip">📍 {p.rack_location || 'General'}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-sans">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        {batches.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">No Batches</span>
                        ) : (
                          <div className="space-y-1">
                            {batches.slice(0, 2).map((b) => (
                              <div key={b.id} className="text-[11px] text-slate-700">
                                <b>{b.batch_no}</b> (Exp: {b.expiry_date}) • {b.stock_qty} pcs
                              </div>
                            ))}
                            {batches.length > 2 && (
                              <div className="text-[10px] text-emerald-600 font-bold">
                                +{batches.length - 2} more batches
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-sm text-slate-900">
                        {totalStock} {p.strip_size > 1 ? 'strips' : 'units'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-sans">
                        {isLow ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <button
                          onClick={() => setShowAddBatchModal(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-300 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[95vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Add New Inventory Product
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Product / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder="e.g. Dolo 650 Tablet or Dettol Soap"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Generic Salt Composition
                  </label>
                  <input
                    type="text"
                    value={newProd.generic_salt}
                    onChange={(e) => setNewProd({ ...newProd, generic_salt: e.target.value })}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="medicine">Medicine</option>
                    <option value="general">General / FMCG</option>
                    <option value="baby_care">Baby Care</option>
                    <option value="cosmetic">Cosmetics</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Rack / Shelf Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProd.rack_location}
                    onChange={(e) => setNewProd({ ...newProd, rack_location: e.target.value })}
                    placeholder="e.g. Rack A-1 or Counter 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Barcode (For FMCG Scanners)
                  </label>
                  <input
                    type="text"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    placeholder="e.g. 8901234567890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tablets per Strip (Strip Size)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.strip_size}
                    onChange={(e) => setNewProd({ ...newProd, strip_size: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="h1_checkbox"
                    checked={newProd.is_schedule_h1}
                    onChange={(e) => setNewProd({ ...newProd, is_schedule_h1: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="h1_checkbox" className="font-bold text-red-700">
                    Schedule H1 Warning Drug
                  </label>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Min Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.min_stock_alert}
                    onChange={(e) => setNewProd({ ...newProd, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Initial Batch Details */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 font-mono">
                <div className="text-[11px] font-bold text-slate-700 uppercase font-sans">
                  Opening Batch & Stock (Optional)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Batch No</label>
                    <input
                      type="text"
                      placeholder="e.g. DL5021"
                      value={newProd.batch_no}
                      onChange={(e) => setNewProd({ ...newProd, batch_no: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="e.g. 12/27"
                      value={newProd.expiry_date}
                      onChange={(e) => setNewProd({ ...newProd, expiry_date: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Stock Qty</label>
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={newProd.stock_qty}
                      onChange={(e) => setNewProd({ ...newProd, stock_qty: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Purchase Rate (PTR)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 24.50"
                      value={newProd.purchase_rate}
                      onChange={(e) => setNewProd({ ...newProd, purchase_rate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 34.00"
                      value={newProd.mrp}
                      onChange={(e) => setNewProd({ ...newProd, mrp: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Add Batch: {showAddBatchModal.name}
                </h3>
                <span className="rack-chip mt-1 inline-block">
                  📍 {showAddBatchModal.rack_location}
                </span>
              </div>
              <button
                onClick={() => setShowAddBatchModal(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 font-mono text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AG9921"
                  value={newBatch.batch_no}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expiry Date (MM/YY) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11/27"
                  value={newBatch.expiry_date}
                  onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 20"
                    value={newBatch.stock_qty}
                    onChange={(e) => setNewBatch({ ...newBatch, stock_qty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 204.50"
                    value={newBatch.mrp}
                    onChange={(e) => setNewBatch({ ...newBatch, mrp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purchase Rate (PTR)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 145.00"
                  value={newBatch.purchase_rate}
                  onChange={(e) => setNewBatch({ ...newBatch, purchase_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm font-sans"
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
