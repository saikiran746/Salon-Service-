import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { analyticsAPI } from '../../../services/api';
import { Users, FootprintsIcon } from 'lucide-react';

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
            {['Revenue', 'Profit'].includes(p.name) ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ServiceAnalytics() {
  const [data, setData] = useState({ services: [], categories: [], walkinServices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getServiceAnalytics()
      .then(res => { if (res.data?.success) setData(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { services, categories, walkinServices = [] } = data;
  const totalWalkIns = walkinServices.reduce((acc, s) => acc + (s.walk_ins || 0), 0);

  if (loading) {
    return (
      <AdminLayout title="Service Analytics">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const PIE_COLORS = ['#C9A84C', '#10B981', '#3B82F6', '#8B5CF6'];

  return (
    <AdminLayout title="Service Analytics">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ChartCard title="Service Revenue Comparison" subtitle="Top services by revenue (last 30 days)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={services} margin={{ top: 5, right: 10, bottom: 65, left: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway', angle: -30, textAnchor: 'end' }}
                  axisLine={false} tickLine={false} interval={0} height={75}
                />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
                  {services.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Category Performance" subtitle="Revenue by category">
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="revenue">
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Raleway' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-white/20 text-[11px] font-sans">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Service Performance Table */}
      <div className="admin-card mb-4">
        <h3 className="card-title mb-5">All Services Performance</h3>
        {services.length === 0 ? (
          <p className="text-white/30 text-[12px] font-sans text-center py-8">No service data available for the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Service', 'Category', 'Bookings', 'Walk-Ins', 'Revenue', 'Rebooking %'].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((svc, i) => {
                  const walkInSvc = walkinServices.find(w => w.name === svc.name);
                  const walkInsCount = walkInSvc ? walkInSvc.walk_ins : 0;
                  return (
                  <tr key={i} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: svc.color }} />
                        <span className="text-white/75 text-[12px] font-sans font-medium">{svc.name}</span>
                      </div>
                    </td>
                    <td className="table-cell"><span className="badge-gray text-[10px]">{svc.category}</span></td>
                    <td className="table-cell">{svc.bookings}</td>
                    <td className="table-cell">{walkInsCount}</td>
                    <td className="table-cell text-gold-400 font-semibold">₹{svc.revenue.toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-400">{svc.repeatRate}%</span>
                        <div className="h-1.5 w-16 rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${svc.repeatRate}%`,
                              background: svc.repeatRate >= 60
                                ? 'linear-gradient(90deg,#10B981,#059669)'
                                : svc.repeatRate >= 30
                                ? 'linear-gradient(90deg,#F59E0B,#D97706)'
                                : 'linear-gradient(90deg,#EF4444,#DC2626)'
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-white/25 font-sans mt-0.5">repeat clients</p>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </AdminLayout>
  );
}
