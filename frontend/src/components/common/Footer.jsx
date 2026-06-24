import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Phone, Mail, MapPin, Clock, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteContext';

export default function Footer() {
  const { siteSettings } = useSiteSettings();

  const brandName = siteSettings?.site_name || 'TONI & GUY ESSENSUALS HAIRDRESSING Kondapur';
  const instagram = siteSettings?.instagram || '#';
  const facebook = siteSettings?.facebook || '#';
  const twitter = siteSettings?.twitter || '#';
  
  const address = siteSettings?.address || '123 Royal Avenue, Bandra West, Mumbai, Maharashtra 400050';
  const phone = siteSettings?.phone || '+91 98765 43210';
  const email = siteSettings?.email || 'info@luxesalon.com';
  const hours = siteSettings?.working_hours || 'Mon–Sat: 9:00 AM – 8:00 PM\nSunday: 10:00 AM – 6:00 PM';

  return (
    <footer className="bg-gradient-to-b from-[#0A0A0A] to-[#040404] border-t border-white/[0.03] pt-24 pb-12 relative overflow-hidden">
      {/* Premium Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.04),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 items-start">
          
          {/* Brand Presentation (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold-400 animate-pulse" />
              <span className="text-gold-400 text-[10px] tracking-[0.4em] font-sans uppercase font-bold">THE SANCTUARY OF ARTISTRY</span>
            </div>
            <div className="font-display text-salon-white text-3xl font-light tracking-widest uppercase">
              ✦ <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600 drop-shadow-[0_2px_10px_rgba(201,168,76,0.15)]">{brandName}</span>
            </div>
            <p className="text-white/50 text-sm font-body leading-relaxed max-w-md font-light">
              Experience the absolute peak of modern hairdressing, elite nail design, and customized skin therapies. We do not just style; we craft your signature statement.
            </p>
            {/* Sexy 3D Social Buttons */}
            <div className="flex gap-4 pt-2">
              {[
                { Icon: Instagram, link: instagram, label: 'Instagram' },
                { Icon: Facebook, link: facebook, label: 'Facebook' },
                { Icon: Twitter, link: twitter, label: 'Twitter' },
              ].map(({ Icon, link, label }) => (
                <a 
                  key={label} href={link} target="_blank" rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white/[0.02] border border-white/[0.06] hover:border-gold-500/30 flex items-center justify-center text-white/50 hover:text-gold-400 rounded-xl transition-all duration-300 shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_20px_rgba(201,168,76,0.1)] hover:-translate-y-1"
                  title={label}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Signature Services (2 Columns) */}
          <div className="lg:col-span-2">
            <h4 className="text-gold-400 text-xs font-bold tracking-[0.25em] uppercase mb-6 font-sans">SERVICES</h4>
            <div className="space-y-4">
              {['Signature Haircut', 'Beard Styling', 'Luxury Hair Spa', 'Gold Facial', 'Hair Coloring', 'Keratin Treatment'].map((s) => (
                <Link key={s} to="/services" className="group block text-white/55 hover:text-gold-400 text-xs font-sans tracking-wide uppercase transition-colors duration-300 relative">
                  <span className="inline-block relative">
                    {s}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-gold-400 group-hover:w-full transition-all duration-300" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links (2 Columns) */}
          <div className="lg:col-span-2">
            <h4 className="text-gold-400 text-xs font-bold tracking-[0.25em] uppercase mb-6 font-sans">QUICK LINKS</h4>
            <div className="space-y-4">
              {[
                { to: '/specialists', label: 'Our Specialists' },
                { to: '/memberships', label: 'Memberships' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/book', label: 'Book Now' },
                { to: '/login', label: 'Login' },
                { to: '/register', label: 'Register' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className="group block text-white/55 hover:text-gold-400 text-xs font-sans tracking-wide uppercase transition-colors duration-300 relative">
                  <span className="inline-block relative">
                    {label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-gold-400 group-hover:w-full transition-all duration-300" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Details (3 Columns) */}
          <div className="lg:col-span-3">
            <h4 className="text-gold-400 text-xs font-bold tracking-[0.25em] uppercase mb-6 font-sans">CONCIERGE</h4>
            <div className="space-y-5">
              {[
                { Icon: MapPin, text: address },
                { Icon: Phone, text: phone },
                { Icon: Mail, text: email },
                { Icon: Clock, text: hours },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="w-8 h-8 rounded-lg bg-gold-500/5 border border-gold-500/10 flex items-center justify-center shrink-0 group-hover:bg-gold-500/10 transition-all duration-300">
                    <Icon size={13} className="text-gold-400" />
                  </div>
                  <span className="text-white/50 text-xs font-body leading-relaxed whitespace-pre-line font-light group-hover:text-white/75 transition-colors duration-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/[0.04] mt-16 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-white/30 text-[10px] font-sans tracking-widest uppercase">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <div className="flex gap-8">
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(t => (
              <a key={t} href="#" className="text-white/30 hover:text-gold-400 text-[10px] font-sans tracking-widest uppercase transition-colors duration-300">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
