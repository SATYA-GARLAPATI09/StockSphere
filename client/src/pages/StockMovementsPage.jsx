import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  Filter,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

const StockMovementsPage = () => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'IN' | 'OUT' | 'ADJUST' | null
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    quantity: 1,
    targetQuantity: 0,
    reason: '',
    referenceNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAuxData = async () => {
    try {
      const [prodsRes, whsRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/warehouses')
      ]);
      setProducts(prodsRes.data || []);
      setWarehouses(whsRes.data || []);
    } catch (err) {
      console.warn('Failed to load auxiliary entities:', err.message);
    }
  };

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        movementType: movementTypeFilter || undefined
      };
      const res = await api.get('/inventory/movements', { params });
      setMovements(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, movementTypeFilter]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleOpenModal = (type) => {
    setModalType(type);
    setFormError('');
    setFormData({
      productId: products[0]?._id || '',
      warehouseId: warehouses[0]?._id || '',
      quantity: 5,
      targetQuantity: 10,
      reason: '',
      referenceNumber: `REF-${Math.floor(1000 + Math.random() * 9000)}`
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (modalType === 'IN') {
        await api.post('/inventory/stock-in', {
          productId: formData.productId,
          warehouseId: formData.warehouseId,
          quantity: Number(formData.quantity),
          reason: formData.reason || 'Restocking shipment received',
          referenceNumber: formData.referenceNumber
        });
      } else if (modalType === 'OUT') {
        await api.post('/inventory/stock-out', {
          productId: formData.productId,
          warehouseId: formData.warehouseId,
          quantity: Number(formData.quantity),
          reason: formData.reason || 'Inventory issue or dispatch',
          referenceNumber: formData.referenceNumber
        });
      } else if (modalType === 'ADJUST') {
        await api.post('/inventory/adjust', {
          productId: formData.productId,
          warehouseId: formData.warehouseId,
          targetQuantity: Number(formData.targetQuantity),
          reason: formData.reason || 'Cycle count physical audit'
        });
      }

      setModalType(null);
      fetchMovements();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p._id === formData.productId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Stock Operations & Audit</h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute atomic inventory transactions with strict non-negative stock verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenModal('IN')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600/90 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Stock-In</span>
          </button>

          <button
            onClick={() => handleOpenModal('OUT')}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-rose-500/20 hover:bg-rose-500 transition-all"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Stock-Out</span>
          </button>

          <button
            onClick={() => handleOpenModal('ADJUST')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Reconcile / Adjust</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Immutable Audit Trail Ledger
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={movementTypeFilter}
            onChange={(e) => {
              setMovementTypeFilter(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Movement Types</option>
            <option value="STOCK_IN">Stock-In (+)</option>
            <option value="STOCK_OUT">Stock-Out (-)</option>
            <option value="ADJUSTMENT">Audit Adjustments</option>
          </select>

          <button
            onClick={fetchMovements}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No stock movements recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Product SKU & Name</th>
                  <th className="px-4 py-3.5">Warehouse</th>
                  <th className="px-4 py-3.5">Operation</th>
                  <th className="px-4 py-3.5">Quantity Delta</th>
                  <th className="px-4 py-3.5">Balance Transition</th>
                  <th className="px-4 py-3.5">Audited Reason</th>
                  <th className="px-4 py-3.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((move) => {
                  const isStockIn = move.movementType === 'STOCK_IN';
                  const isStockOut = move.movementType === 'STOCK_OUT';
                  return (
                    <tr key={move._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-400">
                        {formatDate(move.timestamp)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-white">{move.product?.name || 'Unknown Product'}</p>
                        <p className="font-mono text-[10px] text-emerald-400">{move.product?.sku || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                          {move.warehouse?.code || 'WH-DEF'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={isStockIn ? 'success' : isStockOut ? 'danger' : 'info'}
                          size="xs"
                        >
                          {move.movementType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isStockIn
                              ? 'text-emerald-400'
                              : isStockOut
                              ? 'text-rose-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {isStockIn ? `+${move.quantity}` : isStockOut ? `-${move.quantity}` : `Δ ${move.quantity}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        <span className="text-slate-500">{move.previousQuantity}</span>
                        <span className="mx-1 text-slate-600">→</span>
                        <span className="font-bold text-white">{move.newQuantity}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 max-w-xs truncate" title={move.reason}>
                        {move.reason}
                        {move.referenceNumber && (
                          <span className="block font-mono text-[10px] text-slate-500">
                            Ref: {move.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-medium">
                        {move.user?.name || 'Authorized Staff'}
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
            Showing {movements.length} of {pagination.total} audit logs
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

      {/* Stock Operation Modal */}
      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={
          modalType === 'IN'
            ? 'Execute Stock-In (Receipt)'
            : modalType === 'OUT'
            ? 'Execute Stock-Out (Issue/Dispatch)'
            : 'Stock Reconciliation (Cycle Count Adjustment)'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Product SKU
            </label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} — {p.name} (Current Stock: {p.quantityOnHand} units)
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex justify-between text-slate-400">
                <span>Available Balance on Hand:</span>
                <span className="font-mono font-bold text-white">{selectedProduct.quantityOnHand} units</span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Reorder Threshold:</span>
                <span className="font-mono text-amber-400">{selectedProduct.reorderThreshold} units</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Destination / Origin Warehouse
            </label>
            <select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {modalType !== 'ADJUST' ? (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Quantity to {modalType === 'IN' ? 'Receive' : 'Dispatch'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Audited Physical Target Quantity
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.targetQuantity}
                onChange={(e) => setFormData({ ...formData, targetQuantity: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Movement Reason
              </label>
              <input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g. Lab project allocation"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Reference Code
              </label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="e.g. DISPATCH-991"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-4 py-2 font-semibold text-white shadow-md transition-all ${
                modalType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : modalType === 'OUT'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {submitting ? 'Auditing...' : 'Confirm Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockMovementsPage;
