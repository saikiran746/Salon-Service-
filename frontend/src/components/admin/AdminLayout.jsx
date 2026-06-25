import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Menu, Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './Sidebar';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const prevNotifsRef = useRef([]);

  useEffect(() => {
    const fetchNotifs = () => {
      notificationsAPI.getAll().then(res => {
        const newNotifs = res.data.data || [];
        
        // Diff for new notifications
        if (prevNotifsRef.current.length > 0) {
          const prevIds = new Set(prevNotifsRef.current.map(n => n.id));
          const freshNotifs = newNotifs.filter(n => !prevIds.has(n.id) && !n.is_read);
          
          freshNotifs.forEach(notif => {
            if (notif.title === 'New Appointment Request') {
              toast((t) => (
                <div className="flex flex-col gap-1 cursor-pointer" onClick={() => { toast.dismiss(t.id); setNotifOpen(true); }}>
                  <span className="font-semibold text-sm">New Appointment Request</span>
                  <span className="text-xs opacity-80 line-clamp-2">{notif.message.replace(/\|/g, ' ')}</span>
                </div>
              ), { duration: 6000, icon: '📅' });
            } else {
              toast(notif.title, { icon: '🔔' });
            }
          });
        }

        prevNotifsRef.current = newNotifs;
        setNotifs(newNotifs);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(8, 8, 8, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white/30 hover:text-white transition-colors p-1"
            >
              <Menu size={18} />
            </button>
            {title && (
              <div>
                <h1 className="font-display text-xl text-white font-light">{title}</h1>
                <p className="text-[10px] text-white/20 font-sans hidden sm:block">{dateStr}</p>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-sans font-medium">Live</span>
            </div>

            {/* Refresh */}
            <button
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                text-white/30 hover:text-white/60 hover:border-white/10 transition-all duration-200"
              title="Refresh data"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={13} />
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                text-white/30 hover:text-gold-400 hover:border-gold-500/20 transition-all duration-200"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center text-[8px] font-bold text-salon-black font-sans">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-white/[0.06] hidden sm:block" />

            {/* User */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold-500/15 border border-gold-500/20 flex items-center justify-center">
                <span className="text-gold-400 text-[10px] font-bold font-sans">{user?.name?.[0] || 'A'}</span>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-sans text-white/70 font-medium leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[9px] font-sans text-gold-400/60 uppercase tracking-wider mt-0.5">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-6">
          {children}
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} notifs={notifs} setNotifs={setNotifs} />
    </div>
  );
}
