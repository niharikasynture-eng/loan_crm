'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { 
  Package, Plus, Search, Filter, RefreshCw, AlertTriangle, 
  CheckCircle2, XCircle, IndianRupee, Layers, Edit3, Trash2, 
  X, Loader2, Minus, ArrowUpDown, ChevronRight, Boxes
} from 'lucide-react';

export interface IProductItem {
  _id: string;
  name?: string;
  sku?: string;
  category?: string;
  stockQuantity: number;
  availableQuantity?: number;
  minStockAlert?: number;
  price?: number;
  unit?: string;
  description?: string;
  status: string;
  flat_number?: string;
  createdAt: string;
  updatedAt?: string;
}

interface InventoryMetrics {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValuation: number;
}

export default function InventoryPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<IProductItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuation: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<IProductItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    stockQuantity: 10,
    price: 0,
    minStockAlert: 5,
    unit: 'units',
    description: '',
  });

  const canManage = currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'manager' || currentUser?.role === 'sales_agent';

  async function loadInventory() {
    try {
      setRefreshing(true);
      const res = await api.get<{ inventory: IProductItem[]; metrics?: InventoryMetrics }>('/inventory');
      setProducts(res.inventory || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  // Unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const pName = item.name || item.flat_number || '';
      const pSku = item.sku || '';
      const pCat = item.category || 'General';

      const matchesSearch =
        !searchQuery ||
        pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pCat.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || pCat === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'Available' && item.stockQuantity > (item.minStockAlert || 5)) ||
        (selectedStatus === 'Low Stock' && item.stockQuantity > 0 && item.stockQuantity <= (item.minStockAlert || 5)) ||
        (selectedStatus === 'Out of Stock' && item.stockQuantity <= 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus]);

  function handleOpenCreate() {
    setEditingProduct(null);
    setForm({
      name: '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      category: 'General',
      stockQuantity: 10,
      price: 1500,
      minStockAlert: 5,
      unit: 'units',
      description: '',
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(product: IProductItem) {
    setEditingProduct(product);
    setForm({
      name: product.name || product.flat_number || '',
      sku: product.sku || '',
      category: product.category || 'General',
      stockQuantity: product.stockQuantity || 0,
      price: product.price || 0,
      minStockAlert: product.minStockAlert || 5,
      unit: product.unit || 'units',
      description: product.description || '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return alert('Product name is required');
    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.patch(`/inventory/${editingProduct._id}`, form);
      } else {
        await api.post('/inventory', form);
      }
      setIsModalOpen(false);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Quick single-click stock delta adjustment
  async function handleQuickAdjust(id: string, delta: number) {
    try {
      setAdjustingId(id);
      await api.patch(`/inventory/${id}`, { deltaQuantity: delta });
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => {
          if (p._id !== id) return p;
          const newQty = Math.max(0, (p.stockQuantity || 0) + delta);
          const minAlert = p.minStockAlert || 5;
          const newStatus = newQty === 0 ? 'Out of Stock' : newQty <= minAlert ? 'Low Stock' : 'Available';
          return { ...p, stockQuantity: newQty, availableQuantity: newQty, status: newStatus };
        })
      );
      loadInventory();
    } catch (err: any) {
      console.error('Quick adjust failed:', err);
    } finally {
      setAdjustingId(null);
    }
  }

  async function handleDelete(id: string, name?: string) {
    if (!confirm(`Are you sure you want to delete "${name || 'this product'}" from inventory?`)) return;
    try {
      await api.delete(`/inventory/${id}`);
      loadInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <Boxes size={18} />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Products & Inventory</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Store and manage company products, monitor stock quantities, and verify inventory availability for won leads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadInventory}
            disabled={refreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-60"
            title="Refresh inventory"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Products</span>
            <span className="text-xl font-black text-slate-900">{metrics.totalProducts || products.length}</span>
          </div>
        </div>

        {/* Total In-Stock Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">In-Stock Units</span>
            <span className="text-xl font-black text-emerald-600">{metrics.totalStock.toLocaleString()}</span>
          </div>
        </div>

        {/* Low / Out of Stock Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Low / Out of Stock</span>
            <span className="text-xl font-black text-amber-600">
              {metrics.lowStockCount + metrics.outOfStockCount}
              <span className="text-xs font-semibold text-slate-400 ml-1">
                ({metrics.outOfStockCount} critical)
              </span>
            </span>
          </div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Inventory Value</span>
            <span className="text-xl font-black text-purple-700">₹{(metrics.totalValuation || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="Available">✓ In Stock</option>
              <option value="Low Stock">⚠ Low Stock</option>
              <option value="Out of Stock">✗ Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span>Loading product inventory...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-300">
              <Package size={24} />
            </div>
            <p className="font-bold text-slate-600 text-sm">No products found in inventory</p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              {searchQuery ? 'Try clearing your search filters.' : 'Add your company products to start tracking inventory and availability for won leads.'}
            </p>
            {canManage && !searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">In-Stock Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const pName = p.name || p.flat_number || 'Unnamed Product';
                  const stock = p.stockQuantity || 0;
                  const minAlert = p.minStockAlert || 5;
                  const isLow = stock > 0 && stock <= minAlert;
                  const isOut = stock <= 0;
                  const isAdjusting = adjustingId === p._id;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                            isOut ? 'bg-rose-50 text-rose-600 border border-rose-100' : isLow ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            <Package size={16} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block text-xs group-hover:text-indigo-600 transition-colors">
                              {pName}
                            </span>
                            {p.description && (
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {p.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {p.sku || '—'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Stock Quantity with Quick Adjust Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                          {canManage && (
                            <button
                              type="button"
                              disabled={isAdjusting || stock <= 0}
                              onClick={() => handleQuickAdjust(p._id, -1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                              title="Deduct 1 unit"
                            >
                              <Minus size={11} />
                            </button>
                          )}

                          <span className={`px-2 font-mono font-black text-xs min-w-[32px] ${
                            isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                            {stock}
                          </span>

                          {canManage && (
                            <button
                              type="button"
                              disabled={isAdjusting}
                              onClick={() => handleQuickAdjust(p._id, 1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                              title="Add 1 unit"
                            >
                              <Plus size={11} />
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{p.unit || 'units'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                            <XCircle size={11} /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                            <AlertTriangle size={11} /> Low Stock (≤{minAlert})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        ₹{(p.price || 0).toLocaleString()}
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                        ₹{((p.price || 0) * stock).toLocaleString()}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit product"
                            >
                              <Edit3 size={14} />
                            </button>
                            {(currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin') && (
                              <button
                                onClick={() => handleDelete(p._id, pName)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete product"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center">
                  <Package size={16} className="text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {editingProduct ? 'Edit Company Product' : 'Add New Company Product'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Enter product details and initial stock for company inventory.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Solution Package A / Smart Controller"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-1049"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Hardware, Software, Services"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Stock Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={form.minStockAlert}
                    onChange={(e) => setForm({ ...form, minStockAlert: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Unit & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500"
                  >
                    <option value="units">units</option>
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="boxes">boxes</option>
                    <option value="licenses">licenses</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="Product specification, warranty, warehouse rack..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
