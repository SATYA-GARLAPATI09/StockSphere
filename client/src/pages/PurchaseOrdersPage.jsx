import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import {
  FileSpreadsheet,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

const PurchaseOrdersPage = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New PO Form
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { productId: '', sku: '', name: '', orderedQuantity: 10, unitCost: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAuxData = async () => {
    try {
      const [suppsRes, whsRes, prodsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/warehouses'),
        api.get('/products?limit=100')
      ]);
      setSuppliers(suppsRes.data || []);
      setWarehouses(whsRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      console.warn('Failed loading auxiliary data:', err.message);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await api.get('/purchase-orders', { params });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setSupplierId(suppliers[0]?._id || '');
    setWarehouseId(warehouses[0]?._id || '');
    setNotes('');
    const firstProd = products[0];
    setItems([
      {
        productId: firstProd?._id || '',
        sku: firstProd?.sku || '',
        name: firstProd?.name || '',
        orderedQuantity: 15,
        unitCost: firstProd?.unitCost || 100
      }
    ]);
    setIsModalOpen(true);
  };

  const handleProductSelect = (index, prodId) => {
    const prod = products.find(p => p._id === prodId);
    if (!prod) return;
    const newItems = [...items];
    newItems[index] = {
      productId: prod._id,
      sku: prod.sku,
      name: prod.name,
      orderedQuantity: newItems[index].orderedQuantity || 10,
      unitCost: prod.unitCost
    };
    setItems(newItems);
  };

  const handleAddItem = () => {
    const prod = products[0];
    setItems([
      ...items,
      {
        productId: prod?._id || '',
        sku: prod?.sku || '',
        name: prod?.name || '',
        orderedQuantity: 10,
        unitCost: prod?.unitCost || 0
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.orderedQuantity * item.unitCost), 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/purchase-orders', {
        supplier: supplierId,
        warehouse: warehouseId,
        items,
        notes
      });
      setIsModalOpen(false);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransitionStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/purchase-orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleReceiveShipment = async (orderId, orderNumber) => {
    if (!window.confirm(`Confirm receipt for ${orderNumber}? This will atomically update stock in inventory and record an audit trail.`)) return;

    try {
      const res = await api.post(`/purchase-orders/${orderId}/receive`);
      alert(res.message || 'Shipment received and inventory updated!');
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to process shipment receipt');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="default" size="xs">DRAFT</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info" size="xs">SUBMITTED</Badge>;
      case 'RECEIVED':
        return <Badge variant="success" size="xs">RECEIVED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" size="xs">CANCELLED</Badge>;
      default:
        return <Badge variant="default" size="xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Purchase Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Procurement lifecycle: Draft → Submitted → Received (Atomically credits inventory)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
          {['', 'DRAFT', 'SUBMITTED', 'RECEIVED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === '' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchOrders}
          className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
          title="Refresh Orders"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Order Cards List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No purchase orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((po) => (
            <div
              key={po._id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg transition-all hover:border-slate-700"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-sm font-bold text-white">{po.orderNumber}</h3>
                    {getStatusBadge(po.status)}
                    <span className="text-xs text-slate-400">
                      Created: {formatDate(po.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-300">
                    Vendor: <strong className="text-white">{po.supplier?.name}</strong> • Destination:{' '}
                    <span className="text-emerald-400">{po.warehouse?.name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Amount</p>
                    <p className="font-mono text-base font-bold text-emerald-400">
                      {formatCurrency(po.totalAmount)}
                    </p>
                  </div>

                  {/* State Action Buttons */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {po.status === 'DRAFT' && isAdmin && (
                      <button
                        onClick={() => handleTransitionStatus(po._id, 'SUBMITTED')}
                        className="flex items-center gap-1 rounded-xl bg-sky-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-sm"
                        title="Submit order to vendor"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit</span>
                      </button>
                    )}

                    {po.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleReceiveShipment(po._id, po.orderNumber)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
                        title="Receive shipment & credit inventory"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Receive Order</span>
                      </button>
                    )}

                    {(po.status === 'DRAFT' || po.status === 'SUBMITTED') && isAdmin && (
                      <button
                        onClick={() => handleTransitionStatus(po._id, 'CANCELLED')}
                        className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                        title="Cancel Order"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Table Snippet */}
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Line Items ({po.items.length})
                </p>
                <div className="grid grid-cols-1 divide-y divide-slate-800/50 text-xs">
                  {po.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5">
                      <div>
                        <span className="font-semibold text-slate-200">{item.productName}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">({item.sku})</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-slate-300">
                        <span>{item.orderedQuantity} units @ {formatCurrency(item.unitCost)}</span>
                        <span className="font-bold text-white">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Purchase Order" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Vendor / Supplier
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.leadTimeDays}d lead)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Destination Warehouse
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold uppercase tracking-wider text-slate-400">
                Order Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.orderedQuantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].orderedQuantity = Number(e.target.value);
                        setItems(newItems);
                      }}
                      placeholder="Qty"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center font-mono text-xs text-white"
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitCost}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].unitCost = Number(e.target.value);
                        setItems(newItems);
                      }}
                      placeholder="Cost"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center font-mono text-xs text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-800 pt-2 font-mono">
              <span className="text-slate-400">Total Calculated Valuation:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Procurement Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Budget authorization note, grant reference..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none"
            />
          </div>

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
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
            >
              {submitting ? 'Creating...' : 'Create Draft PO'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
