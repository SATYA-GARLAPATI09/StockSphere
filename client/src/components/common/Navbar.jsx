import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Boxes, User as UserIcon, LogOut, Menu } from 'lucide-react';

const Navbar = ({ onMenuClick }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20">
            <Boxes className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">StockSphere</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v1.0 • Hybrid Mongo+Neo4j
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-slate-200 leading-none">{user?.name || 'Authorized User'}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              {isAdmin ? (
                <span className="text-emerald-400 font-semibold">● Admin</span>
              ) : (
                <span className="text-sky-400 font-semibold">● Inventory Staff</span>
              )}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
