export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStockStatus = (quantity, threshold) => {
  if (quantity === 0) {
    return { label: 'OUT OF STOCK', color: 'red', bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
  }
  if (quantity <= threshold) {
    return { label: 'LOW STOCK', color: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  }
  return { label: 'HEALTHY', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
};
