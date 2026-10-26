import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ProductNode, SupplierNode, CategoryNode, WarehouseNode } from './CustomNodes';
import NodeDetailDrawer from './NodeDetailDrawer';
import {
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Truck,
  Package,
  Building2,
  HelpCircle,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const SupplyChainGraph = ({
  initialNodes = [],
  initialEdges = [],
  selectedProductId = null,
  onQuickReorder = null
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ALERT' | 'PRODUCT' | 'SUPPLIER'
  const [showGuide, setShowGuide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const nodeTypes = useMemo(
    () => ({
      productNode: ProductNode,
      supplierNode: SupplierNode,
      categoryNode: CategoryNode,
      warehouseNode: WarehouseNode
    }),
    []
  );

  // Initialize and enhance edges with smooth curves, arrows, and styling
  const formattedEdges = useMemo(() => {
    return initialEdges.map((edge) => {
      const isAlt = edge.id.includes('alt') || edge.style?.strokeDasharray;
      const isSupplies = edge.label?.includes('SUPPLIES') || edge.id.includes('e_s_p');
      const isStored = edge.label?.includes('STORED') || edge.id.includes('e_p_w');
      const isBelongs = edge.label?.includes('BELONGS') || edge.id.includes('e_p_c');

      let stroke = '#64748b';
      let strokeWidth = 1.5;
      let strokeDasharray = undefined;

      if (isAlt) {
        stroke = '#eab308';
        strokeWidth = 2;
        strokeDasharray = '5,5';
      } else if (isSupplies) {
        stroke = edge.animated ? '#f59e0b' : '#6366f1';
        strokeWidth = 2;
      } else if (isStored) {
        stroke = '#ec4899';
        strokeWidth = 1.8;
      } else if (isBelongs) {
        stroke = edge.animated ? '#ef4444' : '#475569';
        strokeWidth = 1.2;
      }

      return {
        ...edge,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: stroke
        },
        style: {
          ...edge.style,
          stroke,
          strokeWidth,
          strokeDasharray
        }
      };
    });
  }, [initialEdges]);

  // Compute active focus (highlighting connected paths) and filters
  useEffect(() => {
    let activeNodes = [...initialNodes];
    let activeEdges = [...formattedEdges];

    // 1. Filter by Alert / Type
    if (filterMode === 'ALERT') {
      // Find low/out-of-stock products
      const alertProductIds = new Set(
        activeNodes
          .filter(n => n.type === 'productNode' && (n.data.isLowStock || n.data.isOutOfStock))
          .map(n => n.id)
      );

      // Find edges connected to alert products
      const relevantEdges = activeEdges.filter(
        e => alertProductIds.has(e.source) || alertProductIds.has(e.target)
      );
      const connectedNodeIds = new Set();
      alertProductIds.forEach(id => connectedNodeIds.add(id));
      relevantEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });

      activeNodes = activeNodes.filter(n => connectedNodeIds.has(n.id));
      activeEdges = relevantEdges;
    } else if (filterMode === 'PRODUCT') {
      activeNodes = activeNodes.filter(n => n.type === 'productNode');
      activeEdges = [];
    } else if (filterMode === 'SUPPLIER') {
      const suppIds = new Set(activeNodes.filter(n => n.type === 'supplierNode').map(n => n.id));
      const relevantEdges = activeEdges.filter(e => suppIds.has(e.source));
      const targetProdIds = new Set(relevantEdges.map(e => e.target));
      activeNodes = activeNodes.filter(n => suppIds.has(n.id) || targetProdIds.has(n.id));
      activeEdges = relevantEdges;
    }

    // 2. Search filtering / highlighting
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchedNodeIds = new Set();

      activeNodes.forEach(n => {
        const label = (n.data.label || '').toLowerCase();
        const sku = (n.data.sku || '').toLowerCase();
        const code = (n.data.code || '').toLowerCase();
        if (label.includes(term) || sku.includes(term) || code.includes(term)) {
          matchedNodeIds.add(n.id);
        }
      });

      activeNodes = activeNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: matchedNodeIds.has(n.id),
          isDimmed: matchedNodeIds.size > 0 && !matchedNodeIds.has(n.id)
        }
      }));
    } else if (selectedNode) {
      // 3. Path Highlighting: Highlight selected node and its direct neighbors
      const connectedEdges = activeEdges.filter(
        e => e.source === selectedNode.id || e.target === selectedNode.id
      );
      const connectedNodeIds = new Set([selectedNode.id]);
      connectedEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });

      activeNodes = activeNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === selectedNode.id,
          isDimmed: !connectedNodeIds.has(n.id)
        }
      }));

      activeEdges = activeEdges.map(e => {
        const isConnected = e.source === selectedNode.id || e.target === selectedNode.id;
        return {
          ...e,
          animated: isConnected,
          style: {
            ...e.style,
            opacity: isConnected ? 1 : 0.08,
            strokeWidth: isConnected ? 3 : 1
          }
        };
      });
    } else if (selectedProductId) {
      // Direct external selection from Recommendations page
      const targetProdId = `prod_${selectedProductId}`;
      const found = activeNodes.find(n => n.id === targetProdId);
      if (found) {
        setSelectedNode(found);
      }
    } else {
      // Reset all dimming
      activeNodes = activeNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: false,
          isDimmed: false
        }
      }));
    }

    setNodes(activeNodes);
    setEdges(activeEdges);
  }, [initialNodes, formattedEdges, selectedNode, searchTerm, filterMode, selectedProductId, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(prev => (prev?.id === node.id ? null : node));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleResetView = () => {
    setSelectedNode(null);
    setSearchTerm('');
    setFilterMode('ALL');
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
    }
  };

  return (
    <div
      className={`relative w-full rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'h-[750px]'
      }`}
    >
      {/* Top Interactive Controls Toolbar */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur-xl">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, Product, Supplier, Warehouse..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-white px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Center: Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`rounded-xl px-3 py-1.5 font-semibold transition-all ${
              filterMode === 'ALL'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            All Nodes ({initialNodes.length})
          </button>
          <button
            onClick={() => setFilterMode('ALERT')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition-all ${
              filterMode === 'ALERT'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>Restock Alerts</span>
          </button>
          <button
            onClick={() => setFilterMode('SUPPLIER')}
            className={`rounded-xl px-3 py-1.5 font-semibold transition-all ${
              filterMode === 'SUPPLIER'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-indigo-400 hover:bg-indigo-500/10'
            }`}
          >
            Suppliers & Links
          </button>
        </div>

        {/* Right: Actions (Guide, Reset, Fullscreen) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              showGuide
                ? 'border-purple-500/50 bg-purple-950/60 text-purple-300'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
            title="Toggle Graph Explanation & Neo4j Insights"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Topology Insights</span>
            {showGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            onClick={handleResetView}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-all"
            title="Reset View & Clear Focus"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Canvas'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Graph Topology Guide & Neo4j Explanation Panel */}
      {showGuide && (
        <div className="z-20 border-b border-purple-500/30 bg-gradient-to-r from-purple-950/80 via-slate-900/95 to-slate-950/90 p-4 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Guide Card 1 */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-3.5">
              <div className="flex items-center gap-2 text-purple-300 font-bold mb-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Why Graph Architecture?</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Relational DBs require heavy multi-table SQL <code className="text-purple-300">JOIN</code>s. StockSphere uses Neo4j pointer traversals to discover fastest suppliers and category substitutes in constant $O(1)$ time per hop.
              </p>
            </div>

            {/* Guide Card 2 */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/30 p-3.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold mb-1.5">
                <Truck className="h-4 w-4" />
                <span>Multi-Supplier Redundancy</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Solid lines indicate primary contracted suppliers. <strong className="text-amber-400">Dashed gold lines</strong> represent AI-discovered secondary vendors capable of cutting delivery lead times during critical stockouts.
              </p>
            </div>

            {/* Guide Card 3 */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1.5">
                <Eye className="h-4 w-4" />
                <span>Interactive Path Isolation</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Click any node to dim background noise and highlight its exact supply chain path. Open the inspector drawer to generate 1-click replenishment purchase orders.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Graph Canvas */}
      <div className="relative flex-1 w-full overflow-hidden bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.15}
          maxZoom={2.2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-white !rounded-xl overflow-hidden shadow-2xl" />
          <MiniMap
            nodeStrokeColor="#64748b"
            nodeColor={(node) => {
              if (node.type === 'productNode') {
                return node.data?.isOutOfStock ? '#ef4444' : node.data?.isLowStock ? '#f59e0b' : '#10b981';
              }
              if (node.type === 'supplierNode') return '#6366f1';
              if (node.type === 'categoryNode') return '#f59e0b';
              return '#ec4899';
            }}
            className="!bg-slate-950 !border-slate-800 !rounded-2xl overflow-hidden shadow-2xl hidden sm:block"
            maskColor="rgba(15, 23, 42, 0.75)"
          />
        </ReactFlow>

        {/* Floating Comprehensive Legend */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 backdrop-blur-xl text-xs shadow-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Topology Legend
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-200">Product (Healthy)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <span className="text-slate-200">Stockout / Low</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
              <span className="text-slate-200">Supplier Vendor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-slate-200">Category Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50" />
              <span className="text-slate-200">Warehouse Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-amber-400" />
              <span className="text-amber-300">Alt Supplier Edge</span>
            </div>
          </div>
        </div>

        {/* Rich Node Detail Inspector Drawer */}
        <NodeDetailDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onQuickReorder={onQuickReorder}
        />
      </div>
    </div>
  );
};

export default SupplyChainGraph;
