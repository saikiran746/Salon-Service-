import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { customersAPI } from '../../services/api';
import { Search, Crown, Users, UserCheck, UserX, X, Phone, Mail, AlertTriangle } from 'lucide-react';

// ReturningClientsModal removed

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', membership: '', period: '', page: 1 });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    customersAPI.getStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters, limit: 20 };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    customersAPI.getAll(params)
      .then(r => { setCustomers(r.data.data); setPagination(r.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <AdminLayout title="Customers">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Customers', value: stats.total_bills || stats.total || 0, color: 'text-blue-400' },
          { icon: UserCheck, label: 'New Clients', value: stats.new_clients || 0, color: 'text-green-400' },
          { icon: UserX, label: 'Returning', value: stats.old_clients || 0, color: 'text-gold-500' },
          { icon: Crown, label: 'Members', value: stats.members || 0, color: 'text-purple-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <Icon size={18} className={`${color} mb-3`} />
            <div className="font-display text-3xl text-salon-white">{value}</div>
            <div className="text-salon-muted text-xs font-sans tracking-widest uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
          <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            placeholder="Search name, email, phone..." className="input-dark pl-9 text-xs w-full" />
        </div>
        <select value={filters.membership} onChange={e => setFilters(p => ({ ...p, membership: e.target.value, page: 1 }))} className="input-dark w-40 text-xs">
          <option value="">All Customers</option>
          <option value="yes">Members Only</option>
          <option value="no">Non-Members</option>
        </select>
        <select value={filters.period} onChange={e => setFilters(p => ({ ...p, period: e.target.value, page: 1 }))} className="input-dark w-40 text-xs">
          <option value="">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 3 Months</option>
          <option value="180">Last 6 Months</option>
          <option value="365">Last Year</option>
        </select>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-salon-border">
              {['Customer', 'Phone', 'Visits', 'Total Spent', 'Membership', 'Last Visit', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-salon-border/50">
                {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-20" /></td>)}
              </tr>
            )) : customers.map(c => (
              <tr key={c.id} className="border-b border-salon-border/50 hover:bg-salon-black/20 group">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gold-500/10 border border-gold-500/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-gold-500 text-xs font-bold">{c.name?.[0]}</span>
                    </div>
                    <div>
                      <div className="text-salon-white text-xs font-sans font-semibold">{c.name}</div>
                      <div className="text-salon-muted text-[10px] font-body truncate max-w-[140px]">
                        {c.email && !c.email.includes('@luxesalon.local') && !c.email.startsWith('walkin_') ? c.email : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-xs text-salon-muted">{c.phone || '—'}</td>
                <td className="table-cell text-xs font-sans text-center">{c.total_visits || 0}</td>
                <td className="table-cell font-display text-sm text-gold-500">₹{parseFloat(c.total_spent || 0).toLocaleString('en-IN')}</td>
                <td className="table-cell">
                  {c.membership_name
                    ? <span className="badge-gold flex items-center gap-1 w-fit"><Crown size={9} />{c.membership_name}</span>
                    : <span className="text-salon-muted text-xs">—</span>}
                </td>
                <td className="table-cell text-xs text-salon-muted">
                  {c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' }) : 'Never'}
                </td>
                <td className="table-cell">
                  <Link to={`/admin/customers/${c.id}`} className="text-gold-500 text-xs font-sans tracking-wider hover:text-gold-400">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && customers.length === 0 && (
          <div className="text-center py-12 text-salon-muted font-sans text-sm">No customers found.</div>
        )}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 p-4 flex-wrap">
            {[...Array(Math.min(pagination.pages, 10))].map((_, i) => (
              <button key={i} onClick={() => setFilters(p => ({ ...p, page: i + 1 }))}
                className={`w-8 h-8 text-xs font-sans ${filters.page === i + 1 ? 'bg-gold-500 text-salon-black font-bold' : 'border border-salon-border text-salon-muted hover:border-gold-500'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
