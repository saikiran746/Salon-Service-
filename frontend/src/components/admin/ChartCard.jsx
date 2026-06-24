export default function ChartCard({ title, subtitle, children, action, className = '', headerRight }) {
  return (
    <div className={`admin-card ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="text-[11px] text-white/25 font-sans mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {action && (
            <button className="text-[10px] text-gold-400/70 hover:text-gold-400 font-sans tracking-wider uppercase transition-colors">
              {action} →
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
