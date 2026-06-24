import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ArrowLeft, Star, Users, DollarSign, Scissors } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function StaffDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    setLoading(true);
    staffAPI.getAnalytics(id, { period })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, period]);

  if (loading) return <AdminLayout title="Staff Analytics"><div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-salon-border border-t-gold-500 rounded-full animate-spin" /></div></AdminLayout>;
  if (!data) return <AdminLayout title="Staff Analytics"><p className="text-salon-muted">Staff not found.</p></AdminLayout>;

  const { staff, totalAppointments, totalRevenue, serviceBreakdown, monthlyPerformance, avgRating, totalReviews } = data;

  const chartData = {
    labels: (monthlyPerformance || []).map(m => m.month),
    datasets: [
      { label: 'Appointments', data: (monthlyPerformance || []).map(m => m.appointments), backgroundColor: 'rgba(201,168,76,0.7)', borderRadius: 2 },
      { label: 'Revenue (÷100)', data: (monthlyPerformance || []).map(m => m.revenue / 100), backgroundColor: 'rgba(201,168,76,0.3)', borderRadius: 2 },
    ],
  };

  return (
    <AdminLayout title="Staff Analytics">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/staff" className="text-salon-muted hover:text-gold-500 flex items-center gap-1 text-xs font-sans tracking-wider"><ArrowLeft size={13} /> Back</Link>
        <div className="flex gap-2">
          {['7', '30', '90', '365'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs font-sans rounded-sm transition-all ${period === p ? 'bg-gold-500 text-salon-black font-bold' : 'border border-salon-border text-salon-muted hover:border-gold-500'}`}>{p}d</button>
          ))}
        </div>
      </div>

      {/* Staff Header */}
      <div className="admin-card mb-6 flex items-start gap-5">
        <div className="w-20 h-20 shrink-0 bg-salon-dark border border-salon-border overflow-hidden">
          {staff.photo ? <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center text-gold-500/40 font-display text-3xl">{staff.name?.[0]}</div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-3xl text-salon-white">{staff.name}</h2>
          <p className="text-gold-500 text-xs font-sans tracking-widest uppercase mb-2">{staff.specializations?.split(',').join(' · ')}</p>
          <div className="flex flex-wrap gap-4 text-xs font-body text-salon-muted">
            <span>{staff.experience} experience</span>
            <span className="flex items-center gap-1"><Star size={11} className="text-gold-500 fill-gold-500" /> {parseFloat(avgRating || 0).toFixed(1)} ({totalReviews} reviews)</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Appointments', value: totalAppointments },
          { icon: DollarSign, label: 'Revenue Generated', value: `₹${parseFloat(totalRevenue || 0).toLocaleString('en-IN')}` },
          { icon: Star, label: 'Average Rating', value: parseFloat(avgRating || 0).toFixed(1) },
          { icon: Scissors, label: 'Lifetime Clients', value: staff.total_clients || 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="stat-card">
            <Icon size={16} className="text-gold-500 mb-2" />
            <div className="font-display text-2xl text-salon-white">{value}</div>
            <div className="text-salon-muted text-[10px] font-sans tracking-widest uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <h3 className="font-sans text-xs font-semibold text-salon-white tracking-widest uppercase mb-5">Monthly Performance</h3>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#888', font: { family: 'Raleway', size: 10 } } } }, scales: { x: { ticks: { color: '#666' }, grid: { color: '#2A2A2A' } }, y: { ticks: { color: '#666' }, grid: { color: '#2A2A2A' } } } }} />
        </div>
        <div className="admin-card">
          <h3 className="font-sans text-xs font-semibold text-salon-white tracking-widest uppercase mb-5">Service Breakdown</h3>
          {serviceBreakdown?.length === 0 ? <p className="text-salon-muted text-sm text-center py-8">No data available.</p> : (
            <div className="space-y-3">
              {(serviceBreakdown || []).map(s => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-salon-white text-xs font-sans">{s.name}</span>
                      <span className="text-salon-muted text-xs font-body">{s.count} · ₹{parseFloat(s.revenue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 bg-salon-border rounded-full overflow-hidden">
                      <div className="h-full bg-gold-500 rounded-full" style={{ width: `${Math.min((s.count / (totalAppointments || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
