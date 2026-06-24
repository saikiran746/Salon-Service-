import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { customersAPI } from '../../services/api';
import { ArrowLeft, Calendar, Receipt, Crown, Phone, Mail } from 'lucide-react';

const STATUS_BADGE = { confirmed: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-gray' };

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('appointments');

  useEffect(() => {
    customersAPI.getById(id).then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AdminLayout title="Customer Profile"><div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-salon-border border-t-gold-500 rounded-full animate-spin" /></div></AdminLayout>;
  if (!data) return <AdminLayout title="Customer Profile"><p className="text-salon-muted">Customer not found.</p></AdminLayout>;

  return (
    <AdminLayout title="Customer Profile">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/customers" className="text-salon-muted hover:text-gold-500 flex items-center gap-1 text-xs font-sans tracking-wider"><ArrowLeft size={13} /> Back to Customers</Link>
      </div>

      {/* Profile Header */}
      <div className="admin-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 shrink-0 bg-gold-500/20 border border-gold-500/30 rounded-full flex items-center justify-center">
            <span className="text-gold-500 font-display text-2xl">{data.name?.[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl text-salon-white">{data.name}</h2>
                {data.membership_name && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown size={12} className="text-gold-500" />
                    <span className="text-gold-500 text-xs font-sans tracking-widest uppercase">{data.membership_name} Member</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Total Visits', value: data.total_visits || 0 },
                  { label: 'Total Spent', value: `₹${parseFloat(data.total_spent || 0).toLocaleString('en-IN')}` },
                  { label: 'Last Visit', value: data.last_visit ? new Date(data.last_visit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Never' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="font-display text-xl text-gold-500">{value}</div>
                    <div className="text-salon-muted text-[10px] font-sans tracking-wider uppercase">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs font-body text-salon-muted">
              {data.email && !data.email.includes('@luxesalon.local') && !data.email.startsWith('walkin_') && <span className="flex items-center gap-1"><Mail size={11} /> {data.email}</span>}
              {data.phone && <span className="flex items-center gap-1"><Phone size={11} /> {data.phone}</span>}
              <span>Joined {new Date(data.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferred Services */}
      {data.preferredServices?.length > 0 && (
        <div className="admin-card mb-6">
          <h3 className="font-sans text-xs font-semibold text-salon-white tracking-widest uppercase mb-4">Preferred Services</h3>
          <div className="flex flex-wrap gap-2">
            {data.preferredServices.map(s => (
              <div key={s.name} className="flex items-center gap-2 border border-salon-border px-3 py-1.5">
                <span className="text-salon-white text-xs font-body">{s.name}</span>
                <span className="text-gold-500 text-[10px] font-sans">{s.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-salon-border mb-5">
        {[{ key: 'appointments', icon: Calendar, label: 'Appointments' }, { key: 'bills', icon: Receipt, label: 'Bills' }].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-sans tracking-wider uppercase border-b-2 transition-all -mb-px ${tab === key ? 'border-gold-500 text-gold-500' : 'border-transparent text-salon-muted hover:text-salon-white'}`}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {tab === 'appointments' && (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-salon-border">
                {['Date', 'Service', 'Specialist', 'Price', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.appointments || []).map(a => (
                <tr key={a.id} className="border-b border-salon-border/50">
                  <td className="table-cell text-xs">{new Date(a.appointment_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                  <td className="table-cell text-xs">{a.service_name}</td>
                  <td className="table-cell text-xs">{a.staff_name}</td>
                  <td className="table-cell font-display text-sm">₹{parseFloat(a.price || 0).toLocaleString('en-IN')}</td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.appointments?.length && <p className="text-center text-salon-muted text-sm py-8">No appointments yet.</p>}
        </div>
      )}

      {tab === 'bills' && (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-salon-border">
                {['Invoice', 'Date', 'Amount', 'Payment', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.bills || []).map(b => (
                <tr key={b.id} className="border-b border-salon-border/50">
                  <td className="table-cell text-xs text-gold-500">{b.invoice_number}</td>
                  <td className="table-cell text-xs">{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell font-display text-sm">₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</td>
                  <td className="table-cell text-xs capitalize">{b.payment_method}</td>
                  <td className="table-cell"><span className="badge-green">Paid</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.bills?.length && <p className="text-center text-salon-muted text-sm py-8">No bills yet.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
