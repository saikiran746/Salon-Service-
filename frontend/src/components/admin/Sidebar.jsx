import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Scissors, UserCheck,
  Receipt, Crown, Image, Mail, LogOut, X, ChevronRight,
  ChevronDown, BarChart3, TrendingUp, Star,
  Activity, Shield, Sparkles, FileText, MessageSquare,
  ChevronLeft, PanelLeftClose, PanelLeft
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

function NavSection({ section, location, onClose, isCollapsed }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasActive = section.items.some(item =>
    location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );

  return (
    <div className="mb-1">
      {!isCollapsed ? (
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
      ) : (
        <div className="h-4 flex justify-center items-center mb-1">
          <div className="w-4 h-px bg-white/10" />
        </div>
      )}

      {(!collapsed || isCollapsed) && (
        <div className="space-y-0.5">
          {section.items.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
                className={`sidebar-item relative flex items-center transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/10 ${active ? 'sidebar-item-active drop-shadow-[0_0_5px_rgba(201,168,76,0.4)]' : 'sidebar-item-inactive hover:brightness-125'} ${isCollapsed ? 'justify-center px-0 py-3' : 'py-2.5'}`}
              >
                <Icon size={isCollapsed ? 20 : 16} className={`transition-all duration-300 ${active ? 'text-gold-400 scale-110' : 'text-white/40'} shrink-0 group-hover:scale-110`} />
                {!isCollapsed && (
                  <>
                    <span className={`flex-1 text-[12px] ml-3 transition-opacity duration-300 ${active ? 'font-semibold tracking-wide text-white' : 'text-white/70'}`}>{label}</span>
                    {active && <ChevronRight size={14} className="text-gold-400/60 shrink-0 drop-shadow-md" />}
                  </>
                )}
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
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true';
  });

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('adminSidebarCollapsed', String(newVal));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full relative" style={{ background: 'rgba(8,8,8,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
      
      {/* Collapse Toggle Button - Desktop Only */}
      <button 
        onClick={toggleCollapse}
        className="hidden lg:flex absolute -right-4 top-7 w-8 h-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gold-500/30 rounded-full items-center justify-center text-gold-400 hover:text-white hover:border-gold-400 hover:shadow-[0_0_12px_rgba(201,168,76,0.3)] transition-all z-50 transform hover:scale-110"
        style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)' }}
      >
        <ChevronLeft size={18} className={`transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo */}
      <div className={`px-5 py-6 border-b border-white/[0.05] transition-all duration-300 ${isCollapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <div className={`w-8 h-8 rounded bg-gradient-to-br from-gold-500/20 to-gold-600/5 border border-gold-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(201,168,76,0.15)] transition-transform duration-500 ${isCollapsed ? 'scale-110' : ''}`}>
              <Sparkles size={16} className="text-gold-400 drop-shadow-[0_0_3px_rgba(201,168,76,0.5)]" />
            </div>
            {!isCollapsed && (
              <div className="ml-2.5 overflow-hidden transition-all duration-300 whitespace-nowrap">
                <div className="font-display text-gold-400 text-sm font-semibold tracking-wide">TONI & GUY</div>
                <div className="text-[8px] text-white/20 tracking-widest font-sans uppercase">ESSENSUALS</div>
              </div>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-white/20 hover:text-white/60 transition-colors ml-4">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Admin info */}
      <div className={`px-4 py-3 border-b border-white/[0.05] transition-all duration-300 ${isCollapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/20 flex items-center justify-center flex-shrink-0 relative">
            <span className="text-gold-400 text-[11px] font-bold font-sans">{user?.name?.[0] || 'A'}</span>
            {isCollapsed && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-[#0A0A0A]" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 overflow-hidden transition-all duration-300 whitespace-nowrap">
                <p className="text-white/80 text-[11px] font-sans font-semibold truncate">{user?.name || 'Admin'}</p>
                <p className="text-gold-400/60 text-[9px] tracking-wider uppercase font-sans truncate">{user?.role || 'Administrator'}</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Online" />
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-3 no-scrollbar transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-2'}`}>
        {navSections.map(section => (
          <NavSection
            key={section.label}
            section={section}
            location={location}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.05] space-y-0.5">
        <Link
          to="/admin/preview"
          title={isCollapsed ? "View Website" : undefined}
          className={`sidebar-item flex items-center transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/5 ${location.pathname === '/admin/preview' ? 'sidebar-item-active' : 'sidebar-item-inactive hover:brightness-125'} ${isCollapsed ? 'justify-center px-0 py-3' : 'py-2.5'}`}
        >
          <Activity size={isCollapsed ? 20 : 16} className={`${location.pathname === '/admin/preview' ? 'text-gold-400 scale-110' : 'text-white/40'} shrink-0 transition-transform duration-300`} />
          {!isCollapsed && <span className="flex-1 text-[12px] ml-3 whitespace-nowrap">View Website</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`sidebar-item w-full flex items-center text-left border-l-2 border-transparent text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 transform hover:-translate-y-0.5 ${isCollapsed ? 'justify-center px-0 py-3' : 'py-2.5'}`}
        >
          <LogOut size={isCollapsed ? 20 : 16} className="shrink-0 transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_5px_rgba(248,113,113,0.3)]" />
          {!isCollapsed && <span className="text-[12px] ml-3 whitespace-nowrap font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isCollapsed ? 'w-[5.5rem]' : 'w-56'} z-40`}>
        {sidebarContent}
      </div>

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
