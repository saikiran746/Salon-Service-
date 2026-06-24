import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Animated counter hook
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const startVal = 0;

    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(update);
    };

    raf.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

// Inline sparkline SVG
function Sparkline({ data, color = '#C9A84C', positive = true }) {
  if (!data || data.length < 2) return null;

  const w = 80, h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const fillD = `M ${points[0]} L ${points.join(' L ')} L ${w},${h} L 0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-${color.replace('#','')})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatValue(value, currency, unit) {
  if (currency) {
    return `${currency}${Math.round(value).toLocaleString('en-IN')}`;
  }
  if (unit) return `${Math.round(value)}${unit}`;
  return Math.round(value).toLocaleString('en-IN');
}

export default function KPICard({ label, data = {}, icon: Icon, delay = 0, subtitle, onClick }) {
  const { value = 0, prev = 0, growth = 0, currency, unit, sparkline = [] } = data || {};
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const animatedValue = useCountUp(visible ? value : 0, 1200);
  const isPositive = growth >= 0;
  const sparkColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <div
      className={`kpi-card group ${onClick ? 'cursor-pointer hover:border-gold-500/30 hover:bg-gold-500/[0.02] transition-colors' : ''}`}
      onClick={onClick}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/15 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-gold-400" />
            </div>
          )}
          <div>
            <p className="text-[10px] font-sans font-semibold tracking-widest uppercase text-white/35">
              {label}
            </p>
            {subtitle && (
              <p className="text-[9px] text-white/20 font-sans mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {/* Growth badge */}
        <div className={`flex items-center gap-0.5 text-[11px] font-bold font-sans px-2 py-0.5 rounded-full ${
          isPositive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {Math.abs(growth).toFixed(1)}%
        </div>
      </div>

      {/* Value */}
      <div className="mb-3">
        <span className="font-sans text-[28px] leading-none font-light text-white">
          {formatValue(animatedValue, currency, unit)}
        </span>
      </div>

      {/* Sparkline + prev period */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] text-white/20 font-sans">vs prev period</p>
          <p className="text-[11px] text-white/40 font-sans font-medium">
            {formatValue(prev, currency, unit)}
          </p>
        </div>
        <Sparkline data={sparkline} color={sparkColor} positive={isPositive} />
      </div>
    </div>
  );
}
