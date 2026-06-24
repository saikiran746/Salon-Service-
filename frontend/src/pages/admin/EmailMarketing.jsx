import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { emailAPI, customersAPI } from '../../services/api';
import { Plus, Send, Mail, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK_TEMPLATE = { name: '', subject: '', body: '', trigger_days: '' };

export default function AdminEmailMarketing() {
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState('templates');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK_TEMPLATE);
  const [editId, setEditId] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ subject: '', body: '', template_id: '', customer_ids: [] });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([emailAPI.getTemplates(), emailAPI.getCampaigns(), customersAPI.getAll({ limit: 200 })])
      .then(([t, c, cust]) => { setTemplates(t.data.data); setCampaigns(c.data.data); setCustomers(cust.data.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSaveTemplate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) { await emailAPI.updateTemplate(editId, form); toast.success('Template updated.'); }
      else { await emailAPI.createTemplate(form); toast.success('Template created.'); }
      emailAPI.getTemplates().then(r => setTemplates(r.data.data));
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleSendCampaign = async (e) => {
    e.preventDefault(); setSending(true);
    try {
      const { data } = await emailAPI.sendCampaign(campaignForm);
      toast.success(`Campaign sent to ${data.data.sent} customers!`);
      emailAPI.getCampaigns().then(r => setCampaigns(r.data.data));
      setModal(null); setCampaignForm({ subject: '', body: '', template_id: '', customer_ids: [] });
    } catch (err) { toast.error(err.response?.data?.message || 'Send failed.'); }
    finally { setSending(false); }
  };

  const openEdit = (t) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, trigger_days: t.trigger_days || '' });
    setEditId(t.id); setModal('template');
  };

  const loadTemplate = (id) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl) setCampaignForm(p => ({ ...p, template_id: id, subject: tpl.subject, body: tpl.body }));
  };

  return (
    <AdminLayout title="Email Marketing">
      <div className="flex gap-3 border-b border-salon-border mb-6">
        {['templates', 'campaigns', 'send'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-sans tracking-widest uppercase border-b-2 -mb-px transition-all capitalize ${tab === t ? 'border-gold-500 text-gold-500' : 'border-transparent text-salon-muted hover:text-salon-white'}`}>
            {t === 'send' ? 'Send Campaign' : t}
          </button>
        ))}
      </div>

      {/* Templates */}
      {tab === 'templates' && (
        <>
          <div className="flex justify-end mb-5">
            <button onClick={() => { setForm(BLANK_TEMPLATE); setEditId(null); setModal('template'); }} className="btn-gold text-xs px-5 py-2.5 flex items-center gap-2"><Plus size={13} /> New Template</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-40 shimmer rounded-sm" />) :
              templates.map(t => (
                <div key={t.id} className="admin-card">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-sans text-sm font-semibold text-salon-white flex-1 pr-2">{t.name}</h3>
                    <button onClick={() => openEdit(t)} className="text-salon-muted hover:text-gold-500 p-0.5"><Pencil size={12} /></button>
                  </div>
                  <p className="text-gold-500 text-xs font-body mb-2">{t.subject}</p>
                  <p className="text-salon-muted text-xs font-body line-clamp-3">{t.body}</p>
                  {t.trigger_days && <div className="mt-3 pt-3 border-t border-salon-border"><span className="badge badge-gold text-[10px]">Auto-send at {t.trigger_days} days</span></div>}
                </div>
              ))}
          </div>
        </>
      )}

      {/* Campaigns History */}
      {tab === 'campaigns' && (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead><tr className="border-b border-salon-border">{['Subject', 'Sent', 'Recipients', 'Date'].map(h => <th key={h} className="text-left px-4 py-3 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i} className="border-b border-salon-border/50">{[...Array(4)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>)}</tr>) :
                campaigns.map(c => (
                  <tr key={c.id} className="border-b border-salon-border/50">
                    <td className="table-cell text-xs font-sans font-semibold text-salon-white truncate max-w-[220px]">{c.subject}</td>
                    <td className="table-cell"><span className="badge-green">{c.sent_count}</span></td>
                    <td className="table-cell text-xs text-salon-muted">{c.recipients_count} targeted</td>
                    <td className="table-cell text-xs text-salon-muted">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && campaigns.length === 0 && <p className="text-center text-salon-muted text-sm py-8">No campaigns sent yet.</p>}
        </div>
      )}

      {/* Send Campaign */}
      {tab === 'send' && (
        <div className="max-w-2xl">
          <div className="admin-card">
            <h3 className="font-display text-xl text-salon-white mb-5">Send Email Campaign</h3>
            <form onSubmit={handleSendCampaign} className="space-y-4">
              <div>
                <label className="label-gold">Load Template (optional)</label>
                <select value={campaignForm.template_id} onChange={e => { setCampaignForm(p => ({ ...p, template_id: e.target.value })); loadTemplate(e.target.value); }} className="input-dark">
                  <option value="">Start fresh</option>
                  {templates.map(t => <option key={t.id} value={t.id} className="bg-salon-dark">{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-gold">Subject Line *</label>
                <input value={campaignForm.subject} onChange={e => setCampaignForm(p => ({ ...p, subject: e.target.value }))} className="input-dark" placeholder="e.g. Exclusive offer for you, {{name}}!" required />
              </div>
              <div>
                <label className="label-gold">Email Body *</label>
                <textarea value={campaignForm.body} onChange={e => setCampaignForm(p => ({ ...p, body: e.target.value }))} className="input-dark resize-none font-mono text-xs" rows={8} placeholder="Write your email content here. Use {{name}} for personalization." required />
                <p className="text-salon-muted text-[10px] font-sans mt-1">Use {"{{name}}"} for personalization. HTML is supported.</p>
              </div>
              <div>
                <label className="label-gold">Recipients</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="recipients" value="all" defaultChecked onChange={() => setCampaignForm(p => ({ ...p, customer_ids: [] }))} className="accent-gold-500" />
                    <span className="text-salon-muted text-xs font-sans">All Customers ({customers.length})</span>
                  </label>
                </div>
              </div>
              <div className="bg-salon-dark border border-salon-border p-4 flex items-center gap-3">
                <Mail size={16} className="text-gold-500 shrink-0" />
                <p className="text-salon-muted text-xs font-body">This campaign will be sent to <span className="text-gold-500">{customers.filter(c => c.email).length}</span> customers with valid email addresses.</p>
              </div>
              <button type="submit" disabled={sending} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {sending ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : <Send size={14} />}
                {sending ? 'Sending Campaign...' : 'Send Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {modal === 'template' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-salon-card border border-salon-border w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">{editId ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setModal(null)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              <div><label className="label-gold">Template Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-dark" required /></div>
              <div><label className="label-gold">Subject</label><input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-dark" required /></div>
              <div><label className="label-gold">Body</label><textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className="input-dark resize-none text-xs font-mono" rows={6} required /></div>
              <div><label className="label-gold">Auto-trigger after days (optional)</label><input type="number" value={form.trigger_days} onChange={e => setForm(p => ({ ...p, trigger_days: e.target.value }))} className="input-dark" placeholder="e.g. 30, 60, 90" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60">{saving ? 'Saving...' : 'Save Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
