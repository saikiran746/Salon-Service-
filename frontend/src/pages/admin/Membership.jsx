// ===== ADMIN MEMBERSHIP =====
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { membershipsAPI } from '../../services/api';
import { Plus, Pencil, Trash2, X, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK_PLAN = { name: '', description: '', price: '', validity_days: 365, discount: 0, benefits: [''] };

export default function AdminMembership() {
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK_PLAN);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('plans');

  const load = () => {
    setLoading(true);
    Promise.all([membershipsAPI.getAllAdmin(), membershipsAPI.getMembers()])
      .then(([p, m]) => { setPlans(p.data.data); setMembers(m.data.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(BLANK_PLAN); setEditId(null); setModal('create'); };
  const openEdit = (p) => {
    const benefits = typeof p.benefits === 'string' ? JSON.parse(p.benefits) : (p.benefits || []);
    setForm({ name: p.name, description: p.description || '', price: p.price, validity_days: p.validity_days, discount: p.discount, benefits });
    setEditId(p.id); setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, benefits: form.benefits.filter(Boolean) };
      if (modal === 'edit') { await membershipsAPI.update(editId, payload); toast.success('Plan updated.'); }
      else { await membershipsAPI.create(payload); toast.success('Plan created.'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const addBenefit = () => setForm(p => ({ ...p, benefits: [...p.benefits, ''] }));
  const updateBenefit = (i, v) => setForm(p => ({ ...p, benefits: p.benefits.map((b, idx) => idx === i ? v : b) }));
  const removeBenefit = (i) => setForm(p => ({ ...p, benefits: p.benefits.filter((_, idx) => idx !== i) }));

  return (
    <AdminLayout title="Memberships">
      <div className="flex gap-3 border-b border-salon-border mb-6">
        {['plans', 'members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-sans tracking-widest uppercase border-b-2 -mb-px transition-all ${tab === t ? 'border-gold-500 text-gold-500' : 'border-transparent text-salon-muted hover:text-salon-white'}`}>
            {t === 'plans' ? 'Membership Plans' : `Active Members (${members.length})`}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <>
          <div className="flex justify-end mb-6">
            <button onClick={openCreate} className="btn-gold text-xs px-5 py-2.5 flex items-center gap-2"><Plus size={13} /> Add Plan</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-64 shimmer rounded-sm" />) :
              plans.map(plan => {
                const benefits = typeof plan.benefits === 'string' ? JSON.parse(plan.benefits || '[]') : (plan.benefits || []);
                return (
                  <div key={plan.id} className="admin-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2"><Crown size={16} className="text-gold-500" /><h3 className="font-display text-xl text-salon-white">{plan.name}</h3></div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(plan)} className="text-salon-muted hover:text-gold-500 p-1"><Pencil size={12} /></button>
                        <button onClick={() => { membershipsAPI.delete(plan.id).then(() => { toast.success('Deleted.'); load(); }).catch(() => toast.error('Failed.')); }} className="text-salon-muted hover:text-red-400 p-1"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="font-display text-3xl text-gold-500 mb-1">₹{parseFloat(plan.price).toLocaleString('en-IN')}</div>
                    <div className="text-salon-muted text-xs font-sans mb-3">{plan.validity_days} days · {plan.discount}% discount</div>
                    <div className="text-salon-muted text-xs mb-3">{plan.active_members || 0} active members</div>
                    <div className="space-y-1">{benefits.slice(0, 3).map((b, i) => <div key={i} className="text-salon-muted text-xs font-body flex gap-1"><span className="text-gold-500">✓</span>{b}</div>)}</div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {tab === 'members' && (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr className="border-b border-salon-border">{['Member', 'Plan', 'Discount', 'Expires', 'Total Spent'].map(h => <th key={h} className="text-left px-4 py-3 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i} className="border-b border-salon-border/50">{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-20" /></td>)}</tr>) :
                members.map(m => (
                  <tr key={m.id} className="border-b border-salon-border/50">
                    <td className="table-cell"><div className="font-sans font-semibold text-salon-white text-xs">{m.name}</div><div className="text-salon-muted text-[10px]">{m.email}</div></td>
                    <td className="table-cell"><span className="badge-gold flex items-center gap-1 w-fit"><Crown size={9} />{m.plan_name}</span></td>
                    <td className="table-cell text-gold-500 text-xs">{m.discount}%</td>
                    <td className="table-cell text-xs text-salon-muted">{m.membership_expiry ? new Date(m.membership_expiry).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="table-cell font-display text-sm">₹{parseFloat(m.total_spent || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && members.length === 0 && <p className="text-center text-salon-muted text-sm py-8">No active members.</p>}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-salon-card border border-salon-border w-full max-w-lg my-4">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">{modal === 'edit' ? 'Edit Plan' : 'New Plan'}</h3>
              <button onClick={() => setModal(null)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="label-gold">Plan Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-dark" required /></div>
              <div><label className="label-gold">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-dark resize-none" rows={2} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label-gold">Price (₹)</label><input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-dark" required /></div>
                <div><label className="label-gold">Days</label><input type="number" value={form.validity_days} onChange={e => setForm(p => ({ ...p, validity_days: e.target.value }))} className="input-dark" /></div>
                <div><label className="label-gold">Discount %</label><input type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} className="input-dark" min="0" max="100" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="label-gold mb-0">Benefits</label><button type="button" onClick={addBenefit} className="text-gold-500 text-[10px] font-sans tracking-wider hover:text-gold-400"><Plus size={10} /> Add</button></div>
                {form.benefits.map((b, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={b} onChange={e => updateBenefit(i, e.target.value)} className="input-dark flex-1 text-xs" placeholder="Benefit description" />
                    {form.benefits.length > 1 && <button type="button" onClick={() => removeBenefit(i)} className="text-red-400/60 hover:text-red-400"><X size={14} /></button>}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60">{saving ? 'Saving...' : 'Save Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
