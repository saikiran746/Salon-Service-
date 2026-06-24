// ===== LEADS PAGE =====
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { leadsAPI } from '../../services/api';
import { Target, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['new', 'contacted', 'converted', 'lost'];
const STATUS_BADGE = { new: 'badge-blue', contacted: 'badge-gold', converted: 'badge-green', lost: 'badge-red', archived: 'badge-gray' };

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', period: '', page: 1 });

  const load = () => {
    setLoading(true);
    const params = { ...filters, limit: 25 };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    leadsAPI.getAll(params).then(r => setLeads(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [filters]);

  const updateStatus = async (id, status) => {
    try {
      await leadsAPI.updateStatus(id, { status });
      setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
      toast.success('Lead updated.');
    } catch { toast.error('Update failed.'); }
  };

  return (
    <AdminLayout title="Lead Management">
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} className="input-dark w-40 text-xs">
          <option value="">All Status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s} className="bg-salon-dark capitalize">{s}</option>)}
        </select>
        <select value={filters.period} onChange={e => setFilters(p => ({ ...p, period: e.target.value, page: 1 }))} className="input-dark w-40 text-xs">
          <option value="">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
        <div className="flex items-center gap-2 text-salon-muted text-xs font-sans ml-auto">
          <Target size={13} className="text-gold-500" /> {leads.filter(l => l.status === 'new').length} new leads
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-salon-border">
              {['Lead', 'Contact', 'Source', 'Page Visited', 'Date', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-salon-border/50">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-16" /></td>)}</tr>
            )) : leads.map(l => (
              <tr key={l.id} className="border-b border-salon-border/50 hover:bg-salon-black/20">
                <td className="table-cell"><div className="font-sans font-semibold text-salon-white text-xs">{l.name}</div></td>
                <td className="table-cell"><div className="text-salon-muted text-xs">{l.email || '—'}</div><div className="text-salon-muted text-[10px]">{l.phone || ''}</div></td>
                <td className="table-cell"><span className="badge badge-gray capitalize">{l.source}</span></td>
                <td className="table-cell text-xs text-salon-muted truncate max-w-[120px]">{l.page_visited || '—'}</td>
                <td className="table-cell text-xs text-salon-muted">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                <td className="table-cell"><span className={`badge ${STATUS_BADGE[l.status] || 'badge-gray'} capitalize`}>{l.status}</span></td>
                <td className="table-cell">
                  <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                    className="bg-transparent border border-salon-border text-xs text-salon-muted px-2 py-1 focus:outline-none focus:border-gold-500 hover:border-gold-500 transition-colors">
                    {STATUS_OPTS.map(s => <option key={s} value={s} className="bg-salon-dark capitalize">{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && leads.length === 0 && <div className="text-center py-12 text-salon-muted text-sm">No leads found.</div>}
      </div>
    </AdminLayout>
  );
}
