import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI, analyticsAPI } from '../../services/api';
import { Plus, Pencil, Trash2, X, Star, Upload, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK = { name: '', email: '', phone: '', gender: '', experience: '', specializations: '', bio: '' };

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const [staffRes, perfRes] = await Promise.all([
        staffAPI.getAll({ is_active: 1 }),
        analyticsAPI.getStaffPerformance()
      ]);
      const staffData = staffRes.data?.data || [];
      const perfData = perfRes.data?.data?.staff || [];
      
      const merged = staffData.map(s => {
        const perf = perfData.find(p => p.id === s.id);
        return perf ? { ...s, total_clients: perf.total_clients, total_revenue: perf.revenue } : s;
      });
      
      setStaff(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Group staff by their individual specializations dynamically
  const groupedStaff = staff.reduce((acc, s) => {
    const specs = s.specializations ? s.specializations.split(',').map(sp => sp.trim()).filter(Boolean) : [];
    if (specs.length === 0) {
      if (!acc['Unassigned']) acc['Unassigned'] = [];
      acc['Unassigned'].push(s);
    } else {
      specs.forEach(spec => {
        if (!acc[spec]) acc[spec] = [];
        acc[spec].push(s);
      });
    }
    return acc;
  }, {});

  const allCategories = ['All', ...Object.keys(groupedStaff).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  })];

  const displayedCategories = activeCategory === 'All'
    ? Object.keys(groupedStaff).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      })
    : [activeCategory].filter(cat => groupedStaff[cat]);

  const openCreate = () => { setForm(BLANK); setEditId(null); setPhotoFile(null); setModal('create'); };
  const openEdit = (s) => {
    setForm({ name: s.name, email: s.email || '', phone: s.phone || '', gender: s.gender || '', experience: s.experience || '', specializations: s.specializations || '', bio: s.bio || '' });
    setEditId(s.id); setPhotoFile(null); setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);
      if (modal === 'edit') { await staffAPI.update(editId, fd); toast.success('Staff updated.'); }
      else { await staffAPI.create(fd); toast.success('Staff added.'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try { await staffAPI.delete(id); toast.success('Staff removed.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const SPECS = ['Skin Treatment', 'Manicure', 'Pedicure', 'Bleaching & De-Tan', 'Threading', 'Waxing', 'Add-On'];

  return (
    <AdminLayout title="Staff Management">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          {allCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-sans uppercase tracking-wider transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-gold-500 text-salon-black font-semibold' 
                  : 'bg-salon-dark text-salon-muted hover:text-gold-500 border border-salon-border hover:border-gold-500/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="btn-gold text-xs px-5 py-2.5 flex items-center gap-2 shrink-0"><Plus size={13} /> Add Staff</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 shimmer rounded-sm" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {displayedCategories.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="font-sans text-sm text-salon-muted uppercase tracking-wider font-semibold border-b border-salon-border/50 pb-2">
                {cat} ({groupedStaff[cat].length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedStaff[cat].map(s => (
                  <div key={s.id} className="admin-card">
                    <div className="flex gap-4 mb-4">
                      <div className="w-16 h-16 shrink-0 bg-salon-dark border border-salon-border overflow-hidden">
                        {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center text-gold-500/40 font-display text-2xl">{s.name?.[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg text-salon-white truncate">{s.name}</h3>
                        <p className="text-gold-500 text-[10px] font-sans tracking-wider uppercase truncate">{s.specializations?.split(',').join(' · ')}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={10} className="text-gold-500 fill-gold-500" />
                          <span className="text-salon-muted text-xs">{parseFloat(s.rating || 0).toFixed(1)} ({s.review_count || 0} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4 pt-3 border-t border-salon-border">
                      <div className="text-center">
                        <div className="font-display text-xl text-salon-white">{s.total_clients || 0}</div>
                        <div className="text-salon-muted text-[10px] font-sans tracking-wider">Clients</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-xl text-gold-500">₹{(parseFloat(s.total_revenue || 0) / 1000).toFixed(0)}K</div>
                        <div className="text-salon-muted text-[10px] font-sans tracking-wider">Revenue</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/admin/analytics/staff" state={{ staffId: s.id }} className="btn-dark flex-1 py-2 text-[10px] flex items-center justify-center gap-1"><BarChart2 size={11} /> Analytics</Link>
                      <button onClick={() => openEdit(s)} className="w-9 h-8 border border-salon-border hover:border-gold-500 flex items-center justify-center text-salon-muted hover:text-gold-500 transition-all"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(s.id)} className="w-9 h-8 border border-salon-border hover:border-red-500 flex items-center justify-center text-salon-muted hover:text-red-400 transition-all"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {displayedCategories.length === 0 && (
            <div className="py-12 text-center border border-dashed border-salon-border rounded-lg bg-salon-dark">
              <p className="text-salon-muted font-sans text-sm">No staff found.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-salon-card border border-salon-border w-full max-w-lg my-4">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">{modal === 'edit' ? 'Edit Staff' : 'Add Staff Member'}</h3>
              <button onClick={() => setModal(null)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-gold">Full Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="Staff name" required />
                </div>
                <div>
                  <label className="label-gold">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-dark" placeholder="staff@salon.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-gold">Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-dark" placeholder="+91..." />
                </div>
                <div>
                  <label className="label-gold">Gender</label>
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="input-dark text-white/70">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-gold">Experience</label>
                <input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} className="input-dark" placeholder="e.g. 5 years" />
              </div>
              <div>
                <label className="label-gold">Specializations (comma-separated)</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {SPECS.map(sp => (
                    <button key={sp} type="button" onClick={() => {
                      const list = form.specializations.split(',').map(s => s.trim()).filter(Boolean);
                      const idx = list.indexOf(sp);
                      if (idx > -1) list.splice(idx, 1); else list.push(sp);
                      setForm(p => ({ ...p, specializations: list.join(',') }));
                    }} className={`px-2 py-0.5 text-[10px] font-sans rounded-sm transition-all ${form.specializations.includes(sp) ? 'bg-gold-500 text-salon-black' : 'border border-salon-border text-salon-muted hover:border-gold-500'}`}>
                      {sp}
                    </button>
                  ))}
                </div>
                <input value={form.specializations} onChange={e => setForm(p => ({ ...p, specializations: e.target.value }))} className="input-dark text-xs" placeholder="haircut,beard,hair_spa" />
              </div>
              <div>
                <label className="label-gold">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-dark resize-none text-xs" rows={3} placeholder="Staff bio..." />
              </div>
              <div>
                <label className="label-gold">Profile Photo</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-salon-border hover:border-gold-500 p-3 transition-colors">
                  <Upload size={14} className="text-salon-muted" />
                  <span className="text-salon-muted text-xs">{photoFile ? photoFile.name : 'Choose photo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files[0])} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  {saving ? 'Saving...' : (modal === 'edit' ? 'Update' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
