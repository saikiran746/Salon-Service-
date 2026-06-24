import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Shield, Search, Monitor, Smartphone, Tablet, LogIn, Wifi } from 'lucide-react';
import { authAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const deviceConfig = {
  laptop: { color: 'text-gold-400', bg: 'bg-gold-500/10', label: 'Laptop', icon: Monitor },
  mobile: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Mobile', icon: Smartphone },
  tab: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Tablet', icon: Tablet },
};

export default function AdminActivity() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.getAdminActivity();
      setLogs(data.data || []);
    } catch (err) {
      toast.error('Failed to load admin activity logs');
    } finally {
      setLoading(false);
    }
  };

  // Compute unique active device sessions (unique ip+device_type combos)
  const uniqueDevices = [...new Map(logs.map(l => [`${l.ip_address}-${l.device_type}`, l])).values()];

  const filtered = uniqueDevices.filter(log => {
    const matchSearch = !search || log.name.toLowerCase().includes(search.toLowerCase()) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || log.device_type === filter;
    return matchSearch && matchFilter;
  });

  const uniqueLaptops = uniqueDevices.filter(l => l.device_type === 'laptop').length;
  const uniqueMobiles = uniqueDevices.filter(l => l.device_type === 'mobile').length;
  const uniqueTabs    = uniqueDevices.filter(l => l.device_type === 'tab').length;
  const totalUniqueDevices = uniqueDevices.length;

  return (
    <AdminLayout title="Admin Login Activity">

      {/* Active Device Summary Banner */}
      <div className="mb-4 p-4 rounded-xl border border-gold-500/20 bg-gold-500/5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center">
            <Wifi size={18} className="text-gold-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/30 font-sans uppercase tracking-widest">Currently Logged In</p>
            <p className="text-white font-display text-xl font-light">
              <span className="text-gold-400 font-semibold">{totalUniqueDevices}</span> unique device{totalUniqueDevices !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3 ml-auto flex-wrap">
          {[
            { label: 'Laptop', count: uniqueLaptops, icon: Monitor, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
            { label: 'Mobile', count: uniqueMobiles, icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Tablet', count: uniqueTabs, icon: Tablet, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          ].map(({ label, count, icon: Icon, color, bg, border }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bg} border ${border}`}>
              <Icon size={14} className={color} />
              <span className={`text-lg font-display font-light ${color}`}>{count}</span>
              <span className="text-[11px] text-white/40 font-sans">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login Count Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {['all', 'laptop', 'mobile', 'tab'].map(type => {
          const count = type === 'all' ? uniqueDevices.length : uniqueDevices.filter(l => l.device_type === type).length;
          const cfg = deviceConfig[type] || { label: 'Active Devices' };
          return (
            <div
              key={type}
              className={`stat-card cursor-pointer text-center ${filter === type ? 'border-gold-500/30' : ''}`}
              onClick={() => setFilter(type)}
            >
              <div className="font-display text-3xl text-white font-light">{count}</div>
              <div className="text-[9px] text-white/25 font-sans uppercase tracking-wider mt-1">
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Trail */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-gold-400" />
            <h3 className="card-title">Active Sessions</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                placeholder="Search logs..."
                className="bg-white/[0.04] border border-white/[0.07] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white/60 font-sans focus:outline-none focus:border-gold-500/30 w-40 placeholder-white/15"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Action', 'User', 'Role', 'Device', 'Date', 'Time', 'IP Address'].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-white/40 text-sm">Loading logs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-white/20 text-[12px] font-sans">No matching logs found</td>
                </tr>
              ) : filtered.map((log, i) => {
                const cfg = deviceConfig[log.device_type] || deviceConfig.laptop;
                const DeviceIcon = cfg.icon;
                
                // Try fixing timezone missing Z
                let dateStr = log.created_at;
                if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+')) {
                  dateStr += 'Z';
                }
                const dateObj = new Date(dateStr);
                
                return (
                  <tr key={log.id || i} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <LogIn size={14} className="text-white/40" />
                        <span className="text-emerald-400 text-[11px] font-sans font-medium">Active</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gold-500/10 border border-gold-500/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-400 text-[9px] font-bold">{log.name[0]}</span>
                        </div>
                        <span className="text-[11px] text-white/60 font-sans">{log.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge border text-[9px] ${
                        log.role === 'super_admin' ? 'badge-gold' : 'badge-blue'
                      }`}>{log.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                    </td>
                    <td className="table-cell">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full inline-flex ${cfg.bg} ${cfg.color}`}>
                        <DeviceIcon size={10} />
                        <span className="text-[10px] font-sans font-medium">{cfg.label}</span>
                      </div>
                    </td>
                    <td className="table-cell text-white/40 text-[11px]">
                      {isNaN(dateObj.getTime()) ? '-' : format(dateObj, 'yyyy-MM-dd')}
                    </td>
                    <td className="table-cell text-white/40 text-[11px] font-mono">
                      {isNaN(dateObj.getTime()) ? '-' : format(dateObj, 'h:mm:ss a').toLowerCase()}
                    </td>
                    <td className="table-cell text-white/25 text-[10px] font-mono">{log.ip_address}</td>
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
