import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Calendar, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
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
          <span className="text-white font-semibold font-sans">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AppointmentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getAppointmentAnalytics()
      .then(res => { if (res.data?.success) setData(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Appointment Analytics">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const summary = data?.summary || { total: 0, confirmed: 0, completed: 0, cancelled: 0, pending: 0 };
  const monthlyTrend = data?.monthlyTrend || [];
  const hourlyPeak = data?.hourlyPeak || [];
  const dailyPeak = data?.dailyPeak || [];

  const statusCards = [
    { label: 'Total', value: summary.total, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Confirmed', value: summary.confirmed, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Cancelled', value: summary.cancelled, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const pieData = [
    { name: 'Completed', value: summary.completed, color: '#10B981' },
    { name: 'Confirmed', value: summary.confirmed, color: '#3B82F6' },
    { name: 'Cancelled', value: summary.cancelled, color: '#EF4444' },
    { name: 'Pending', value: summary.pending, color: '#F59E0B' },
  ];

  return (
    <AdminLayout title="Appointment Analytics">
      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statusCards.map((s, i) => (
          <div key={i} className="stat-card text-center">
            <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={13} className={s.color} />
            </div>
            <div className="font-display text-2xl text-white font-light">{s.value.toLocaleString()}</div>
            <div className="text-[9px] text-white/25 font-sans uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Peak Hours & Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Peak Booking Hours" subtitle="Busiest times of day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyPeak} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="bookings" name="Bookings" radius={[3, 3, 0, 0]}>
                {hourlyPeak.map((entry, i) => (
                  <Cell key={i} fill={entry.bookings > 50 ? '#C9A84C' : entry.bookings > 20 ? '#E8C96A80' : '#C9A84C30'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Days" subtitle="Busiest days of the week">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyPeak} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="bookings" name="Bookings" radius={[4, 4, 0, 0]}>
                {dailyPeak.map((entry, i) => (
                  <Cell key={i} fill={['Sat', 'Sun'].includes(entry.day) ? '#C9A84C' : '#C9A84C40'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monthly Trends + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Appointment Trends" subtitle="Completed vs cancelled">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#C9A84C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Status Distribution" subtitle="All time breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData.filter(p => p.value > 0)} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Raleway' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </AdminLayout>
  );
}
