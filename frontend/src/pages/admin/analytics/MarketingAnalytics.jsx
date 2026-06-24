import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
            {p.name === 'Revenue' ? `₹${Number(p.value).toLocaleString('en-IN')}` :
             p.name === 'ROI' ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MarketingAnalytics() {
  const [marketingData, setMarketingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getMarketingAnalytics()
      .then(res => { if (res.data?.success) setMarketingData(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Marketing Analytics">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Marketing Analytics">

      {/* Channel cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {marketingData.map((ch, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: ch.color }} />
              <span className={`text-[10px] font-sans font-bold ${ch.roi > 400 ? 'text-emerald-400' : ch.roi > 200 ? 'text-gold-400' : 'text-red-400'}`}>
                {ch.roi}% ROI
              </span>
            </div>
            <div className="font-display text-xl text-white font-light">₹{(ch.revenue/1000).toFixed(0)}K</div>
            <div className="text-[9px] text-white/30 font-sans uppercase tracking-wider mt-0.5">{ch.channel}</div>
            <div className="flex justify-between text-[10px] text-white/20 font-sans mt-1.5">
              <span>{ch.leads} leads</span>
              <span>{ch.bookings} booked</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Revenue by Channel" subtitle="Total revenue generated per marketing channel">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marketingData} margin={{ top: 5, right: 10, bottom: 35, left: 0 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis 
                dataKey="channel" 
                tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway', angle: -25, textAnchor: 'end' }} 
                axisLine={false} 
                tickLine={false} 
                interval={0} 
                height={45} 
              />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                {marketingData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROI Comparison" subtitle="Return on investment by channel (%)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marketingData} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 70 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="roi" name="ROI" radius={[0, 4, 4, 0]}>
                {marketingData.map((entry, i) => (
                  <Cell key={i} fill={entry.roi > 400 ? '#10B981' : entry.roi > 200 ? '#C9A84C' : '#EF4444'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table */}
      <div className="admin-card">
        <h3 className="card-title mb-5">Campaign Performance Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Channel', 'Leads', 'Bookings', 'Conv. Rate', 'Spend', 'Revenue', 'ROI', 'CPA'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...marketingData].sort((a, b) => b.roi - a.roi).map((ch, i) => {
                const convRate = ch.leads > 0 ? ((ch.bookings / ch.leads) * 100).toFixed(0) : '0';
                return (
                  <tr key={i} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: ch.color }} />
                        <span className="text-white/70 text-[12px] font-sans font-medium">{ch.channel}</span>
                      </div>
                    </td>
                    <td className="table-cell">{ch.leads}</td>
                    <td className="table-cell">{ch.bookings}</td>
                    <td className="table-cell">{convRate}%</td>
                    <td className="table-cell text-red-400">₹{ch.spend.toLocaleString()}</td>
                    <td className="table-cell text-gold-400 font-semibold">₹{(ch.revenue/1000).toFixed(0)}K</td>
                    <td className="table-cell">
                      <span className={`font-semibold ${ch.roi > 400 ? 'text-emerald-400' : ch.roi > 200 ? 'text-gold-400' : 'text-red-400'}`}>
                        {ch.roi}%
                      </span>
                    </td>
                    <td className="table-cell text-white/50">₹{ch.cpa}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
