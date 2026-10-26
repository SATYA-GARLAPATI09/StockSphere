import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Package,
  Truck,
  Layers,
  Building2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export const ProductNode = memo(({ data }) => {
  const isCritical = data.isOutOfStock;
  const isLow = data.isLowStock;
  const isSelected = data.isSelected;
  const isDimmed = data.isDimmed;

  const targetSafeBuffer = (data.reorderThreshold || 10) * 2;
  const stockPercentage = Math.min(100, Math.round(((data.quantityOnHand || 0) / targetSafeBuffer) * 100));

  return (
    <div
      className={`relative min-w-[240px] max-w-[260px] rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isDimmed
          ? 'opacity-20 scale-95'
          : isSelected
          ? 'border-emerald-400 bg-emerald-950/90 ring-4 ring-emerald-500/30 scale-105 shadow-emerald-500/20'
          : isCritical
          ? 'border-rose-500/80 bg-slate-900/95 hover:border-rose-400 hover:shadow-rose-950/60'
          : isLow
          ? 'border-amber-500/80 bg-slate-900/95 hover:border-amber-400 hover:shadow-amber-950/60'
          : 'border-slate-800 bg-slate-900/95 hover:border-slate-700 hover:shadow-slate-950/60'
      }`}
    >
      {/* Category input handle (Top) */}
      <Handle
        type="target"
        id="cat-target"
        position={Position.Top}
        className="!bg-amber-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Connects to Category"
      />

      {/* Supplier input handle (Left) */}
      <Handle
        type="target"
        id="supp-target"
        position={Position.Left}
        className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Connects to Supplier"
      />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-xl p-2 shrink-0 ${
              isCritical
                ? 'bg-rose-500/20 text-rose-400'
                : isLow
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white tracking-tight" title={data.label}>
              {data.label}
            </p>
            <p className="font-mono text-[10px] text-slate-400">{data.sku}</p>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
            isCritical
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
              : isLow
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isCritical ? 'Stockout' : isLow ? 'Low Stock' : 'Healthy'}
        </span>
      </div>

      {/* Mini Stock Health Meter */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">OnHand / Threshold:</span>
          <span
            className={`font-bold ${
              isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {data.quantityOnHand} <span className="text-slate-500">/ {data.reorderThreshold}</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical
                ? 'bg-rose-500'
                : isLow
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(5, stockPercentage)}%` }}
          />
        </div>
      </div>

      {/* Extra supply intelligence tag */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
        <span>Unit Cost: <strong className="text-slate-200 font-mono">{formatCurrency(data.unitCost)}</strong></span>
        {data.alternativeSuppliers?.length > 0 ? (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-400 border border-amber-500/30 font-semibold">
            +{data.alternativeSuppliers.length} Alt Vendors
          </span>
        ) : (
          <span className="text-[9px] text-slate-500 font-mono">1 Vendor</span>
        )}
      </div>

      {/* Warehouse output handle (Right) */}
      <Handle
        type="source"
        id="wh-source"
        position={Position.Right}
        className="!bg-pink-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Stored In Warehouse"
      />
    </div>
  );
});

export const SupplierNode = memo(({ data }) => {
  const isDimmed = data.isDimmed;

  return (
    <div
      className={`relative min-w-[220px] max-w-[240px] rounded-2xl border border-indigo-500/40 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 ${
        isDimmed ? 'opacity-20 scale-95' : 'hover:border-indigo-400 hover:shadow-indigo-950/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-400 shrink-0">
          <Truck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-indigo-100" title={data.label}>
            {data.label}
          </p>
          <span className="inline-block rounded bg-indigo-500/20 px-1.5 py-0.2 font-mono text-[9px] text-indigo-300">
            {data.code}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
        <span className="text-slate-400 flex items-center gap-1">
          <Clock className="h-3 w-3 text-indigo-400" />
          Lead Time:
        </span>
        <span className="font-mono font-bold text-indigo-300">{data.leadTime} Days</span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>Supplies:</span>
        <span className="font-mono text-slate-300 font-semibold">{data.suppliedCount || 0} SKUs</span>
      </div>

      {/* Source handle connecting to Product target handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Supplies Products"
      />
    </div>
  );
});

export const CategoryNode = memo(({ data }) => {
  const isDimmed = data.isDimmed;

  return (
    <div
      className={`relative min-w-[210px] max-w-[240px] rounded-2xl border border-amber-500/40 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 ${
        isDimmed ? 'opacity-20 scale-95' : 'hover:border-amber-400 hover:shadow-amber-950/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400 shrink-0">
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-amber-100" title={data.label}>
            {data.label}
          </p>
          <span className="inline-block rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] text-amber-300">
            {data.code}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
        <span className="text-slate-400">Catalog SKUs:</span>
        <span className="font-mono font-bold text-amber-300">{data.productCount || 0} Items</span>
      </div>

      {data.lowStockCount > 0 && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-rose-400 font-medium">
          <span>Alerts:</span>
          <span className="font-mono font-bold">{data.lowStockCount} Need Restock</span>
        </div>
      )}

      {/* Bottom source handle connecting to Product target handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Category Taxonomy"
      />
    </div>
  );
});

export const WarehouseNode = memo(({ data }) => {
  const isDimmed = data.isDimmed;

  return (
    <div
      className={`relative min-w-[230px] max-w-[250px] rounded-2xl border border-pink-500/40 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 ${
        isDimmed ? 'opacity-20 scale-95' : 'hover:border-pink-400 hover:shadow-pink-950/60'
      }`}
    >
      {/* Target handle connecting from Product source handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-pink-400 !w-3 !h-3 !border-2 !border-slate-950 hover:!scale-125 transition-all"
        title="Stores Products"
      />

      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-pink-500/20 p-2 text-pink-400 shrink-0">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-pink-100" title={data.label}>
            {data.label}
          </p>
          <p className="truncate text-[10px] text-pink-300/70">{data.location}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
        <span className="text-slate-400">Stored Inventory:</span>
        <span className="font-mono font-bold text-pink-300">{data.storedCount || 0} SKUs</span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>Capacity:</span>
        <span className="font-mono text-slate-300">{formatNumber(data.capacity || 0)} Units</span>
      </div>
    </div>
  );
});
