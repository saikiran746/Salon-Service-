import { useState, useEffect } from 'react';
import {
  X, Bell, Calendar, Users, Crown, Package, UserCheck, DollarSign,
  Mail, Phone, Clock, User
} from 'lucide-react';
import { notificationsAPI, appointmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const typeConfig = {
  appointment: { icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  client: { icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  membership: { icon: Crown, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
  stock: { icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  staff: { icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  billing: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const parseBackendDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  let d = new Date(dateStr);
  
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('T')) {
    d = new Date(dateStr.replace(' ', 'T') + 'Z');
  } else if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    d = new Date(dateStr + 'Z');
  }

  // Auto-correct Node.js UTC-as-Local timezone serialization offset bug
  let adjustedDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  let diffSeconds = Math.floor((new Date() - adjustedDate) / 1000);
  
  // If adjusting places the time in the future, it was already correct.
  if (diffSeconds < -60) {
    return d;
  }
  return adjustedDate;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Just now';
  
  const d = parseBackendDate(dateStr);
  let diffSeconds = Math.floor((new Date() - d) / 1000);
  if (diffSeconds < 0) diffSeconds = 0;

  if (diffSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const formatAmPmDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseBackendDate(dateStr);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Parses enriched message formats:
 * appointment: "Display text.||apptId||name||email||phone||date||time"
 * client:      "Display text.||client||name||email||phone"
 */
const format12Hour = (text) => {
  if (!text) return '';
  return text.replace(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g, (match, h, m) => {
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  });
};

function parseNotifMessage(message) {
  const parts = message.split('||');
  const display = format12Hour(parts[0]);
  if (parts.length < 2) return { display, type: 'plain' };

  const tag = parts[1];
  if (tag === 'client') {
    return {
      display,
      type: 'client',
      name: parts[2] || '',
      email: parts[3] || '',
      phone: parts[4] || '',
    };
  }
  // appointment: parts[1] = appointmentId
  if (parts.length >= 7) {
    return {
      display,
      type: 'appointment_inline',
      appointmentId: parts[1],
      name: parts[2] || '',
      email: parts[3] || '',
      phone: parts[4] || '',
      date: parts[5] || '',
      time: format12Hour(parts[6]) || '',
    };
  }
  // Legacy appointment with only ID
  if (parts.length === 2) {
    return { display, type: 'appointment_id', appointmentId: parts[1] };
  }
  return { display, type: 'plain' };
}

// ─── Universal Detail Modal ─────────────────────────────────────────────────

function NotifDetailModal({ notif, onClose }) {
  const parsed = parseNotifMessage(notif.message);
  const [appointment, setAppointment] = useState(null);
  const [loadingAppt, setLoadingAppt] = useState(false);
  const cfg = typeConfig[notif.type] || typeConfig.appointment;
  const IconComp = cfg.icon;

  useEffect(() => {
    if (
      (parsed.type === 'appointment_id' || parsed.type === 'appointment_inline') &&
      parsed.appointmentId
    ) {
      setLoadingAppt(true);
      appointmentsAPI.getById(parsed.appointmentId)
        .then(res => setAppointment(res.data.data))
        .catch(() => {})
        .finally(() => setLoadingAppt(false));
    }
  }, []);

  const handleAction = (status) => {
    toast.success(`Appointment ${status === 'confirmed' ? 'Accepted' : 'Rejected'}!`);
    onClose();

    appointmentsAPI.update(parsed.appointmentId, { status }).catch(() => {
      toast.error('Failed to update appointment.');
    });
  };

  // Determine displayed details
  const name = parsed.name || appointment?.customer_name || '';
  const rawEmail = parsed.email || appointment?.customer_email || '';
  const email = rawEmail.includes('walkin_') ? '' : rawEmail;
  const phone = parsed.phone || appointment?.customer_phone || '';
  const date = parsed.date || appointment?.appointment_date || '';
  const time = parsed.time || format12Hour(appointment?.appointment_time) || '';
  const serviceName = appointment?.service_name || '';
  const staffName = appointment?.staff_name || '';
  const apptStatus = appointment?.status || '';

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-5 border-b border-white/[0.06] flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
            <IconComp size={18} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-white">{notif.title}</h3>
            <p className="text-white/30 text-[11px] font-sans mt-0.5">{timeAgo(notif.created_at)} • {formatAmPmDate(notif.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Client Info Section */}
          {(name || email || phone) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <p className="text-[10px] text-white/30 font-sans uppercase tracking-widest">Client Details</p>
              {name && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-gold-400" />
                  </div>
                  <p className="text-sm text-white font-sans font-semibold">{name}</p>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail size={13} className="text-blue-400" />
                  </div>
                  <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 font-sans transition-colors">{email}</a>
                </div>
              )}
              {phone && (
                <div className="flex items-center justify-between p-1">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Phone size={13} className="text-emerald-400" />
                    </div>
                    <a href={`tel:${phone}`} className="text-sm text-emerald-400 hover:text-emerald-300 font-sans transition-colors">{phone}</a>
                  </div>
                  <a href={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold tracking-widest uppercase transition-colors flex items-center gap-2">
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Appointment Info */}
          {(date || time || serviceName || staffName) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <p className="text-[10px] text-white/30 font-sans uppercase tracking-widest">Appointment Details</p>
              {(date || time) && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar size={13} className="text-blue-400" />
                  </div>
                  <p className="text-sm text-white font-sans">
                    {date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    {time ? ` at ${time}` : ''}
                  </p>
                </div>
              )}
              {serviceName && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={13} className="text-gold-400" />
                  </div>
                  <p className="text-sm text-white font-sans">{serviceName}</p>
                </div>
              )}
            </div>
          )}

          {/* Spinner for loading appointment */}
          {loadingAppt && (
            <div className="flex items-center gap-2 text-white/30 text-sm font-sans py-2">
              <div className="w-4 h-4 border-2 border-white/10 border-t-gold-500 rounded-full animate-spin" />
              Loading appointment details...
            </div>
          )}

          {/* Message fallback */}
          {!name && !date && !loadingAppt && (
            <p className="text-white/50 text-sm font-body">{parsed.display}</p>
          )}

          {/* Appointment Actions */}
          {parsed.appointmentId && apptStatus === 'pending' && (
            <div className="flex gap-3 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => handleAction('cancelled')}
                className="flex-1 py-2.5 text-xs font-sans tracking-wider uppercase text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('confirmed')}
                className="flex-1 py-2.5 text-xs font-sans tracking-wider uppercase bg-emerald-500 text-salon-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
              >
                Accept
              </button>
            </div>
          )}
          {parsed.appointmentId && apptStatus && apptStatus !== 'pending' && (
            <p className="text-white/30 text-xs italic font-body pt-2 border-t border-white/[0.06]">
              Appointment is already <span className="capitalize text-white/50">{apptStatus}</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function NotificationPanel({ open, onClose, notifs = [], setNotifs }) {
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [clearedCount, setClearedCount] = useState(0);
  const unread = notifs.filter(n => !n.is_read).length;

  useEffect(() => {
    if (open && setNotifs) {
      notificationsAPI.getAll().then(res => {
        setNotifs(res.data.data || []);
        setClearedCount(res.data.clearedCount || 0);
      }).catch(() => {});
    }
  }, [open, setNotifs]);

  const markAllRead = () => {
    notificationsAPI.markAllRead().then(() => setNotifs(notifs.map(n => ({ ...n, is_read: 1 }))));
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      notificationsAPI.clearAll().then(() => {
        setNotifs([]);
        notificationsAPI.getAll().then(res => {
          setClearedCount(res.data.clearedCount || 0);
        });
        toast.success('All notifications cleared');
      }).catch(() => toast.error('Failed to clear notifications'));
    }
  };

  const restoreAll = () => {
    notificationsAPI.restoreAll().then(() => {
      notificationsAPI.getAll().then(res => {
        setNotifs(res.data.data || []);
        setClearedCount(res.data.clearedCount || 0);
      });
      toast.success('All notifications restored');
    }).catch(() => toast.error('Failed to restore notifications'));
  };

  const markRead = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    notificationsAPI.markRead(id).catch(() => {});
  };

  const handleActionInline = (e, status, appointmentId, notifId) => {
    e.stopPropagation();
    
    // Optimistic UI updates
    markRead(notifId);
    toast.success(`Appointment ${status === 'confirmed' ? 'Accepted' : 'Rejected'}!`);

    // API call in background
    appointmentsAPI.update(appointmentId, { status }).catch(() => {
      toast.error('Failed to update appointment. It may have already been updated.');
    });
  };

  const handleNotifClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    setSelectedNotif(notif);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-80 z-50 flex flex-col"
        style={{
          background: 'rgba(10, 10, 10, 0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          animation: 'slideRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-gold-400" />
            <h3 className="font-sans font-semibold text-sm text-white">Notifications</h3>
            {unread > 0 && (
              <span className="bg-gold-500 text-salon-black text-[9px] font-bold font-sans px-1.5 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-white/30 hover:text-gold-400 font-sans transition-colors">
                Mark all read
              </button>
            )}
            {notifs.length > 0 && (
              <button onClick={clearAll} className="text-[10px] text-red-400/50 hover:text-red-400 font-sans transition-colors">
                Clear all
              </button>
            )}
            {clearedCount > 0 && (
              <button onClick={restoreAll} className="text-[10px] text-emerald-400/50 hover:text-emerald-400 font-sans transition-colors">
                Restore
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
              <Bell size={32} />
              <p className="text-sm font-sans">No notifications</p>
            </div>
          ) : notifs.map((notif, i) => {
            const cfg = typeConfig[notif.type] || typeConfig.appointment;
            const IconComp = cfg.icon;
            const parsed = parseNotifMessage(notif.message);
            return (
              <div
                key={notif.id}
                className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer ${!notif.is_read ? 'bg-white/[0.015]' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => handleNotifClick(notif)}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <IconComp size={13} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-sans font-semibold ${!notif.is_read ? 'text-white' : 'text-white/60'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 font-body mt-0.5 leading-relaxed">
                      {parsed.display}
                    </p>
                    {/* Preview contact info inline */}
                    {parsed.name && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <User size={9} className="text-white/20" />
                        <span className="text-[10px] text-white/30 font-sans">{parsed.name}</span>
                        {!notif.is_read && parsed.phone && (
                          <>
                            <span className="text-white/15">·</span>
                            <Phone size={9} className="text-white/20" />
                            <span className="text-[10px] text-white/30 font-sans">{parsed.phone}</span>
                          </>
                        )}
                      </div>
                    )}
                    {parsed.date && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar size={9} className="text-white/20" />
                        <span className="text-[10px] text-gold-400/60 font-sans">
                          {new Date(parsed.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {parsed.time ? ` at ${parsed.time}` : ''}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-white/20 font-sans mt-1.5">{timeAgo(notif.created_at)} • {formatAmPmDate(notif.created_at)}</p>
                    
                    {/* Inline Actions */}
                    {!notif.is_read && parsed.appointmentId && notif.title === 'New Appointment Request' && (
                      <div className="flex gap-2 mt-3 mb-1">
                        <button
                          onClick={(e) => handleActionInline(e, 'cancelled', parsed.appointmentId, notif.id)}
                          className="flex-1 py-1.5 text-[10px] font-sans tracking-wider uppercase text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={(e) => handleActionInline(e, 'confirmed', parsed.appointmentId, notif.id)}
                          className="flex-1 py-1.5 text-[10px] font-sans tracking-wider uppercase bg-emerald-500 text-salon-black font-semibold rounded hover:bg-emerald-400 transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <button className="w-full text-center text-[11px] text-white/30 hover:text-gold-400 font-sans tracking-wider uppercase transition-colors">
            View All Notifications
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNotif && (
        <NotifDetailModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
        />
      )}
    </>
  );
}
