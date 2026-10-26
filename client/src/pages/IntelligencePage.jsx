import React, { useState, useEffect } from 'react';
import api from '../api/client';
import SupplyChainGraph from '../components/graph/SupplyChainGraph';
import Badge from '../components/common/Badge';
import {
  Sparkles,
  Network,
  Truck,
  Layers,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Clock,
  Info,
  CheckCircle,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const IntelligencePage = () => {
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'graph'
  const [recommendations, setRecommendations] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    setError('');
    try {
      const [recRes, graphRes] = await Promise.all([
        api.get('/intelligence/restock-recommendations'),
        api.get('/intelligence/graph')
      ]);
      setRecommendations(recRes.data || []);
      setGraphData(graphRes.data || { nodes: [], edges: [] });
    } catch (err) {
      setError(err.message || 'Failed to query graph intelligence engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  const handleQuickReorder = async (rec) => {
    try {
      const supplierId = rec.primarySupplier?.supplierId;
      const warehouseId = rec.defaultWarehouse?._id || rec.defaultWarehouse;

      if (!supplierId || !warehouseId) {
        alert('Missing default supplier or warehouse reference for this SKU');
        return;
      }

      await api.post('/purchase-orders', {
        supplier: supplierId,
        warehouse: warehouseId,
        items: [
          {
            productId: rec.productId,
            sku: rec.sku,
            name: rec.name,
            orderedQuantity: rec.proposedReorderQuantity,
            unitCost: rec.unitCost
          }
        ],
        notes: `Auto-generated via Graph Restocking Engine (${rec.recommendationReason})`
      });

      alert(`Purchase Order for ${rec.proposedReorderQuantity} units of ${rec.name} generated successfully! View under Purchase Orders.`);
    } catch (err) {
      alert(err.message || 'Failed to generate order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-purple-950/70 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Neo4j Graph-Powered Decision Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Inventory Intelligence & Smart Restocking
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
              Detects depleted catalog inventory, executes Cypher multi-hop traversals to discover faster alternative suppliers, and proposes substitute products within shared category taxonomies.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Restock Cards ({recommendations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="h-4 w-4" />
              <span>Interactive Graph View</span>
            </button>
          </div>
        </div>

        {/* Deterministic Restock Formula Explanation Card */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-200">Reorder Formulation:</span>
          </div>
          <code className="rounded bg-slate-900 px-2 py-1 font-mono text-emerald-400 border border-slate-800 text-[11px]">
            Proposed Reorder Qty = (Reorder Threshold × 2) − Quantity on Hand
          </code>
          <span className="text-[11px] text-slate-400">
            • Traverses Neo4j for lowest lead-time suppliers and in-stock category substitutes
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 text-emerald-400">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Executing Cypher Graph Path Traversal...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
      ) : activeTab === 'recommendations' ? (
        /* RECOMMENDATION CARDS VIEW */
        <div className="space-y-5">
          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-white">All Inventory Stocks Are Healthy</p>
              <p className="text-xs text-slate-500 mt-1">No products are currently at or below reorder threshold</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {recommendations.map((rec) => {
                const isOutOfStock = rec.currentQuantity === 0;
                return (
                  <div
                    key={rec.productId}
                    className={`rounded-2xl border p-5 shadow-xl backdrop-blur-md transition-all ${
                      isOutOfStock
                        ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-slate-900/60'
                        : 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/80 to-slate-900/60'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Badge variant={isOutOfStock ? 'danger' : 'warning'} size="sm">
                            {isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK ALERT'}
                          </Badge>
                          <span className="font-mono text-xs text-emerald-400 font-semibold">{rec.sku}</span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                            {rec.category?.name || 'Category'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1.5">{rec.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                          {rec.recommendationReason}
                        </p>
                      </div>

                      {/* Math Summary Badge */}
                      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 self-start">
                        <div className="text-center px-2">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">Current</p>
                          <p className={`font-mono text-base font-bold ${isOutOfStock ? 'text-rose-400' : 'text-amber-400'}`}>
                            {rec.currentQuantity}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-800" />
                        <div className="text-center px-2">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">Threshold</p>
                          <p className="font-mono text-base font-bold text-slate-300">
                            {rec.reorderThreshold}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-slate-800" />
                        <div className="text-center px-2">
                          <p className="text-[10px] text-emerald-500 font-semibold uppercase">Proposed Order</p>
                          <p className="font-mono text-base font-bold text-emerald-400">
                            +{rec.proposedReorderQuantity} units
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dual Discovery: Suppliers & Category Substitutes */}
                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 border-t border-slate-800/80 pt-4">
                      {/* Left Column: Supplier Graph Paths */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                            Graph-Ranked Suppliers for SKU
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {/* Primary Supplier */}
                          {rec.primarySupplier && (
                            <div className="flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-2.5 text-xs">
                              <div>
                                <span className="font-semibold text-white">{rec.primarySupplier.supplierName}</span>
                                <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300">
                                  PRIMARY
                                </span>
                              </div>
                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-indigo-300 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {rec.primarySupplier.leadTimeDays}d lead
                                </span>
                                <span className="text-white font-bold">{formatCurrency(rec.unitCost)}</span>
                              </div>
                            </div>
                          )}

                          {/* Alternative Suppliers */}
                          {rec.alternativeSuppliers?.length > 0 ? (
                            rec.alternativeSuppliers.map((alt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-200">{alt.supplierName}</span>
                                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                                    ALTERNATIVE
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 font-mono">
                                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                    <Clock className="h-3 w-3" />
                                    {alt.leadTimeDays}d lead
                                  </span>
                                  <span className="text-slate-300">{formatCurrency(alt.unitCost)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-500 italic pl-1">
                              No secondary alternative supplier registered for this exact SKU.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Category Substitutes */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                            Category Substitutes (Healthy Stock)
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {rec.categorySubstitutes?.length > 0 ? (
                            rec.categorySubstitutes.map((sub, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-white">{sub.name}</span>
                                  <span className="block font-mono text-[10px] text-amber-400/80">{sub.sku}</span>
                                </div>
                                <div className="flex items-center gap-3 font-mono">
                                  <span className="text-emerald-400 font-bold">
                                    {sub.availableStock} in stock
                                  </span>
                                  <span className="text-slate-300">{formatCurrency(sub.unitCost)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-500 italic pl-1">
                              No alternate products found in this category with surplus stock.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
                      <div className="text-xs text-slate-400 font-mono">
                        Estimated Restock Outlay: <strong className="text-emerald-400 text-sm">{formatCurrency(rec.estimatedTotalCost)}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProductId(rec.productId);
                            setActiveTab('graph');
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                        >
                          <Network className="h-3.5 w-3.5 text-purple-400" />
                          <span>View in Graph</span>
                        </button>

                        <button
                          onClick={() => handleQuickReorder(rec)}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400 transition-all"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span>1-Click Generate PO Draft</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* INTERACTIVE GRAPH CANVAS VIEW */
        <div className="w-full">
          <SupplyChainGraph
            initialNodes={graphData.nodes}
            initialEdges={graphData.edges}
            selectedProductId={selectedProductId}
            onQuickReorder={(nodeData) => {
              const matchedRec = recommendations.find(r => r.sku === nodeData.sku);
              if (matchedRec) {
                handleQuickReorder(matchedRec);
              } else {
                alert(`Product ${nodeData.label} is currently in healthy stock.`);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default IntelligencePage;
