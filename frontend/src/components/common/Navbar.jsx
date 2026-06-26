import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteContext';
import { Menu, X, User, ChevronDown, LogOut, Calendar, Receipt, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MagneticButton from './MagneticButton';

const navLinks = [
  { to: '/services', label: 'Services' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { siteSettings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();
  
  const siteName = siteSettings?.site_name || 'TONI & GUY ESSENSUALS HAIRDRESSING KONDAPUR';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); setUserMenu(false); }, [location]);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
      scrolled || open ? 'bg-[#0A0A0A] border-b border-white/[0.05] py-3 shadow-2xl' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex flex-col leading-none group max-w-[200px] md:max-w-none">
          <span className="font-display text-gold-500 text-lg font-semibold tracking-[0.1em] group-hover:text-gold-400 transition-colors uppercase truncate md:overflow-visible md:whitespace-normal">
            <span
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/admin/login');
              }}
              className="cursor-pointer hover:scale-105 inline-block transition-transform duration-300"
            >
              ✦
            </span> {siteName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to} to={to}
                className={`relative pb-1.5 text-xs tracking-widest uppercase font-sans font-semibold transition-colors duration-300 group ${
                  isActive ? 'text-gold-500' : 'text-white/40 hover:text-gold-400'
                }`}
              >
                <span>{label}</span>
                {isActive ? (
                  <motion.div
                    layoutId="navbar-active-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold-500 shadow-[0_0_12px_rgba(201,168,76,0.8)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                ) : (
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-gold-500/40 transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(201,168,76,0.4)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-5">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin/dashboard" className="btn-outline-gold py-2 px-4 flex items-center gap-2 text-[10px] font-sans tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5 rounded-lg">
                  <Shield size={12} /> Back to Admin
                </Link>
              )}
              <MagneticButton className="inline-block">
                <Link 
                  to="/book" 
                  className="relative block bg-gradient-to-r from-gold-600 to-gold-400 border-b-4 border-gold-700 active:border-b-0 hover:brightness-110 active:translate-y-[4px] px-6 py-2.5 text-[10px] font-sans font-bold text-black uppercase tracking-widest rounded-lg transition-all duration-100 shadow-[0_4px_20px_rgba(201,168,76,0.25)] hover:shadow-[0_6px_25px_rgba(201,168,76,0.4)]"
                >
                  Book Now
                </Link>
              </MagneticButton>
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="group flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.08] hover:border-gold-500/30 px-3 py-1.5 rounded-xl transition-all duration-300 hover:shadow-[0_4px_15px_rgba(201,168,76,0.1)] hover:-translate-y-0.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 group-hover:from-gold-400 group-hover:to-gold-300 flex items-center justify-center shadow-[0_2px_10px_rgba(201,168,76,0.2)] group-hover:shadow-[0_4px_15px_rgba(201,168,76,0.4)] transition-all duration-300 transform group-hover:scale-105">
                    <User size={13} className="text-black" />
                  </div>
                  <span className="text-white/80 group-hover:text-gold-400 transition-colors text-[10px] font-sans tracking-widest uppercase">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={12} className={`text-white/40 group-hover:text-gold-400 transition-all duration-300 ${userMenu ? 'rotate-185 text-gold-400' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-14 w-56 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/[0.08] rounded-xl shadow-[0_15px_45px_rgba(0,0,0,0.7),0_0_20px_rgba(201,168,76,0.1)] overflow-hidden z-50 p-1.5 space-y-1"
                    >
                      {isAdmin && (
                        <Link to="/admin/dashboard" className="group flex items-center gap-3 px-4 py-3 text-[10px] font-sans tracking-widest text-gold-400 hover:text-gold-300 bg-white/[0.02] hover:bg-gold-500/5 border border-white/[0.04] rounded-lg transition-all duration-300 uppercase">
                          <Shield size={13} className="group-hover:scale-110 transition-transform text-gold-400" /> Admin Panel
                        </Link>
                      )}
                      <Link to="/dashboard" className="group flex items-center gap-3 px-4 py-3 text-[10px] font-sans tracking-widest text-white/70 hover:text-gold-400 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold-500/20 border border-transparent rounded-lg transition-all duration-300 hover:translate-x-1 uppercase">
                        <Calendar size={13} className="group-hover:scale-110 transition-transform text-gold-400/80 group-hover:text-gold-400" /> My Appointments
                      </Link>
                      <Link to="/dashboard/bills" className="group flex items-center gap-3 px-4 py-3 text-[10px] font-sans tracking-widest text-white/70 hover:text-gold-400 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold-500/20 border border-transparent rounded-lg transition-all duration-300 hover:translate-x-1 uppercase">
                        <Receipt size={13} className="group-hover:scale-110 transition-transform text-gold-400/80 group-hover:text-gold-400" /> My Bills
                      </Link>
                      <div className="h-px bg-white/[0.06] my-1" />
                      <button onClick={handleLogout} className="group w-full flex items-center gap-3 px-4 py-3 text-[10px] font-sans tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent rounded-lg transition-all duration-300 uppercase text-left">
                        <LogOut size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <MagneticButton className="inline-block">
                <Link 
                  to="/register" 
                  className="relative block bg-gradient-to-r from-gold-600 to-gold-400 border-b-4 border-gold-700 active:border-b-0 hover:brightness-110 active:translate-y-[4px] px-6 py-2.5 text-[10px] font-sans font-bold text-black uppercase tracking-widest rounded-lg transition-all duration-100 shadow-[0_4px_20px_rgba(201,168,76,0.25)] hover:shadow-[0_6px_25px_rgba(201,168,76,0.4)]"
                >
                  Get Started
                </Link>
              </MagneticButton>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-salon-white hover:text-gold-500 transition-colors">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-[#0A0A0A] border-t border-white/[0.05] absolute top-full left-0 right-0 h-[calc(100vh-60px)] overflow-y-auto shadow-2xl">
          <div className="px-6 py-8 flex flex-col gap-6">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={`text-lg font-display tracking-widest uppercase ${location.pathname === to ? 'text-gold-500' : 'text-white/70 hover:text-white'}`}>
                {label}
              </Link>
            ))}
            <div className="border-t border-white/[0.1] pt-6 flex flex-col gap-4 pb-20">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link to="/admin/dashboard" className="bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-lg text-center py-3 flex items-center justify-center gap-2 font-sans tracking-wider uppercase text-sm font-semibold mb-2">
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}
                  <Link to="/book" className="bg-gold-500 text-black rounded-lg text-center py-3 font-sans tracking-wider uppercase text-sm font-semibold">Book Appointment</Link>
                  <Link to="/dashboard" className="border border-gold-500 text-gold-500 rounded-lg text-center py-3 font-sans tracking-wider uppercase text-sm font-semibold">My Dashboard</Link>
                  <button onClick={handleLogout} className="text-red-400 text-sm tracking-widest uppercase font-sans mt-4 flex items-center justify-center gap-2">
                    <LogOut size={14} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-gold-500 text-black rounded-lg text-center py-3 font-sans tracking-wider uppercase text-sm font-semibold">Get Started / Register</Link>
                  <Link to="/login" className="border border-gold-500 text-gold-500 rounded-lg text-center py-3 font-sans tracking-wider uppercase text-sm font-semibold">Login to Account</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
