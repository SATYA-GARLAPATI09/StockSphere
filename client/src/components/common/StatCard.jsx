import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'emerald' }) => {
  const colorSchemes = {
    emerald: {
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      text: 'text-emerald-400'
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400',
      text: 'text-amber-400'
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-400',
      text: 'text-rose-400'
    },
    sky: {
      bg: 'from-sky-500/10 to-transparent',
      border: 'border-sky-500/20',
      iconBg: 'bg-sky-500/20 text-sky-400',
      text: 'text-sky-400'
    },
    purple: {
      bg: 'from-purple-500/10 to-transparent',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
      text: 'text-purple-400'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.emerald;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${scheme.border} bg-slate-900/60 bg-gradient-to-br ${scheme.bg} p-5 backdrop-blur-md transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${scheme.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            {trend && <span className={scheme.text}>{trend}</span>}
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
