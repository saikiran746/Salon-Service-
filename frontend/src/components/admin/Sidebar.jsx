import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Scissors, UserCheck,
  Receipt, Crown, Image, Mail, LogOut, X, ChevronRight,
  ChevronDown, BarChart3, TrendingUp, Star,
  Activity, Shield, Sparkles, FileText, MessageSquare
} from 'lucide-react';

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/appointments', icon: Calendar, label: 'Appointments' },
      { to: '/admin/billing', icon: Receipt, label: 'Billing' },
      { to: '/admin/reports', icon: FileText, label: 'Reports' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/analytics/clients', icon: Users, label: 'Client Analytics' },
      { to: '/admin/analytics/staff', icon: Star, label: 'Staff Performance' },
      { to: '/admin/analytics/services', icon: Scissors, label: 'Service Analytics' },
      { to: '/admin/analytics/appointments', icon: BarChart3, label: 'Appt Analytics' },
      { to: '/admin/analytics/billing', icon: TrendingUp, label: 'Billing Analytics' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/customers', icon: Users, label: 'Customers' },
      { to: '/admin/services', icon: Scissors, label: 'Services' },
      { to: '/admin/staff', icon: UserCheck, label: 'Staff' },
      { to: '/admin/memberships', icon: Crown, label: 'Memberships' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/admin/gallery', icon: Image, label: 'Gallery' },
      { to: '/admin/email-marketing', icon: Mail, label: 'Email Marketing' },
      { to: '/admin/analytics/activity', icon: Shield, label: 'Admin Activity' },
      { to: '/admin/settings', icon: LayoutDashboard, label: 'Site Settings' },
    ],
  },
];

function NavSection({ section, location, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasActive = section.items.some(item =>
    location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 group"
      >
        <span className="text-[9px] font-sans font-bold tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">
          {section.label}
        </span>
        <ChevronDown
          size={10}
          className={`text-white/20 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="space-y-0.5">
          {section.items.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              >
                <Icon size={13} className={active ? 'text-gold-400' : 'text-white/30'} />
                <span className="flex-1 text-[11px]">{label}</span>
                {active && <ChevronRight size={10} className="text-gold-400/40" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'rgba(8,8,8,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-gold-500/15 border border-gold-500/25 flex items-center justify-center">
                <Sparkles size={10} className="text-gold-400" />
              </div>
              <span className="font-display text-gold-400 text-sm font-semibold tracking-wide">TONI & GUY</span>
            </div>
            <div className="text-[8px] text-white/20 tracking-widest font-sans uppercase pl-7">
              ESSENSUALS KONDAPUR
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-white/20 hover:text-white/60 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Admin info */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gold-500/15 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-gold-400 text-[10px] font-bold font-sans">{user?.name?.[0] || 'A'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white/80 text-[11px] font-sans font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-gold-400/60 text-[9px] tracking-wider uppercase font-sans">{user?.role || 'Administrator'}</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Online" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        {navSections.map(section => (
          <NavSection
            key={section.label}
            section={section}
            location={location}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.05] space-y-0.5">
        <Link
          to="/admin/preview"
          className={`sidebar-item ${location.pathname === '/admin/preview' ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
        >
          <Activity size={13} className={location.pathname === '/admin/preview' ? 'text-gold-400' : 'text-white/25'} />
          <span className="flex-1 text-[11px]">View Website</span>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left border-l-2 border-transparent text-red-400/50 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={13} />
          <span className="text-[11px]">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block w-52 shrink-0 h-screen sticky top-0">{sidebarContent}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-52 h-full shadow-2xl animate-slide-up">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
