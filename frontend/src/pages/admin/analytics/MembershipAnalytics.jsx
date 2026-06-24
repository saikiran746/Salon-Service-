import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Crown, TrendingUp, RefreshCw } from 'lucide-react';
import { analyticsAPI } from '../../../services/api';

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
            {p.name?.includes('Revenue') ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const defaultData = { active: 0, renewals: 0, revenue: 0, utilizationRate: 0, plans: [], growthTrend: [] };

export default function MembershipAnalytics() {
  const [membershipData, setMembershipData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getMembershipAnalytics()
      .then(res => { if (res.data?.success) setMembershipData(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Membership Analytics">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const kpis = [
    { label: 'Active', value: membershipData.active, icon: Crown, color: 'text-gold-400', bg: 'bg-gold-500/10' },
    { label: 'Renewals', value: membershipData.renewals, icon: RefreshCw, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Revenue', value: `₹${(membershipData.revenue/1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Utilization', value: `${membershipData.utilizationRate}%`, icon: Crown, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <AdminLayout title="Membership Analytics">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="stat-card text-center">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mx-auto mb-2`}>
              <k.icon size={14} className={k.color} />
            </div>
            <div className="font-display text-2xl text-white font-light">{k.value}</div>
            <div className="text-[9px] text-white/25 font-sans uppercase tracking-wider mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ChartCard title="Membership Growth" subtitle="Active members & revenue trend">
            {membershipData.growthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={membershipData.growthTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Raleway' }} />
                  <Line yAxisId="left" type="monotone" dataKey="active" name="Active Members" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="expired" name="Expired" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-white/20 text-[11px] font-sans">No membership data yet</div>
            )}
          </ChartCard>
        </div>
        <ChartCard title="Plan Distribution" subtitle="Members by plan type">
          {membershipData.plans.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={membershipData.plans} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="members">
                    {membershipData.plans.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {membershipData.plans.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: plan.color }} />
                      <span className="text-[11px] text-white/40 font-sans">{plan.name}</span>
                      <span className="text-[10px] text-white/20 font-sans">₹{plan.price}/mo</span>
                    </div>
                    <span className="text-[11px] text-white/60 font-sans font-medium">{plan.members}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[160px] text-white/20 text-[11px] font-sans">No plans yet</div>
          )}
        </ChartCard>
      </div>

    </AdminLayout>
  );
}
