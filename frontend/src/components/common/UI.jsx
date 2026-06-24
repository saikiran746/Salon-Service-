import { X, AlertTriangle, Info } from 'lucide-react';

/* ── Loading Spinner ── */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-2' };
  return (
    <div className={`${sizes[size]} border-salon-border border-t-gold-500 rounded-full animate-spin ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size="lg" />
      <span className="text-salon-muted text-xs tracking-widest uppercase font-sans">Loading</span>
    </div>
  );
}

/* ── Empty State ── */
export function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      {Icon && (
        <div className="w-16 h-16 bg-salon-card border border-salon-border flex items-center justify-center mb-5">
          <Icon size={28} className="text-salon-muted/40" />
        </div>
      )}
      <h3 className="font-display text-xl text-salon-white mb-2">{title}</h3>
      {description && <p className="text-salon-muted text-sm font-body max-w-xs mb-6">{description}</p>}
      {action && (
        <button onClick={action} className="btn-gold px-6 py-2.5 text-xs">{actionLabel}</button>
      )}
    </div>
  );
}

/* ── Confirm Dialog ── */
export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-[#0F0F0F]/90 backdrop-blur-md border border-white/[0.08] w-full max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] rounded-xl relative overflow-hidden animate-slide-up ${danger ? 'border-t-4 border-t-red-500/80' : 'border-t-4 border-t-gold-500/80'}`}>
        {/* Soft glowing ambient backgrounds */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full filter blur-[50px] opacity-10 pointer-events-none ${danger ? 'bg-red-500' : 'bg-gold-500'}`} />
        <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full filter blur-[50px] opacity-5 pointer-events-none ${danger ? 'bg-red-500' : 'bg-gold-500'}`} />
        
        <div className="p-6 border-b border-white/[0.06] flex items-center gap-4 relative z-10">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10 text-red-400' : 'bg-gold-500/10 text-gold-400'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-display text-lg text-salon-white tracking-wide">{title}</h3>
            <p className="text-salon-muted text-[9px] tracking-widest uppercase font-sans mt-0.5">Luxe System Notification</p>
          </div>
        </div>
        
        <div className="px-6 py-6 text-salon-muted text-sm font-body leading-relaxed relative z-10">
          {message}
        </div>
        
        <div className="px-6 pb-6 flex gap-4 relative z-10">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 py-3 text-[10px] tracking-widest uppercase font-sans font-bold bg-white/5 border border-white/10 hover:border-gold-500/40 text-salon-white rounded-md transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className={`flex-1 py-3 text-[10px] tracking-widest uppercase font-sans font-bold rounded-md transition-all active:scale-95 ${
              danger 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                : 'bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-salon-black shadow-[0_0_20px_rgba(201,168,76,0.3)]'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Badge ── */
export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'badge-gray', gold: 'badge-gold', green: 'badge-green',
    red: 'badge-red', blue: 'badge-blue',
  };
  return <span className={`badge ${variants[variant] || 'badge-gray'}`}>{children}</span>;
}

/* ── Stat Card ── */
export function StatCard({ icon: Icon, label, value, sub, trend, color = 'gold' }) {
  const colorMap = {
    gold: 'text-gold-500 bg-gold-500/10 border-gold-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  const c = colorMap[color] || colorMap.gold;
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 border flex items-center justify-center rounded-sm ${c}`}>
          {Icon && <Icon size={17} className={c.split(' ')[0]} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-sans font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="font-display text-3xl text-salon-white tracking-tight mb-1">{value}</div>
      <div className="text-salon-muted text-[10px] font-sans tracking-widest uppercase">{label}</div>
      {sub && <div className="text-salon-muted/60 text-[10px] font-body mt-1">{sub}</div>}
    </div>
  );
}

/* ── Table Skeleton ── */
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <tbody>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="border-b border-salon-border/50">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className={`h-3.5 shimmer rounded ${j === 0 ? 'w-32' : j === cols - 1 ? 'w-16' : 'w-24'}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ── Toast Notification (thin wrapper) ── */
export { default as toast } from 'react-hot-toast';
