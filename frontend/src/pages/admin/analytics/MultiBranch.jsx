import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GitBranch, TrendingUp, Users, Star } from 'lucide-react';
import { multiBranchData } from '../../../utils/mockAnalytics';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-white/50 text-[10px] font-sans uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/40 font-sans">{p.name}:</span>
          <span className="text-white font-semibold font-sans">
            {p.name === 'Revenue' ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const branchColors = ['#C9A84C', '#10B981', '#3B82F6', '#8B5CF6'];
const medals = ['🥇', '🥈', '🥉', '#4'];

export default function MultiBranch() {
  return (
    <AdminLayout title="Multi-Branch Analytics">

      {/* Branch cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {multiBranchData.sort((a, b) => b.revenue - a.revenue).map((branch, i) => (
          <div key={i} className="admin-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{i < 3 ? medals[i] : `#${i+1}`}</span>
              <div className={`flex items-center gap-1 text-[11px] font-semibold font-sans ${branch.growth >= 10 ? 'text-emerald-400' : 'text-gold-400'}`}>
                <TrendingUp size={10} />
                {branch.growth}%
              </div>
            </div>
            <div className="mb-2">
              <h3 className="font-sans font-semibold text-white/80 text-sm">{branch.branch}</h3>
              <p className="text-[10px] text-white/25 font-sans">{branch.city}</p>
            </div>
            <div className="font-display text-2xl text-white font-light mb-3">
              ₹{(branch.revenue / 100000).toFixed(2)}L
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-[12px] text-white/60 font-sans font-semibold">{branch.clients.toLocaleString()}</p>
                <p className="text-[8px] text-white/20 font-sans">Clients</p>
              </div>
              <div>
                <p className="text-[12px] text-white/60 font-sans font-semibold">{branch.staff}</p>
                <p className="text-[8px] text-white/20 font-sans">Staff</p>
              </div>
              <div>
                <p className="text-[12px] text-white/60 font-sans font-semibold flex items-center justify-center gap-0.5">
                  <Star size={8} className="text-gold-400" fill="#C9A84C" />{branch.rating}
                </p>
                <p className="text-[8px] text-white/20 font-sans">Rating</p>
              </div>
            </div>
            {/* Mini sparkline */}
            <div className="mt-3 pt-3 border-t border-white/[0.05]">
              <div className="flex items-end gap-0.5 h-8">
                {branch.monthlyRevenue.map((v, j) => {
                  const max = Math.max(...branch.monthlyRevenue);
                  const h = (v / max) * 100;
                  return (
                    <div key={j} className="flex-1 rounded-t transition-all" style={{
                      height: `${h}%`,
                      background: j === branch.monthlyRevenue.length - 1 ? branchColors[i] : `${branchColors[i]}40`
                    }} />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Revenue Comparison" subtitle="Monthly revenue by branch">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={['Jan','Feb','Mar','Apr','May','Jun'].map((m, mi) => ({
                month: m,
                ...Object.fromEntries(multiBranchData.map(b => [b.branch, b.monthlyRevenue[mi]]))
              }))}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
              barSize={10}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              {multiBranchData.map((b, i) => (
                <Bar key={b.branch} dataKey={b.branch} name={b.branch} fill={branchColors[i]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Branch Rankings" subtitle="Performance metrics by branch">
          <div className="space-y-4 mt-2">
            {['revenue', 'clients', 'retention', 'rating'].map((metric, mi) => {
              const labels = { revenue: 'Revenue', clients: 'Clients', retention: 'Client Retention', rating: 'Avg Rating' };
              const sorted = [...multiBranchData].sort((a, b) => b[metric] - a[metric]);
              const max = sorted[0][metric];
              return (
                <div key={metric}>
                  <p className="text-[9px] text-white/25 font-sans uppercase tracking-wider mb-2">{labels[metric]}</p>
                  <div className="space-y-1.5">
                    {sorted.map((b, i) => {
                      const pct = (b[metric] / max) * 100;
                      return (
                        <div key={b.branch} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 font-sans w-14 text-right flex-shrink-0">{b.branch}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${pct}%`,
                              background: branchColors[multiBranchData.indexOf(b)]
                            }} />
                          </div>
                          <span className="text-[10px] text-white/50 font-sans w-14 flex-shrink-0">
                            {metric === 'revenue' ? `₹${(b[metric]/100000).toFixed(1)}L` :
                             metric === 'retention' ? `${b[metric]}%` :
                             metric === 'rating' ? `${b[metric]}★` : b[metric]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </AdminLayout>
  );
}
