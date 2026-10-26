import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  FileSpreadsheet,
  Network,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Products Catalog', to: '/products', icon: Package },
    { name: 'Stock Operations', to: '/stock', icon: ArrowLeftRight },
    { name: 'Suppliers', to: '/suppliers', icon: Truck },
    { name: 'Purchase Orders', to: '/orders', icon: FileSpreadsheet },
    {
      name: 'Inventory Intelligence',
      to: '/intelligence',
      icon: Network,
      highlight: true
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 md:hidden">
          <span className="text-sm font-semibold text-slate-300">Navigation</span>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Main Navigation
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? item.highlight
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-800/90 text-white border border-slate-700/60 shadow-sm'
                      : item.highlight
                      ? 'text-emerald-400/90 hover:bg-emerald-500/10 hover:text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                <Icon
                  className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${
                    item.highlight ? 'text-emerald-400' : ''
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.highlight && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 border border-emerald-500/30 animate-pulse">
                    Graph AI
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Database status footer card */}
        <div className="p-3 m-3 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <p className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Primary DB:</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MongoDB
            </span>
          </p>
          <p className="text-[11px] font-medium text-slate-400 flex items-center justify-between mt-1">
            <span>Graph Engine:</span>
            <span className="text-purple-400 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Neo4j Cypher
            </span>
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
