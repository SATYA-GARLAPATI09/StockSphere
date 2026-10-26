import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatNumber, getStockStatus } from '../utils/formatters';

const ProductsPage = () => {
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    primarySupplier: '',
    defaultWarehouse: '',
    unitCost: '',
    sellingPrice: '',
    quantityOnHand: 0,
    reorderThreshold: 10
  });

  const fetchFilters = async () => {
    try {
      const [catsRes, suppsRes, whsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers'),
        api.get('/warehouses')
      ]);
      setCategories(catsRes.data || []);
      setSuppliers(suppsRes.data || []);
      setWarehouses(whsRes.data || []);
    } catch (err) {
      console.warn('Failed loading auxiliary filters:', err.message);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
        category: categoryFilter || undefined,
        stockStatus: stockStatusFilter || undefined
      };
      const res = await api.get('/products', { params });
      setProducts(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch product catalog');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, categoryFilter, stockStatusFilter]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: categories[0]?._id || '',
      primarySupplier: suppliers[0]?._id || '',
      defaultWarehouse: warehouses[0]?._id || '',
      unitCost: '',
      sellingPrice: '',
      quantityOnHand: 10,
      reorderThreshold: 10
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      category: prod.category?._id || prod.category,
      primarySupplier: prod.primarySupplier?._id || prod.primarySupplier,
      defaultWarehouse: prod.defaultWarehouse?._id || prod.defaultWarehouse,
      unitCost: prod.unitCost,
      sellingPrice: prod.sellingPrice,
      reorderThreshold: prod.reorderThreshold
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct._id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive product "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to archive product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Products Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage inventory items with unique SKU validation, category taxonomies, and graph links
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            placeholder="Search by SKU or product name..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Pills */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
            {['', 'HEALTHY', 'LOW', 'OUT'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStockStatusFilter(status);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  stockStatusFilter === status
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === '' ? 'All Stock' : status === 'LOW' ? 'Low Stock' : status === 'OUT' ? 'Out of Stock' : 'Healthy'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No products match your search or filter</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the category filter or clearing the search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">SKU & Product Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Primary Supplier</th>
                  <th className="px-4 py-3.5">Stock on Hand</th>
                  <th className="px-4 py-3.5">Unit Cost</th>
                  <th className="px-4 py-3.5">Selling Price</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((prod) => {
                  const status = getStockStatus(prod.quantityOnHand, prod.reorderThreshold);
                  return (
                    <tr key={prod._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-white">{prod.name}</p>
                        <p className="font-mono text-[10px] text-emerald-400">{prod.sku}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                          {prod.category?.code || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <p className="truncate max-w-[140px]">{prod.primarySupplier?.name || 'Unassigned'}</p>
                        <p className="text-[10px] text-slate-500">{prod.primarySupplier?.leadTimeDays || 5}d lead</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">{prod.quantityOnHand}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${status.bg}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">{formatCurrency(prod.unitCost)}</td>
                      <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">{formatCurrency(prod.sellingPrice)}</td>
                      <td className="px-4 py-3.5 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(prod._id, prod.name)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Archive product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
          <span>
            Showing {products.length} of {pagination.total} catalog items
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Catalog Product' : 'Add New Inventory Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                SKU (Unique)
              </label>
              <input
                type="text"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. MCU-ESP32-S3"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none uppercase font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ESP32-S3 Microcontroller"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specifications and usage notes..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Primary Supplier
              </label>
              <select
                required
                value={formData.primarySupplier}
                onChange={(e) => setFormData({ ...formData, primarySupplier: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.leadTimeDays}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Default Warehouse
              </label>
              <select
                required
                value={formData.defaultWarehouse}
                onChange={(e) => setFormData({ ...formData, defaultWarehouse: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Unit Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderThreshold}
                onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {!editingProduct && (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantityOnHand}
                onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
