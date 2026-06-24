import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, UserPlus, Repeat, UserMinus, Crown,
  X, Phone, Mail, Calendar, AlertTriangle, Search,
  MessageCircle, Send, Clock, ChevronDown, ChevronUp,
  Edit3, Zap, CheckCircle
} from 'lucide-react';
import { customersAPI, whatsappAPI, billingAPI } from '../../../services/api';
import toast from 'react-hot-toast';


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-white/50 text-[10px] font-sans uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/40 font-sans">{p.name}:</span>
          <span className="text-white font-semibold font-sans">{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Promo message templates ───────────────────────────────────────────────────
const PROMO_TEMPLATES = [
  {
    label: 'We Miss You 💇',
    message: (name) =>
      `Hi ${name}! 👋 We've missed you at *TONI & GUY ESSENSUALS, Kondapur*! 💇‍♀️✨\n\nIt's been a while since your last visit and we'd love to welcome you back.\n\n🎁 As a *special returning client offer*, enjoy *15% OFF* your next appointment!\n\nBook now: Reply to this message or call us directly. We look forward to seeing you! 😊`,
  },
  {
    label: 'Exclusive Offer 🎁',
    message: (name) =>
      `Hello ${name}! 🌟\n\nWe have an *exclusive offer* just for you at *TONI & GUY ESSENSUALS, Kondapur*!\n\n✂️ Get a *complimentary hair spa* with any service above ₹1000.\n\n📅 Valid this week only. Call us or walk-in to avail this offer!\n\nWe can't wait to pamper you again! 💆‍♀️`,
  },
  {
    label: 'New Services 💅',
    message: (name) =>
      `Hi ${name}! 👋\n\nExciting news from *TONI & GUY ESSENSUALS, Kondapur*! 🎉\n\nWe've added amazing *new treatments & services* you'll love:\n💇 Keratin Smoothing\n✨ Scalp Treatment\n💅 Nail Art & Extensions\n\nBook your appointment and be among the first to try them!\n\nSee you soon! 🌸`,
  },
];

const MEMBER_PROMO_TEMPLATES = [
  {
    label: 'Exclusive Member Offer 🎁',
    message: (name) =>
      `Hi ${name}! 👑\n\nAs a valued member of *TONI & GUY ESSENSUALS, Kondapur*, we have an exclusive treat just for you!\n\n🎁 Enjoy a *complimentary add-on service* with your next appointment this month.\n\nBook now to claim your member benefit! We can't wait to pamper you. 💆‍♀️✨`,
  },
  {
    label: 'Membership Renewal 👑',
    message: (name) =>
      `Hello ${name}! 👋\n\nA quick reminder from *TONI & GUY ESSENSUALS, Kondapur* that your premium membership is up for renewal soon! ⏳\n\nRenew today and lock in your exclusive discounts and priority bookings for another year.\n\nReply to this message or call us to renew. See you soon! 🌸`,
  },
  {
    label: 'Special Event Invite 🎉',
    message: (name) =>
      `Hi ${name}! 🎉\n\nYou're invited to an exclusive VIP Member Event at *TONI & GUY ESSENSUALS, Kondapur*!\n\nJoin us for an evening of luxury styling, expert consultations, and complimentary refreshments. 🥂💅\n\nPlease RSVP by replying to this message. We hope to see you there! ✨`,
  },
];

// ── Lost Clients Modal ────────────────────────────────────────────────────────
function LostClientsModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);

  // Per-client state: { [clientId]: { templateIdx, editedMsg, isSent } }
  const [clientMsgs, setClientMsgs] = useState({});

  // Broadcast state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState(PROMO_TEMPLATES[0].message('{{name}}'));
  const [broadcastSent, setBroadcastSent] = useState([]);
  const [broadcastProgress, setBroadcastProgress] = useState(false);
  const broadcastRef = useRef(false);

  useEffect(() => {
    customersAPI.getAll({ lost: true, limit: 200 })
      .then(res => {
        const data = res?.data?.data || [];
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  // When broadcast template changes, update the broadcast message
  useEffect(() => {
    setBroadcastMsg(PROMO_TEMPLATES[broadcastTemplate].message('{{name}}'));
  }, [broadcastTemplate]);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    const cleanSearchPhone = s.replace(/\D/g, '');
    const cleanClientPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
    return c.name?.toLowerCase().includes(s) ||
           c.email?.toLowerCase().includes(s) ||
           (cleanSearchPhone && cleanClientPhone.includes(cleanSearchPhone)) ||
           c.phone?.includes(search);
  });

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Get or init client message state
  const getClientState = (clientId, clientName) => {
    if (clientMsgs[clientId]) return clientMsgs[clientId];
    return {
      templateIdx: 0,
      editedMsg: PROMO_TEMPLATES[0].message(clientName || 'there'),
      isSent: false,
    };
  };

  const setClientState = (clientId, updates) => {
    setClientMsgs(prev => ({
      ...prev,
      [clientId]: { ...getClientState(clientId, ''), ...prev[clientId], ...updates },
    }));
  };

  const handleTemplateChange = (clientId, clientName, idx) => {
    setClientState(clientId, {
      templateIdx: idx,
      editedMsg: PROMO_TEMPLATES[idx].message(clientName || 'there'),
    });
  };

  const sendWhatsAppToClient = (client) => {
    const id = client.id;
    const state = getClientState(id, client.name);
    const phone = client.phone?.replace(/\D/g, '').slice(-10);
    if (!phone) return;

    const encoded = encodeURIComponent(state.editedMsg);
    window.location.href = `whatsapp://send?phone=91${phone}&text=${encoded}`;
    setClientState(id, { isSent: true });
  };

  // Broadcast: sequential WhatsApp Desktop sharing with 1.5s delay
  const sendToAll = async () => {
    broadcastRef.current = true;
    setBroadcastProgress(true);
    setBroadcastSent([]);

    const withPhones = filtered.filter(c => c.phone);

    if (withPhones.length === 0) {
      toast.error('No customers with phone numbers selected.');
      setBroadcastProgress(false);
      broadcastRef.current = false;
      return;
    }

    toast.loading(`Opening WhatsApp Desktop for ${withPhones.length} clients...`, { id: 'wa-broadcast' });

    for (let i = 0; i < withPhones.length; i++) {
      if (!broadcastRef.current) break;

      const client = withPhones[i];
      const personalizedMsg = broadcastMsg.replace(/\{\{name\}\}/g, client.name || 'there');
      const phone = client.phone.replace(/\D/g, '').slice(-10);
      const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(personalizedMsg)}`;

      window.location.href = url;
      setBroadcastSent(prev => [...prev, client.id]);

      if (i < withPhones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    toast.success(`Opened all ${withPhones.length} chats in browser tabs!`, { id: 'wa-broadcast', duration: 4000 });
    setBroadcastProgress(false);
    broadcastRef.current = false;
  };

  const toggleExpand = (id) => {
    setExpandedClient(prev => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">Lost Clients</h3>
              <p className="text-white/30 text-[11px] font-sans mt-0.5">No visit in 90+ days — send promotions individually or to all</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* ── BROADCAST TO ALL SECTION ── */}
        <div className="mx-5 mt-4 mb-1 bg-[#25D366]/5 border border-[#25D366]/25 rounded-xl overflow-hidden shrink-0">
          {/* Always-visible header — click to expand/collapse */}
          <button
            onClick={() => setBroadcastOpen(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/15 transition-colors border-b border-[#25D366]/15"
          >
            <Zap size={13} className="text-[#25D366]" />
            <p className="text-[11px] text-[#25D366] font-sans font-bold tracking-wide flex-1 text-left">BROADCAST TO ALL LOST CLIENTS</p>
            <span className="text-[9px] text-white/30 font-sans mr-2">
              {filtered.filter(c => c.phone).length} with phone numbers
            </span>
            <div className={`text-[#25D366]/70 transition-transform duration-200 ${broadcastOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={14} />
            </div>
          </button>

          {/* Expandable content */}
          {broadcastOpen && (
            <div className="p-4 space-y-3">
              {/* Template tabs */}
              <div>
                <p className="text-[10px] text-white/25 font-sans uppercase tracking-widest mb-2">Choose Template</p>
                <div className="grid grid-cols-3 gap-2">
                  {PROMO_TEMPLATES.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBroadcastTemplate(idx)}
                      className={`text-[10px] font-sans px-2 py-1.5 rounded-lg border transition-colors text-left ${
                        broadcastTemplate === idx
                          ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366]'
                          : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable broadcast message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-white/25 font-sans uppercase tracking-widest">Message (use {'{{name}}'} for client name)</p>
                  <div className="flex items-center gap-1 text-[#25D366]/60">
                    <Edit3 size={9} />
                    <span className="text-[9px] font-sans">Editable</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#25D366]/40 rounded-lg px-3 py-2.5 text-[11px] text-white/60 font-body placeholder-white/20 focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Broadcast progress */}
              {broadcastSent.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-[#25D366] font-sans">
                  <CheckCircle size={11} />
                  Sent to {broadcastSent.length} of {filtered.filter(c => c.phone).length} clients
                </div>
              )}

              {/* Send All button */}
              <button
                onClick={sendToAll}
                disabled={broadcastProgress || filtered.filter(c => c.phone).length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#20bc5a] disabled:opacity-50 disabled:cursor-not-allowed text-black text-[12px] font-sans font-bold rounded-lg transition-colors"
              >
                {broadcastProgress ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending... ({broadcastSent.length}/{filtered.filter(c => c.phone).length})
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Send to All {filtered.filter(c => c.phone).length} Clients on WhatsApp
                  </>
                )}
              </button>

              {/* Minimize button at bottom */}
              <button
                onClick={() => setBroadcastOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-white/25 hover:text-white/50 font-sans transition-colors border border-white/[0.06] rounded-lg hover:border-white/15"
              >
                <ChevronUp size={11} /> Minimize
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0 mt-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-4 py-2 text-[12px] text-white/60 font-sans placeholder-white/20 focus:outline-none focus:border-red-500/30"
            />
          </div>
        </div>

        {/* ── CLIENT LIST ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-white/30">
              <div className="w-5 h-5 border-2 border-white/10 border-t-red-400 rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading lost clients...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <UserMinus size={36} className="text-white/10" />
              <p className="text-white/30 text-sm font-sans">
                {search ? 'No matching clients found' : 'No lost clients found'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const cid = client.id || i;
            const state = getClientState(cid, client.name);
            const days = daysSince(client.last_appointment_date);
            const lastVisitFormatted = formatDate(client.last_appointment_date);
            const urgency = days === null ? 'never' : days > 180 ? 'critical' : 'warning';
            const isExpanded = expandedClient === cid;
            const isSentToAll = broadcastSent.includes(cid);

            return (
              <div key={cid} className="transition-colors">

                {/* Client Row */}
                <div
                  className="px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => toggleExpand(cid)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSentToAll ? 'bg-[#25D366]/15 border-[#25D366]/30' : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      <span className={`text-[12px] font-bold font-sans ${isSentToAll ? 'text-[#25D366]' : 'text-red-400'}`}>
                        {isSentToAll ? '✓' : (client.name?.[0]?.toUpperCase() || '?')}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 font-sans font-semibold truncate">{client.name || 'Unknown'}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Phone size={9} /> {client.phone}
                          </span>
                        )}
                        {client.email && !client.email.includes('walkin_') && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Mail size={9} /> {client.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {lastVisitFormatted ? (
                          <>
                            <span className="flex items-center gap-1 text-[10px] text-white/30 font-sans">
                              <Calendar size={9} /> Last appt: <span className="text-white/50 font-medium">{lastVisitFormatted}</span>
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-sans font-semibold ${urgency === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                              <Clock size={9} /> {days}d ago
                            </span>
                            {client.last_service_name && (
                              <span className="text-[10px] text-white/25 font-sans">· {client.last_service_name}</span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-white/25 font-sans">
                            <Calendar size={9} /> No completed appointments
                          </span>
                        )}
                        {client.completed_appointments > 0 && (
                          <span className="text-[10px] text-white/25 font-sans">
                            · {client.completed_appointments} visit{client.completed_appointments !== 1 ? 's' : ''}
                            {client.total_spent > 0 ? ` · ₹${Number(client.total_spent).toLocaleString('en-IN')}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: badge + chevron */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-sans font-medium border ${
                        urgency === 'never' ? 'bg-gray-500/10 text-white/30 border-white/10'
                        : urgency === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/25'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {days === null ? 'Never' : days > 180 ? '⚠ Critical' : `${days}d lost`}
                      </div>
                      <div className="text-white/20">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Expanded individual promo panel ── */}
                {isExpanded && (
                  <div className="mx-5 mb-4 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 border-b border-[#25D366]/15">
                      <MessageCircle size={13} className="text-[#25D366]" />
                      <p className="text-[11px] text-[#25D366] font-sans font-semibold">Send WhatsApp to {client.name}</p>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Template tabs */}
                      <div className="grid grid-cols-3 gap-2">
                        {PROMO_TEMPLATES.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleTemplateChange(cid, client.name, idx)}
                            className={`text-[10px] font-sans px-2 py-1.5 rounded-lg border transition-colors text-left ${
                              state.templateIdx === idx
                                ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366]'
                                : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Editable message box */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] text-white/25 font-sans uppercase tracking-widest">Message — type to edit</p>
                          <div className="flex items-center gap-1 text-[#25D366]/60">
                            <Edit3 size={9} />
                            <span className="text-[9px] font-sans">Editable</span>
                          </div>
                        </div>
                        <textarea
                          rows={5}
                          value={state.editedMsg}
                          onChange={e => setClientState(cid, { editedMsg: e.target.value })}
                          className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#25D366]/40 rounded-lg px-3 py-2.5 text-[11px] text-white/60 font-body placeholder-white/20 focus:outline-none resize-none transition-colors"
                        />
                      </div>

                      {/* Send button */}
                      <button
                        onClick={() => sendWhatsAppToClient(client)}
                        disabled={!client.phone}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-sans font-bold rounded-lg transition-colors ${
                          state.isSent
                            ? 'bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366]'
                            : 'bg-[#25D366] hover:bg-[#20bc5a] text-black'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {state.isSent ? (
                          <><CheckCircle size={13} /> Sent!</>
                        ) : (
                          <><Send size={13} /> {client.phone ? `Send on WhatsApp (${client.phone})` : 'No phone number'}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/25 font-sans text-center">
              {filtered.length} lost clients · {filtered.filter(c => c.phone).length} reachable via WhatsApp
              {broadcastSent.length > 0 && <> · <span className="text-[#25D366]">✓ {broadcastSent.length} broadcast sent</span></>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Clients Modal ────────────────────────────────────────────────────────
function NewClientsModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [clientMsgs, setClientMsgs] = useState({});

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState(PROMO_TEMPLATES[0].message('{{name}}'));
  const [broadcastSent, setBroadcastSent] = useState([]);
  const [broadcastProgress, setBroadcastProgress] = useState(false);
  const broadcastRef = useRef(false);

  const getClientState = (billId, clientName) => {
    if (clientMsgs[billId]) return clientMsgs[billId];
    return {
      templateIdx: 0,
      editedMsg: PROMO_TEMPLATES[0].message(clientName || 'there'),
      isSent: false,
    };
  };

  const setClientState = (billId, updates) => {
    setClientMsgs(prev => ({
      ...prev,
      [billId]: { ...getClientState(billId, ''), ...prev[billId], ...updates },
    }));
  };

  const handleTemplateChange = (billId, clientName, idx) => {
    setClientState(billId, {
      templateIdx: idx,
      editedMsg: PROMO_TEMPLATES[idx].message(clientName || 'there'),
    });
  };

  const sendWhatsAppToClient = (client, billId) => {
    const state = getClientState(billId, client.customer_name);
    const phone = client.customer_phone?.replace(/\D/g, '').slice(-10);
    if (!phone || phone.length !== 10) {
      toast.error('Invalid phone number format');
      return;
    }
    const cleanPhone = `91${phone}`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(state.editedMsg)}`;
    window.location.href = url;
    setClientState(billId, { isSent: true });
    toast.success(`Redirected to WhatsApp chat for ${client.customer_name || 'Client'}`);
  };

  const handleBroadcast = async () => {
    const reachable = filtered.filter(c => c.customer_phone && c.customer_phone.replace(/\D/g, '').length >= 10);
    if (reachable.length === 0) {
      toast.error('No reachable clients in this list');
      return;
    }
    setBroadcastProgress(true);
    broadcastRef.current = true;
    
    for (let i = 0; i < reachable.length; i++) {
      if (!broadcastRef.current) break;
      const client = reachable[i];
      const phone = client.customer_phone.replace(/\D/g, '').slice(-10);
      const text = broadcastMsg.replace(/\{\{name\}\}/gi, client.customer_name || 'Customer');
      
      try {
        await whatsappAPI.getSettings(); // test API connection
        const cleanPhone = `91${phone}`;
        const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setBroadcastSent(prev => [...prev, client.id]);
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch {
        break;
      }
    }
    setBroadcastProgress(false);
    toast.success('Broadcast batch processed!');
  };

  const handleExpand = async (id, customerId) => {
    if (expandedClient === id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(id);
    if (customerId && !clientDetails[id]) {
      setLoadingDetails(prev => ({ ...prev, [id]: true }));
      try {
        const res = await customersAPI.getById(customerId);
        setClientDetails(prev => ({ ...prev, [id]: res.data.data }));
      } catch (error) {
        console.error('Failed to fetch client details', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  useEffect(() => {
    setBroadcastMsg(PROMO_TEMPLATES[broadcastTemplate].message('{{name}}'));
  }, [broadcastTemplate]);

  useEffect(() => {
    billingAPI.getAll({ new_only: 'true', status: 'paid', limit: 500, exclude_walkins: 'true' })
      .then(res => {
        const data = res?.data?.data || [];
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    const cleanSearchPhone = s.replace(/\D/g, '');
    const cleanClientPhone = c.customer_phone ? c.customer_phone.replace(/\D/g, '') : '';
    return (c.customer_name || '').toLowerCase().includes(s) ||
           (c.invoice_number || '').toLowerCase().includes(s) ||
           (cleanSearchPhone && cleanClientPhone.includes(cleanSearchPhone)) ||
           (c.customer_phone && c.customer_phone.includes(search));
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <UserPlus size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">New Clients</h3>
              <p className="text-white/30 text-[11px] font-sans mt-0.5">Visits from first-time clients</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Broadcast Setup Banner */}
        {broadcastOpen ? (
          <div className="p-4 mx-5 mt-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-3 shrink-0 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-emerald-400 font-sans tracking-wide uppercase font-semibold">Bulk Promo Campaign (New Clients)</span>
              <button onClick={() => { setBroadcastOpen(false); broadcastRef.current = false; }} className="text-white/40 hover:text-white text-[10px] font-sans uppercase">Cancel</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PROMO_TEMPLATES.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setBroadcastTemplate(idx)}
                  className={`px-2 py-1.5 text-[9px] font-sans font-semibold border transition-all uppercase rounded-lg ${
                    broadcastTemplate === idx
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'border-white/10 text-white/50 bg-white/[0.03] hover:border-emerald-500/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              rows={3}
              className="w-full bg-black/60 border border-white/10 rounded-lg text-xs p-2 text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-white/40 font-sans">{filtered.filter(c => c.customer_phone).length} reachable visits</span>
              <button
                onClick={handleBroadcast}
                disabled={broadcastProgress}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {broadcastProgress ? 'Sending batch...' : 'Execute Campaign'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-4 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-white/40 font-sans font-medium uppercase tracking-wider">Visits History</span>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-1 rounded-lg text-[9px] font-sans font-bold uppercase tracking-wider transition-all"
            >
              Broadcast Campaign ({filtered.filter(c => c.customer_phone).length})
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search by name, phone, invoice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-4 py-2 text-[12px] text-white/60 font-sans placeholder-white/20 focus:outline-none focus:border-emerald-500/30"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-white/30">
              <div className="w-5 h-5 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading new clients...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <UserPlus size={36} className="text-white/10" />
              <p className="text-white/30 text-sm font-sans">
                {search ? 'No matching visits found' : 'No new visits found'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const cid = client.id || i;
            const state = getClientState(cid, client.customer_name);
            const isSentToAll = broadcastSent.includes(cid);

            return (
              <div key={cid} className="transition-colors">
                <div 
                  className="px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleExpand(cid, client.customer_id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSentToAll ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      <span className="text-[12px] font-bold font-sans">
                        {isSentToAll ? '✓' : (client.customer_name?.[0] || 'W').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-white/85 font-sans font-semibold truncate">{client.customer_name}</p>
                        <span className="text-emerald-400 font-sans text-[12px] font-bold shrink-0">₹{parseFloat(client.total_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.customer_phone && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Phone size={9} /> {client.customer_phone}
                          </span>
                        )}
                        {client.customer_email && !client.customer_email.includes('walkin_') && !client.customer_email.includes('@luxesalon.local') && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Mail size={9} /> {client.customer_email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-white/30 font-sans">
                          <Calendar size={9} /> Visited: <span className="text-white/50 font-medium">{formatDate(client.created_at)}</span>
                        </span>
                        {(client.total_visit_count > 0 || client.customer_id) && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                            {client.total_visit_count || 1} visit{(client.total_visit_count || 1) !== 1 ? 's' : ''}
                          </span>
                        )}
                        {client.invoice_number && (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              const backendOrigin = import.meta.env.VITE_API_URL 
                                ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
                                : 'http://localhost:5000';
                              window.open(`${backendOrigin}/invoices/${client.id}.pdf`, '_blank');
                            }}
                            className="flex items-center gap-1 text-[10px] text-emerald-400/50 hover:text-emerald-300 hover:underline cursor-pointer font-sans transition-colors"
                          >
                            #{client.invoice_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-white/20 shrink-0 mt-0.5">
                      {expandedClient === cid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {expandedClient === cid && (
                  <div className="mx-5 mb-4 bg-white/[0.01] border border-white/[0.05] rounded-xl overflow-hidden p-4 space-y-4">
                    {/* Billed services list */}
                    <div>
                      <h4 className="text-[11px] font-sans font-semibold text-white/60 mb-2.5 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle size={12} className="text-emerald-400/50" /> Billed Services
                      </h4>
                      {loadingDetails[cid] ? (
                        <div className="flex items-center gap-2 text-white/30 text-[11px] font-sans">
                          <div className="w-3 h-3 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
                          Fetching services...
                        </div>
                      ) : clientDetails[cid]?.billedServices?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {clientDetails[cid].billedServices.map((service, idx) => (
                            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 flex items-center justify-between">
                              <span className="text-[11px] text-white/70 font-sans truncate pr-2" title={service.name}>{service.name}</span>
                              <span className="text-[10px] font-sans font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">x{service.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/30 font-sans flex items-center gap-2 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
                          <AlertTriangle size={12} className="text-white/20" />
                          No billed services details found.
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Promotional Composer (if phone number is available) */}
                    {client.customer_phone && (
                      <div className="pt-3 border-t border-white/[0.04] space-y-3">
                        <h4 className="text-[11px] font-sans font-semibold text-[#25D366] uppercase tracking-wider flex items-center gap-2">
                          <MessageCircle size={12} /> Send Promo Offer
                        </h4>
                        
                        {/* Template tabs */}
                        <div className="grid grid-cols-3 gap-2">
                          {PROMO_TEMPLATES.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleTemplateChange(cid, client.customer_name, idx)}
                              className={`text-[10px] font-sans px-2 py-1.5 rounded-lg border transition-colors text-left ${
                                state.templateIdx === idx
                                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366] font-bold'
                                  : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Text composer */}
                        <textarea
                          rows={4}
                          value={state.editedMsg}
                          onChange={e => setClientState(cid, { editedMsg: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 focus:border-[#25D366]/40 rounded-lg p-2.5 text-xs text-white font-sans resize-none"
                        />

                        {/* Send button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => sendWhatsAppToClient(client, cid)}
                            className="bg-[#25D366] hover:bg-[#20bc5a] text-black font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Send size={10} />
                            {state.isSent ? 'Resend on WhatsApp' : 'Send Promo on WhatsApp'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/25 font-sans text-center">
              {filtered.length} visit{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Total Clients Modal ───────────────────────────────────────────────────────
function TotalClientsModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  const handleExpand = async (id, customerId) => {
    if (expandedClient === id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(id);
    if (customerId && !clientDetails[id]) {
      setLoadingDetails(prev => ({ ...prev, [id]: true }));
      try {
        const res = await customersAPI.getById(customerId);
        setClientDetails(prev => ({ ...prev, [id]: res.data.data }));
      } catch (error) {
        console.error('Failed to fetch client details', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  useEffect(() => {
    billingAPI.getAll({ status: 'paid', limit: 500, exclude_walkins: 'true' })
      .then(res => {
        const data = res?.data?.data || [];
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    const cleanSearchPhone = s.replace(/\D/g, '');
    const cleanClientPhone = c.customer_phone ? c.customer_phone.replace(/\D/g, '') : '';
    return (c.customer_name || '').toLowerCase().includes(s) ||
           (c.invoice_number || '').toLowerCase().includes(s) ||
           (cleanSearchPhone && cleanClientPhone.includes(cleanSearchPhone)) ||
           (c.customer_phone && c.customer_phone.includes(search));
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const uniqueClientsCount = new Set(filtered.filter(c => c.customer_id).map(c => c.customer_id)).size;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users size={18} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">Total Clients & Visits</h3>
              <p className="text-white/30 text-[11px] font-sans mt-0.5">All visits from registered salon clients</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search by name, phone or invoice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-4 py-2 text-[12px] text-white/60 font-sans placeholder-white/20 focus:outline-none focus:border-blue-500/30"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-white/30">
              <div className="w-5 h-5 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading visits...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Users size={36} className="text-white/10" />
              <p className="text-white/30 text-sm font-sans">
                {search ? 'No matching visits found' : 'No visits found'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const cid = client.id || i;
            return (
              <div key={cid} className="transition-colors">
                <div 
                  className="px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleExpand(cid, client.customer_id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 bg-blue-500/10 border-blue-500/20 text-blue-400">
                      <span className="text-[12px] font-bold font-sans">
                        {(client.customer_name?.[0] || 'W').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-white/85 font-sans font-semibold truncate">{client.customer_name || 'Walk-In Customer'}</p>
                        <span className="text-blue-400 font-sans text-[12px] font-bold shrink-0">₹{parseFloat(client.total_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.customer_phone && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Phone size={9} /> {client.customer_phone}
                          </span>
                        )}
                        {client.customer_email && !client.customer_email.includes('walkin_') && !client.customer_email.includes('@luxesalon.local') && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Mail size={9} /> {client.customer_email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-white/30 font-sans">
                          <Calendar size={9} /> Visited: <span className="text-white/50 font-medium">{formatDate(client.created_at)}</span>
                        </span>

                        {client.invoice_number && (
                          <span className="text-blue-400 font-sans text-[10px] font-medium bg-blue-500/10 px-2 py-0.5 rounded">
                            #{client.invoice_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-white/20 shrink-0 mt-0.5">
                      {expandedClient === cid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Billed Services */}
                {expandedClient === cid && (
                  <div className="mx-5 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden p-4">
                    <h4 className="text-[11px] font-sans font-semibold text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle size={12} className="text-blue-400/50" /> Billed Services History
                    </h4>
                    {loadingDetails[cid] ? (
                      <div className="flex items-center gap-2 text-white/30 text-[11px] font-sans">
                        <div className="w-3 h-3 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
                        Fetching history...
                      </div>
                    ) : clientDetails[cid]?.billedServices?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {clientDetails[cid].billedServices.map((service, idx) => (
                          <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 flex items-center justify-between">
                            <span className="text-[11px] text-white/70 font-sans truncate pr-2" title={service.name}>{service.name}</span>
                            <span className="text-[10px] font-sans font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">x{service.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/30 font-sans flex items-center gap-2 bg-white/[0.02] p-3 rounded-lg border border-white/[0.05]">
                        <AlertTriangle size={12} className="text-white/20" />
                        No billed services found for this client yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[11px] text-white/40 font-sans text-center flex justify-center items-center gap-2">
              <span className="font-semibold text-white/70">{uniqueClientsCount} Unique Clients</span>
              <span className="w-1 h-1 bg-white/20 rounded-full"></span>
              <span className="font-semibold text-white/70">{filtered.length} Total Bills Generated</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Membership Holders Modal ──────────────────────────────────────────────────
function MembershipHoldersModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [clientMsgs, setClientMsgs] = useState({});

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState(MEMBER_PROMO_TEMPLATES[0].message('{{name}}'));
  const [broadcastSent, setBroadcastSent] = useState([]);
  const [broadcastProgress, setBroadcastProgress] = useState(false);
  const broadcastRef = useRef(false);

  const getClientState = (billId, clientName) => {
    if (clientMsgs[billId]) return clientMsgs[billId];
    return {
      templateIdx: 0,
      editedMsg: MEMBER_PROMO_TEMPLATES[0].message(clientName || 'there'),
      isSent: false,
    };
  };

  const setClientState = (billId, updates) => {
    setClientMsgs(prev => ({
      ...prev,
      [billId]: { ...getClientState(billId, ''), ...prev[billId], ...updates },
    }));
  };

  const handleTemplateChange = (billId, clientName, idx) => {
    setClientState(billId, {
      templateIdx: idx,
      editedMsg: MEMBER_PROMO_TEMPLATES[idx].message(clientName || 'there'),
    });
  };

  const sendWhatsAppToClient = (client, billId) => {
    const state = getClientState(billId, client.name);
    const phone = client.phone?.replace(/\D/g, '').slice(-10);
    if (!phone || phone.length !== 10) {
      toast.error('Invalid phone number format');
      return;
    }
    const cleanPhone = `91${phone}`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(state.editedMsg)}`;
    window.location.href = url;
    setClientState(billId, { isSent: true });
    toast.success(`Redirected to WhatsApp chat for ${client.name || 'Client'}`);
  };

  const handleBroadcast = async () => {
    const reachable = filtered.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    if (reachable.length === 0) {
      toast.error('No reachable clients in this list');
      return;
    }
    setBroadcastProgress(true);
    broadcastRef.current = true;
    
    for (let i = 0; i < reachable.length; i++) {
      if (!broadcastRef.current) break;
      const client = reachable[i];
      const phone = client.phone.replace(/\D/g, '').slice(-10);
      const text = broadcastMsg.replace(/\{\{name\}\}/gi, client.name || 'Customer');
      
      try {
        await whatsappAPI.getSettings(); // test API connection
        const cleanPhone = `91${phone}`;
        const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setBroadcastSent(prev => [...prev, client.id]);
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch {
        break;
      }
    }
    setBroadcastProgress(false);
    toast.success('Broadcast batch processed!');
  };

  const handleExpand = async (id, customerId) => {
    if (expandedClient === id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(id);
    if (customerId && !clientDetails[id]) {
      setLoadingDetails(prev => ({ ...prev, [id]: true }));
      try {
        const res = await customersAPI.getById(customerId);
        setClientDetails(prev => ({ ...prev, [id]: res.data.data }));
      } catch (error) {
        console.error('Failed to fetch client details', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  useEffect(() => {
    setBroadcastMsg(MEMBER_PROMO_TEMPLATES[broadcastTemplate].message('{{name}}'));
  }, [broadcastTemplate]);

  useEffect(() => {
    customersAPI.getAll({ membership: 'yes', limit: 500 })
      .then(res => {
        const data = res?.data?.data || [];
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    const cleanSearchPhone = s.replace(/\D/g, '');
    const cleanClientPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
    return (c.name || '').toLowerCase().includes(s) ||
           (c.email || '').toLowerCase().includes(s) ||
           (cleanSearchPhone && cleanClientPhone.includes(cleanSearchPhone)) ||
           (c.phone && c.phone.includes(search));
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Crown size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">Membership Holders</h3>
              <p className="text-white/30 text-[11px] font-sans mt-0.5">Visits from registered members</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Broadcast Setup Banner */}
        {broadcastOpen ? (
          <div className="p-4 mx-5 mt-4 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-3 shrink-0 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-purple-400 font-sans tracking-wide uppercase font-semibold">Bulk Promo Campaign (Members)</span>
              <button onClick={() => { setBroadcastOpen(false); broadcastRef.current = false; }} className="text-white/40 hover:text-white text-[10px] font-sans uppercase">Cancel</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MEMBER_PROMO_TEMPLATES.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setBroadcastTemplate(idx)}
                  className={`px-2 py-1.5 text-[9px] font-sans font-semibold border transition-all uppercase rounded-lg ${
                    broadcastTemplate === idx
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'border-white/10 text-white/50 bg-white/[0.03] hover:border-purple-500/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              rows={3}
              className="w-full bg-black/60 border border-white/10 rounded-lg text-xs p-2 text-white font-sans focus:outline-none focus:border-purple-500/50 resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-white/40 font-sans">{filtered.filter(c => c.phone).length} reachable clients</span>
              <button
                onClick={handleBroadcast}
                disabled={broadcastProgress}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {broadcastProgress ? 'Sending batch...' : 'Execute Campaign'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-4 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-white/40 font-sans font-medium uppercase tracking-wider">Clients History</span>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-1 rounded-lg text-[9px] font-sans font-bold uppercase tracking-wider transition-all"
            >
              Broadcast Campaign ({filtered.filter(c => c.phone).length})
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-4 py-2 text-[12px] text-white/60 font-sans placeholder-white/20 focus:outline-none focus:border-purple-500/30"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-white/30">
              <div className="w-5 h-5 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading members...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Crown size={36} className="text-white/10" />
              <p className="text-white/30 text-sm font-sans">
                {search ? 'No matching clients found' : 'No members found'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const cid = client.id || i;
            const state = getClientState(cid, client.name);
            const isSentToAll = broadcastSent.includes(cid);

            return (
              <div key={cid} className="transition-colors">
                <div 
                  className="px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleExpand(cid, client.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSentToAll ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                    }`}>
                      <span className="text-[12px] font-bold font-sans">
                        {isSentToAll ? '✓' : (client.name?.[0] || 'W').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-white/85 font-sans font-semibold truncate">{client.name || 'Walk-In Customer'}</p>
                        <span className="text-gold-400 font-sans text-[12px] font-bold shrink-0">₹{parseFloat(client.total_spent || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Phone size={9} /> {client.phone}
                          </span>
                        )}
                        {client.email && !client.email.includes('walkin_') && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Mail size={9} /> {client.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-white/30 font-sans">
                          <Calendar size={9} /> Last Visit: <span className="text-white/50 font-medium">{formatDate(client.last_visit)}</span>
                        </span>
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded text-[13px] font-sans font-semibold capitalize">
                          {client.visit_count || client.total_visits || 0} visits
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-white/20 shrink-0 mt-0.5">
                      {expandedClient === cid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {expandedClient === cid && (
                  <div className="mx-5 mb-4 bg-white/[0.01] border border-white/[0.05] rounded-xl overflow-hidden p-4 space-y-4">
                    {/* Billed services list */}
                    <div>
                      <h4 className="text-[11px] font-sans font-semibold text-white/60 mb-2.5 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple-400/50" /> Billed Services
                      </h4>
                      {loadingDetails[cid] ? (
                        <div className="flex items-center gap-2 text-white/30 text-[11px] font-sans">
                          <div className="w-3 h-3 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
                          Fetching services...
                        </div>
                      ) : clientDetails[cid]?.billedServices?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {clientDetails[cid].billedServices.map((service, idx) => (
                            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 flex items-center justify-between">
                              <span className="text-[11px] text-white/70 font-sans truncate pr-2" title={service.name}>{service.name}</span>
                              <span className="text-[10px] font-sans font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">x{service.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/30 font-sans flex items-center gap-2 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
                          <AlertTriangle size={12} className="text-white/20" />
                          No billed services details found.
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Promotional Composer (if phone number is available) */}
                    {client.phone && (
                      <div className="pt-3 border-t border-white/[0.04] space-y-3">
                        <h4 className="text-[11px] font-sans font-semibold text-[#25D366] uppercase tracking-wider flex items-center gap-2">
                          <MessageCircle size={12} /> Send Promo Offer
                        </h4>
                        
                        {/* Template tabs */}
                        <div className="grid grid-cols-3 gap-2">
                          {MEMBER_PROMO_TEMPLATES.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleTemplateChange(cid, client.name, idx)}
                              className={`text-[10px] font-sans px-2 py-1.5 rounded-lg border transition-colors text-left ${
                                state.templateIdx === idx
                                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366] font-bold'
                                  : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Text composer */}
                        <textarea
                          rows={4}
                          value={state.editedMsg}
                          onChange={e => setClientState(cid, { editedMsg: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 focus:border-[#25D366]/40 rounded-lg p-2.5 text-xs text-white font-sans resize-none"
                        />

                        {/* Send button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => sendWhatsAppToClient(client, cid)}
                            className="bg-[#25D366] hover:bg-[#20bc5a] text-black font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Send size={10} />
                            {state.isSent ? 'Resend on WhatsApp' : 'Send Promo on WhatsApp'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/25 font-sans text-center">
              {filtered.length} client{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Old Clients Modal ──────────────────────────────────────────────────────
function OldClientsModal({ onClose }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [expandedClient, setExpandedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [clientMsgs, setClientMsgs] = useState({});

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState(PROMO_TEMPLATES[0].message('{{name}}'));
  const [broadcastSent, setBroadcastSent] = useState([]);
  const [broadcastProgress, setBroadcastProgress] = useState(false);
  const broadcastRef = useRef(false);

  const getClientState = (billId, clientName) => {
    if (clientMsgs[billId]) return clientMsgs[billId];
    return {
      templateIdx: 0,
      editedMsg: PROMO_TEMPLATES[0].message(clientName || 'there'),
      isSent: false,
    };
  };

  const setClientState = (billId, updates) => {
    setClientMsgs(prev => ({
      ...prev,
      [billId]: { ...getClientState(billId, ''), ...prev[billId], ...updates },
    }));
  };

  const handleTemplateChange = (billId, clientName, idx) => {
    setClientState(billId, {
      templateIdx: idx,
      editedMsg: PROMO_TEMPLATES[idx].message(clientName || 'there'),
    });
  };

  const sendWhatsAppToClient = (client, billId) => {
    const state = getClientState(billId, client.name);
    const phone = client.phone?.replace(/\D/g, '').slice(-10);
    if (!phone || phone.length !== 10) {
      toast.error('Invalid phone number format');
      return;
    }
    const cleanPhone = `91${phone}`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(state.editedMsg)}`;
    window.location.href = url;
    setClientState(billId, { isSent: true });
    toast.success(`Redirected to WhatsApp chat for ${client.name || 'Client'}`);
  };

  const handleBroadcast = async () => {
    const reachable = filtered.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    if (reachable.length === 0) {
      toast.error('No reachable clients in this list');
      return;
    }
    setBroadcastProgress(true);
    broadcastRef.current = true;
    
    for (let i = 0; i < reachable.length; i++) {
      if (!broadcastRef.current) break;
      const client = reachable[i];
      const phone = client.phone.replace(/\D/g, '').slice(-10);
      const text = broadcastMsg.replace(/\{\{name\}\}/gi, client.name || 'Customer');
      
      try {
        await whatsappAPI.getSettings(); // test API connection
        const cleanPhone = `91${phone}`;
        const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setBroadcastSent(prev => [...prev, client.id]);
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch {
        break;
      }
    }
    setBroadcastProgress(false);
    toast.success('Broadcast batch processed!');
  };

  const handleExpand = async (id, customerId) => {
    if (expandedClient === id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(id);
    if (customerId && !clientDetails[id]) {
      setLoadingDetails(prev => ({ ...prev, [id]: true }));
      try {
        const res = await customersAPI.getById(customerId);
        setClientDetails(prev => ({ ...prev, [id]: res.data.data }));
      } catch (error) {
        console.error('Failed to fetch client details', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  useEffect(() => {
    setBroadcastMsg(PROMO_TEMPLATES[broadcastTemplate].message('{{name}}'));
  }, [broadcastTemplate]);

  useEffect(() => {
    customersAPI.getAll({ returning: 'true', limit: 500 })
      .then(res => {
        const data = res?.data?.data || [];
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    const cleanSearchPhone = s.replace(/\D/g, '');
    const cleanClientPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
    return (c.name || '').toLowerCase().includes(s) ||
           (c.email || '').toLowerCase().includes(s) ||
           (cleanSearchPhone && cleanClientPhone.includes(cleanSearchPhone)) ||
           (c.phone && c.phone.includes(search));
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <Repeat size={18} className="text-gold-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">Old Clients</h3>
              <p className="text-white/30 text-[11px] font-sans mt-0.5">Visits from repeat/loyal clients</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Broadcast Setup Banner */}
        {broadcastOpen ? (
          <div className="p-4 mx-5 mt-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-3 shrink-0 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-emerald-400 font-sans tracking-wide uppercase font-semibold">Bulk Promo Campaign (Old Clients)</span>
              <button onClick={() => { setBroadcastOpen(false); broadcastRef.current = false; }} className="text-white/40 hover:text-white text-[10px] font-sans uppercase">Cancel</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PROMO_TEMPLATES.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setBroadcastTemplate(idx)}
                  className={`px-2 py-1.5 text-[9px] font-sans font-semibold border transition-all uppercase rounded-lg ${
                    broadcastTemplate === idx
                      ? 'bg-[#c9a84c] text-black border-[#c9a84c] font-bold'
                      : 'border-white/10 text-white/50 bg-white/[0.03] hover:border-[#c9a84c]/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              rows={3}
              className="w-full bg-black/60 border border-white/10 rounded-lg text-xs p-2 text-white font-sans focus:outline-none focus:border-[#c9a84c]/50 resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-white/40 font-sans">{filtered.filter(c => c.phone).length} reachable clients</span>
              <button
                onClick={handleBroadcast}
                disabled={broadcastProgress}
                className="bg-[#c9a84c] hover:bg-[#b0913b] text-black font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {broadcastProgress ? 'Sending batch...' : 'Execute Campaign'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-4 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-white/40 font-sans font-medium uppercase tracking-wider">Clients History</span>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="border border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black px-3 py-1 rounded-lg text-[9px] font-sans font-bold uppercase tracking-wider transition-all"
            >
              Broadcast Campaign ({filtered.filter(c => c.phone).length})
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-4 py-2 text-[12px] text-white/60 font-sans placeholder-white/20 focus:outline-none focus:border-gold-500/30"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-white/30">
              <div className="w-5 h-5 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
              <span className="text-sm font-sans">Loading repeat clients...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Repeat size={36} className="text-white/10" />
              <p className="text-white/30 text-sm font-sans">
                {search ? 'No matching clients found' : 'No repeat clients found'}
              </p>
            </div>
          ) : filtered.map((client, i) => {
            const cid = client.id || i;
            const state = getClientState(cid, client.name);
            const isSentToAll = broadcastSent.includes(cid);

            return (
              <div key={cid} className="transition-colors">
                <div 
                  className="px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleExpand(cid, client.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSentToAll ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'bg-gold-500/10 border-gold-500/20 text-gold-400'
                    }`}>
                      <span className="text-[12px] font-bold font-sans">
                        {isSentToAll ? '✓' : (client.name?.[0] || 'W').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-white/85 font-sans font-semibold truncate">{client.name || 'Walk-In Customer'}</p>
                        <span className="text-gold-400 font-sans text-[12px] font-bold shrink-0">₹{parseFloat(client.total_spent || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Phone size={9} /> {client.phone}
                          </span>
                        )}
                        {client.email && !client.email.includes('walkin_') && (
                          <span className="flex items-center gap-1 text-[10px] text-white/35 font-sans">
                            <Mail size={9} /> {client.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-white/30 font-sans">
                          <Calendar size={9} /> Last Visit: <span className="text-white/50 font-medium">{formatDate(client.last_visit)}</span>
                        </span>
                        <span className="bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2.5 py-1 rounded text-[13px] font-sans font-semibold capitalize">
                          {client.visit_count || client.total_visits || 2} visits
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-white/20 shrink-0 mt-0.5">
                      {expandedClient === cid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {expandedClient === cid && (
                  <div className="mx-5 mb-4 bg-white/[0.01] border border-white/[0.05] rounded-xl overflow-hidden p-4 space-y-4">
                    {/* Billed services list */}
                    <div>
                      <h4 className="text-[11px] font-sans font-semibold text-white/60 mb-2.5 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle size={12} className="text-gold-400/50" /> Billed Services
                      </h4>
                      {loadingDetails[cid] ? (
                        <div className="flex items-center gap-2 text-white/30 text-[11px] font-sans">
                          <div className="w-3 h-3 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
                          Fetching services...
                        </div>
                      ) : clientDetails[cid]?.billedServices?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {clientDetails[cid].billedServices.map((service, idx) => (
                            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 flex items-center justify-between">
                              <span className="text-[11px] text-white/70 font-sans truncate pr-2" title={service.name}>{service.name}</span>
                              <span className="text-[10px] font-sans font-bold bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded">x{service.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/30 font-sans flex items-center gap-2 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
                          <AlertTriangle size={12} className="text-white/20" />
                          No billed services details found.
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Promotional Composer (if phone number is available) */}
                    {client.phone && (
                      <div className="pt-3 border-t border-white/[0.04] space-y-3">
                        <h4 className="text-[11px] font-sans font-semibold text-[#25D366] uppercase tracking-wider flex items-center gap-2">
                          <MessageCircle size={12} /> Send Promo Offer
                        </h4>
                        
                        {/* Template tabs */}
                        <div className="grid grid-cols-3 gap-2">
                          {PROMO_TEMPLATES.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleTemplateChange(cid, client.name, idx)}
                              className={`text-[10px] font-sans px-2 py-1.5 rounded-lg border transition-colors text-left ${
                                state.templateIdx === idx
                                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366] font-bold'
                                  : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/20'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Text composer */}
                        <textarea
                          rows={4}
                          value={state.editedMsg}
                          onChange={e => setClientState(cid, { editedMsg: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 focus:border-[#25D366]/40 rounded-lg p-2.5 text-xs text-white font-sans resize-none"
                        />

                        {/* Send button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => sendWhatsAppToClient(client, cid)}
                            className="bg-[#25D366] hover:bg-[#20bc5a] text-black font-bold font-sans text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Send size={10} />
                            {state.isSent ? 'Resend on WhatsApp' : 'Send Promo on WhatsApp'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/25 font-sans text-center">
              {filtered.length} client{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientAnalytics() {
  const [showTotalClients, setShowTotalClients] = useState(false);
  const [showLostClients, setShowLostClients] = useState(false);
  const [showNewClients, setShowNewClients] = useState(false);
  const [showMembershipHolders, setShowMembershipHolders] = useState(false);
  const [showOldClients, setShowOldClients] = useState(false);

  const [statsData, setStatsData] = useState({
    total: 0,
    new_clients: 0,
    old_clients: 0,
    lost: 0,
    members: 0,
    membership_percentage: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [sourcesData, setSourcesData] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [membershipGrowthData, setMembershipGrowthData] = useState([]);

  useEffect(() => {
    customersAPI.getStats()
      .then(res => {
        if (res.data?.success) {
          setStatsData(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    customersAPI.getNewVsOldChart()
      .then(res => {
        if (res.data?.success) {
          setChartData(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));

    customersAPI.getBookingSourcesChart()
      .then(res => {
        if (res.data?.success) {
          setSourcesData(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setSourcesLoading(false));

    customersAPI.getMembershipGrowthChart()
      .then(res => {
        if (res.data?.success) {
          setMembershipGrowthData(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const stats = [
    { label: 'Total Clients', value: statsLoading ? '...' : (statsData.total_bills || 0).toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', growth: '+8.4%', positive: true, onClick: () => setShowTotalClients(true), hoverClass: 'hover:border-blue-500/30 hover:bg-blue-500/5 hover:-translate-y-0.5 cursor-pointer' },
    { label: 'New Clients', value: statsLoading ? '...' : statsData.new_clients.toLocaleString(), icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', growth: 'Single Visit', positive: true, onClick: () => setShowNewClients(true), hoverClass: 'hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:-translate-y-0.5 cursor-pointer' },
    { label: 'Old Clients', value: statsLoading ? '...' : statsData.old_clients.toLocaleString(), icon: Repeat, color: 'text-gold-400', bg: 'bg-gold-500/10', growth: '+11%', positive: true, onClick: () => setShowOldClients(true), hoverClass: 'hover:border-gold-500/30 hover:bg-gold-500/5 hover:-translate-y-0.5 cursor-pointer' },
    { label: 'Lost Clients', value: statsLoading ? '...' : statsData.lost.toLocaleString(), icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10', growth: '-5.2%', positive: false, onClick: () => setShowLostClients(true), hoverClass: 'hover:border-red-500/30 hover:bg-red-500/5 hover:-translate-y-0.5 cursor-pointer' },
    { label: 'Membership Holders', value: statsLoading ? '...' : statsData.members.toLocaleString(), icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', growth: statsLoading ? '...' : `${statsData.membership_percentage}% of clients`, positive: true, onClick: () => setShowMembershipHolders(true), hoverClass: 'hover:border-purple-500/30 hover:bg-purple-500/5 hover:-translate-y-0.5 cursor-pointer' },
  ];

  return (
    <AdminLayout title="Client Analytics">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`stat-card text-center transition-all duration-200 ${s.hoverClass || ''}`}
            onClick={s.onClick}
          >
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={14} className={s.color} />
            </div>
            <div className="font-display text-2xl text-white font-light">{s.value}</div>
            <div className="text-[9px] text-white/30 font-sans uppercase tracking-wider mt-0.5 leading-tight">{s.label}</div>
            <div className={`text-[10px] font-sans font-semibold mt-1 ${s.positive ? 'text-emerald-400' : 'text-red-400'}`}>{s.growth}</div>
            {s.onClick && (
              <p className="text-[8px] text-red-400/50 font-sans mt-1 tracking-wide">Click to view list</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="mb-4">
        <ChartCard title="New vs Old Clients" subtitle="Monthly trend comparison">
          {chartLoading ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-white/30 gap-2">
              <div className="w-5 h-5 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-[10px] font-sans uppercase tracking-wider">Loading chart data...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Raleway', paddingTop: '12px' }} />
                <Bar dataKey="new" name="New Clients" fill="#10B981" radius={[3, 3, 0, 0]} barSize={18} />
                <Bar dataKey="old" name="Old Clients" fill="#C9A84C" radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Membership Growth" subtitle="Active members over time">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={membershipGrowthData} margin={{ top: 15, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Line type="monotone" dataKey="members" name="Members" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Booking Sources" subtitle="Walk-ins vs Phone Calls vs Website">
          {sourcesLoading ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-white/30 gap-2">
              <div className="w-5 h-5 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-[10px] font-sans uppercase tracking-wider">Loading chart data...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="source"
                    stroke="none"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="w-full sm:w-1/2 flex flex-col justify-center gap-3 mt-4 sm:mt-0 px-4">
                {sourcesData.map((src, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: src.color }} />
                      <span className="text-[11px] text-white/60 font-sans">{src.source}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-white/90 font-sans">{src.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Lost Clients Modal */}
      {showLostClients && <LostClientsModal onClose={() => setShowLostClients(false)} />}
      
      {/* New Clients Modal */}
      {showNewClients && <NewClientsModal onClose={() => setShowNewClients(false)} />}

      {/* Membership Holders Modal */}
      {showMembershipHolders && <MembershipHoldersModal onClose={() => setShowMembershipHolders(false)} />}

      {/* Old Clients Modal */}
      {showOldClients && <OldClientsModal onClose={() => setShowOldClients(false)} />}

      {/* Total Clients Modal */}
      {showTotalClients && <TotalClientsModal onClose={() => setShowTotalClients(false)} />}

    </AdminLayout>
  );
}
