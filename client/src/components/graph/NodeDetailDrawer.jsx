import React from 'react';
import {
  X,
  Package,
  Truck,
  Layers,
  Building2,
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const NodeDetailDrawer = ({ node, onClose, onQuickReorder }) => {
  if (!node) return null;

  const { data } = node;
  const isProduct = data.type === 'Product';
  const isSupplier = data.type === 'Supplier';
  const isCategory = data.type === 'Category';
  const isWarehouse = data.type === 'Warehouse';

  const isCritical = data.isOutOfStock;
  const isLow = data.isLowStock;
  const targetBuffer = (data.reorderThreshold || 10) * 2;
  const shortage = Math.max(0, targetBuffer - (data.quantityOnHand || 0));

  return (
    <div className="absolute top-4 right-4 z-30 w-96 max-h-[calc(100%-2rem)] overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`rounded-xl p-2 ${
              isProduct
                ? isCritical
                  ? 'bg-rose-500/20 text-rose-400'
                  : isLow
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
                : isSupplier
                ? 'bg-indigo-500/20 text-indigo-400'
                : isCategory
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-pink-500/20 text-pink-400'
            }`}
          >
            {isProduct && <Package className="h-5 w-5" />}
            {isSupplier && <Truck className="h-5 w-5" />}
            {isCategory && <Layers className="h-5 w-5" />}
            {isWarehouse && <Building2 className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Neo4j Node Inspector • {data.type}
            </span>
            <h4 className="text-sm font-bold text-white line-clamp-1">{data.label}</h4>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Close Inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* ================= PRODUCT DETAILS ================= */}
        {isProduct && (
          <>
            {/* Stock Health Card */}
            <div
              className={`rounded-2xl border p-4 backdrop-blur-md ${
                isCritical
                  ? 'border-rose-500/40 bg-rose-950/20'
                  : isLow
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : 'border-emerald-500/30 bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Inventory Health
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : isLow
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isCritical ? 'Stockout (0 Qty)' : isLow ? 'Low Stock Alert' : 'Healthy Buffer'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800/80">
                  <p className="text-[10px] text-slate-400">Current</p>
                  <p className={`font-mono text-base font-bold ${isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {data.quantityOnHand}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800/80">
                  <p className="text-[10px] text-slate-400">Threshold</p>
                  <p className="font-mono text-base font-bold text-slate-200">
                    {data.reorderThreshold}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800/80">
                  <p className="text-[10px] text-slate-400">Safe Target</p>
                  <p className="font-mono text-base font-bold text-emerald-400">
                    {targetBuffer}
                  </p>
                </div>
              </div>

              {(isCritical || isLow) && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    Buffer Shortfall:
                  </span>
                  <span className="font-mono font-bold text-rose-400">+{shortage} units required</span>
                </div>
              )}
            </div>

            {/* Catalog & Financial Meta */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">SKU:</span>
                <span className="font-mono font-semibold text-emerald-400">{data.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200 font-medium">{data.categoryName || 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Acquisition Cost:</span>
                <span className="font-mono font-semibold text-white">{formatCurrency(data.unitCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Holding Valuation:</span>
                <span className="font-mono font-semibold text-slate-300">
                  {formatCurrency((data.quantityOnHand || 0) * (data.unitCost || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stored At:</span>
                <span className="text-pink-300 font-medium">{data.warehouseName || 'Alpha Warehouse'}</span>
              </div>
            </div>

            {/* Multi-Supplier Graph Discovery */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-3.5 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 text-[11px]">
                  <Truck className="h-3.5 w-3.5 text-indigo-400" />
                  Primary Supplier
                </span>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[9px] font-mono text-indigo-300 font-bold">
                  CONTRACTED
                </span>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-2.5 border border-indigo-900/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{data.primarySupplierName || 'Apex Micro Devices'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Lead Time: {data.primarySupplierLeadTime || 3} Days</p>
                </div>
                <span className="text-indigo-400 font-mono font-bold text-xs">
                  {data.primarySupplierLeadTime || 3}d delivery
                </span>
              </div>

              {/* Alternative Suppliers list if any */}
              {data.alternativeSuppliers?.length > 0 && (
                <div className="pt-2 border-t border-indigo-900/50 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 text-[10px]">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Alternative Suppliers (Neo4j Discovery)
                  </span>
                  {data.alternativeSuppliers.map((alt, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-slate-950/60 p-2 border border-amber-500/30 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{alt.supplierName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Est Cost: {formatCurrency(alt.unitCost || data.unitCost)}</p>
                      </div>
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-amber-300 font-bold text-[10px]">
                        {alt.leadTimeDays}d lead
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {(isCritical || isLow) && onQuickReorder && (
              <button
                onClick={() => onQuickReorder(data)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400 transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>1-Click Reorder Draft ({shortage} units)</span>
              </button>
            )}
          </>
        )}

        {/* ================= SUPPLIER DETAILS ================= */}
        {isSupplier && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Code:</span>
                <span className="font-mono font-bold text-indigo-300">{data.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Average Lead Time:</span>
                <span className="font-mono font-bold text-white flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  {data.leadTime} Days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vendor Status:</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-bold">
                  {data.status || 'ACTIVE'}
                </span>
              </div>
              {data.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone:</span>
                  <span className="font-mono text-slate-300">{data.phone}</span>
                </div>
              )}
              {data.email && (
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Mail className="h-3 w-3" /> Email:</span>
                  <span className="font-mono text-slate-300">{data.email}</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
              <h5 className="font-bold text-white mb-2">Connected Supply Lines</h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Contracted to supply <strong className="text-indigo-300">{data.suppliedCount || 0} catalog products</strong>. Supplies flow directly to corresponding product nodes in the center canvas.
              </p>
            </div>
          </div>
        )}

        {/* ================= CATEGORY DETAILS ================= */}
        {isCategory && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Category Code:</span>
                <span className="font-mono font-bold text-amber-300">{data.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Products:</span>
                <span className="font-mono font-bold text-white">{data.productCount || 0} SKUs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category Asset Value:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(data.totalValuation || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restock Urgency:</span>
                <span className={`font-mono font-bold ${data.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {data.lowStockCount || 0} Alerts Pending
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
              <h5 className="font-bold text-white mb-2">Substitutability Engine</h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Products sharing this category taxonomy serve as automated drop-in alternatives during supply chain bottlenecks.
              </p>
            </div>
          </div>
        )}

        {/* ================= WAREHOUSE DETAILS ================= */}
        {isWarehouse && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-pink-500/30 bg-pink-950/20 p-4 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Facility Code:</span>
                <span className="font-mono font-bold text-pink-300">{data.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Physical Location:</span>
                <span className="text-slate-200 text-right max-w-[180px] truncate">{data.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Storage Capacity:</span>
                <span className="font-mono font-bold text-white">{formatNumber(data.capacity || 0)} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currently Stored SKUs:</span>
                <span className="font-mono font-bold text-pink-400">{data.storedCount || 0} Distinct SKUs</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
              <h5 className="font-bold text-white mb-2">Terminal Storage Hub</h5>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Target storage destination where fulfilled purchase orders are received and inspected before laboratory allocation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailDrawer;
