import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import {
  Boxes,
  CircleDollarSign,
  AlertTriangle,
  XCircle,
  Truck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Running MongoDB Aggregation Pipelines...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-400">
        <p className="text-sm">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Retry Pipeline
        </button>
      </div>
    );
  }

  const { summary, categoryDistribution, movementSummary, recentMovements, urgentReplenishment } = data;

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Operations Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time catalog metrics calculated via native MongoDB <code className="text-emerald-400">$facet</code> aggregation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/intelligence"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch Graph Restocking</span>
          </Link>
          <button
            onClick={fetchDashboard}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-all"
            title="Refresh Aggregations"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Valuation"
          value={formatCurrency(summary.totalInventoryValuation)}
          subtitle="At acquisition cost"
          icon={CircleDollarSign}
          color="emerald"
        />
        <StatCard
          title="Total Stock Units"
          value={formatNumber(summary.totalStockUnits)}
          subtitle={`${summary.totalProducts} distinct catalog SKUs`}
          icon={Boxes}
          color="sky"
        />
        <StatCard
          title="Low Stock Alerts"
          value={summary.lowStockCount}
          subtitle="At or below reorder threshold"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Out of Stock"
          value={summary.outOfStockCount}
          subtitle="Immediate restock required"
          icon={XCircle}
          color="rose"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category Valuation Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Inventory Valuation by Category</h3>
              <p className="text-xs text-slate-400">MongoDB $group & $lookup aggregation pipeline</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="code" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)', radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-emerald-400 mt-1 font-mono font-semibold">Value: {formatCurrency(item.totalValue)}</p>
                          <p className="text-slate-400 font-mono">Total Units: {formatNumber(item.totalUnits)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalValue" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 30-Day Movement Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white">30-Day Movement Volume</h3>
          <p className="text-xs text-slate-400 mb-4">Aggregated transactions by movement type</p>
          <div className="h-64 w-full flex items-center justify-center">
            {movementSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={movementSummary}
                    dataKey="totalUnits"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {movementSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 shadow-xl text-xs">
                            <p className="font-bold text-white">{item._id}</p>
                            <p className="text-emerald-400 font-mono">Units: {item.totalUnits}</p>
                            <p className="text-slate-400">Transactions: {item.transactionCount}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No stock movements recorded in last 30 days</p>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Replenishment & Recent Ledger Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Replenishment Candidates */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Urgent Replenishment Candidates</span>
              </h3>
              <p className="text-xs text-slate-400">Products requiring graph reorder evaluation</p>
            </div>
            <Link
              to="/intelligence"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore Graph</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {urgentReplenishment.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 hover:border-slate-700 transition-all"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{item.name}</p>
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">{item.sku}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {item.quantityOnHand} / {item.reorderThreshold}
                    </span>
                    <Badge variant={item.quantityOnHand === 0 ? 'danger' : 'warning'} size="xs">
                      {item.quantityOnHand === 0 ? 'OUT' : 'LOW'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Shortage: -{item.shortage} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Ledger */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Stock Movements</h3>
              <p className="text-xs text-slate-400">Forensic audit ledger snapshot</p>
            </div>
            <Link
              to="/stock"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentMovements.map((move) => {
              const isStockIn = move.movementType === 'STOCK_IN';
              return (
                <div
                  key={move._id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{move.product?.name || 'Product'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                      <span>{formatDate(move.timestamp)}</span>
                      <span>•</span>
                      <span>By: {move.user?.name?.split(' ')[0] || 'System'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isStockIn ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isStockIn ? `+${move.quantity}` : `-${move.quantity}`}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Bal: {move.newQuantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
