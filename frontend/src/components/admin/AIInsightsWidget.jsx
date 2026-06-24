import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { aiInsights } from '../../utils/mockAnalytics';
import { Link } from 'react-router-dom';

const typeColors = {
  growth: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  performance: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
  alert: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  insight: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-red-400 bg-red-500/10 border-red-500/20',
  opportunity: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  inventory: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

const routeMap = {
  'View Service Analytics': '/admin/analytics/services',
  'View Staff Report': '/admin/analytics/staff',
  'View Memberships': '/admin/analytics/memberships',
  'View Appointments': '/admin/analytics/appointments',
  'View Client Analytics': '/admin/analytics/clients',
  'View Marketing': '/admin/analytics/marketing',
  'View Inventory': '/admin/analytics/inventory',
};

export default function AIInsightsWidget({ compact = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!compact) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % aiInsights.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [compact]);

  if (compact) {
    const insight = aiInsights[activeIndex];
    const colorClass = typeColors[insight.type];
    return (
      <div
        className={`glass-card-gold p-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-start gap-2.5">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 text-sm ${colorClass}`}>
            {insight.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/70 font-body leading-relaxed">{insight.message}</p>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex gap-1">
                {aiInsights.map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      i === activeIndex ? 'w-4 bg-gold-400' : 'w-1 bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <Link
                to={routeMap[insight.action] || '#'}
                className="text-[10px] text-gold-400/60 hover:text-gold-400 font-sans flex items-center gap-0.5 transition-colors"
              >
                {insight.action} <ArrowRight size={8} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
          <Sparkles size={12} className="text-purple-400" />
        </div>
        <h3 className="card-title">AI Insights</h3>
        <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-sans font-semibold">
          LIVE
        </span>
      </div>
      <div className="space-y-2">
        {aiInsights.map((insight, i) => {
          const colorClass = typeColors[insight.type];
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 text-sm ${colorClass}`}>
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/65 font-body leading-relaxed">{insight.message}</p>
                <Link
                  to={routeMap[insight.action] || '#'}
                  className="text-[10px] text-gold-400/50 hover:text-gold-400 font-sans flex items-center gap-1 mt-1 transition-colors"
                >
                  {insight.action} <ArrowRight size={9} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
