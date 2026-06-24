import { MapPin, Phone, Mail, Clock, Calendar, Shield, Sparkles, Star, ArrowRight, Award, Flame } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useSiteSettings } from '../../context/SiteContext';
import { Link } from 'react-router-dom';
import ScrollReveal from '../../components/common/ScrollReveal';
import MagneticButton from '../../components/common/MagneticButton';
import Parallax from '../../components/common/Parallax';

export default function Contact() {
  const { siteSettings } = useSiteSettings();

  const address = siteSettings?.address || '123 Royal Avenue, Bandra West\nMumbai, Maharashtra 400050';
  const phone = siteSettings?.phone || '+91 98765 43210\n+91 98765 43211';
  const email = siteSettings?.email || 'info@luxesalon.com\nbookings@luxesalon.com';
  const hours = siteSettings?.working_hours || 'Monday – Saturday: 9:00 AM – 8:00 PM\nSunday: 10:00 AM – 6:00 PM';
  const mapsLink = siteSettings?.maps_link || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.0!2d72.8!3d19.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzAwLjAiTiA3MsKwNDgnMDAuMCJF!5e0!3m2!1sen!2sin!4v1234567890";

  return (
    <div className="min-h-screen bg-[#050505] text-salon-white font-sans selection:bg-gold-500/20 selection:text-gold-500 overflow-x-hidden">
      <Navbar />
      
      {/* Immersive Cinematic Hero */}
      <section className="relative pt-32 pb-14 text-center bg-gradient-to-b from-[#0A0A0A] via-[#050505] to-[#020202] border-b border-white/[0.02] overflow-hidden">
        {/* Luxury Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.12),transparent_60%)] pointer-events-none" />
        <div className="absolute -left-40 top-40 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.03),transparent_70%)] pointer-events-none blur-3xl" />
        <div className="absolute -right-40 top-40 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.03),transparent_70%)] pointer-events-none blur-3xl" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-3 mb-5 px-4 py-1.5 bg-gold-500/5 rounded-full border border-gold-500/10 backdrop-blur-md animate-fade-in">
            <Sparkles size={12} className="text-gold-400 animate-pulse" />
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-sans uppercase font-bold">Uncompromising Glamour</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-extralight tracking-widest text-salon-white mb-5 leading-[1.15]">
            Where Beauty <br />
            <span className="font-medium italic text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600 filter drop-shadow-[0_2px_20px_rgba(201,168,76,0.15)]">
              Meets Perfection
            </span>
          </h1>

          <p className="text-white/60 font-body text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-light mt-2">
            Step into high-fashion styling with Toni & Guy. Your ultimate sanctuary for sensory beauty.
          </p>
        </div>
      </section>

      {/* Main Sanctuary Information & Experience Block */}
      <section className="py-12 max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          {/* Left Block: The Sanctuary Information (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <ScrollReveal>
              <div>
                <span className="text-gold-500 text-xs font-bold tracking-[0.3em] uppercase block mb-3">VISIT OUR SANCTUARY</span>
                <h2 className="font-display text-2xl md:text-3xl font-light text-salon-white uppercase tracking-wider mb-4">
                  Hours & <span className="italic font-medium text-gold-400">Exclusive Locations</span>
                </h2>
                <div className="h-px w-16 bg-gradient-to-r from-gold-500 to-transparent mb-4" />
                <p className="text-white/50 text-sm md:text-base font-body leading-relaxed max-w-xl font-light">
                  Indulge your senses in the absolute pinnacle of elite styling. Locate our sanctuary below and plan your next transformation.
                </p>
              </div>
            </ScrollReveal>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { Icon: MapPin, title: 'Address & Valet', text: address, badge: 'Premium Location' },
                { Icon: Phone, title: 'Direct Concierge', text: phone, badge: 'Priority Support' },
                { Icon: Mail, title: 'Press & Enquiries', text: email, badge: 'Corporate' },
                { Icon: Clock, title: 'Exclusive Hours', text: hours, badge: 'Walk-ins Welcomed' },
              ].map(({ Icon, title, text, badge }, idx) => (
                <ScrollReveal key={title} delay={idx * 0.06}>
                  <div className="group p-4 bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.04] rounded-xl hover:border-gold-500/20 hover:from-white/[0.05] transition-all duration-500 h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gold-500/5 border border-gold-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon size={14} className="text-gold-400 group-hover:text-gold-300" />
                      </div>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-gold-500/60 bg-gold-500/5 px-2.5 py-0.5 rounded-full border border-gold-500/10">
                        {badge}
                      </span>
                    </div>
                    <h4 className="text-salon-white text-xs font-sans font-bold tracking-widest uppercase mb-2 group-hover:text-gold-400 transition-colors">{title}</h4>
                    <p className="text-white/50 text-xs font-body leading-relaxed whitespace-pre-line font-light">{text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Immersive Map Container */}
            <ScrollReveal>
              <div className="aspect-[21/9] bg-[#0A0A0A] border border-white/[0.04] rounded-xl overflow-hidden relative group shadow-2xl hover:border-gold-500/20 transition-all duration-500">
                {mapsLink.includes('/embed') ? (
                  <iframe
                    src={mapsLink}
                    width="100%" height="100%" style={{ border: 0, filter: 'grayscale(100%) invert(95%) contrast(110%) brightness(90%)' }} allowFullScreen loading="lazy"
                    title="Salon Location"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <MapPin size={40} className="text-gold-500/40 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="text-salon-white font-display text-lg mb-1">Interactive Location Map</h3>
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-gold px-6 py-2 mt-4 text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-2">
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* Right Block: The Luxe VIP Showcase (5 Cols) */}
          <ScrollReveal className="lg:col-span-5 h-full flex">
            <div className="w-full bg-gradient-to-b from-[#111111] via-[#0C0C0C] to-[#070707] border border-gold-500/20 rounded-2xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col justify-between self-stretch">
              
              {/* Design accents */}
              <Parallax speed={0.03} className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.15),transparent)]" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[radial-gradient(circle_at_bottom_left,rgba(201,168,76,0.05),transparent)]" />
              </Parallax>

              <div className="space-y-8 relative z-10">
                {/* Premium Heading */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-gold-500/5 border border-gold-500/20 flex items-center justify-center mx-auto mb-6">
                    <Flame size={22} className="text-gold-400 animate-pulse" />
                  </div>
                  <span className="text-gold-500 text-xs font-bold tracking-[0.4em] uppercase block mb-2">REDEFINE YOUR LOOK</span>
                  <h3 className="font-display text-4xl text-salon-white font-light leading-tight">
                    The Sanctuary of <br />
                    <span className="font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                      High Couture
                    </span>
                  </h3>
                  <div className="h-0.5 w-12 bg-gold-500/30 mx-auto mt-6" />
                </div>

                <p className="text-white/60 text-xs md:text-sm font-body text-center leading-relaxed font-light">
                  Why wait to feel mesmerizing? Step into an experience crafted uniquely around you, featuring premium luxury products, expert stylists, and absolute comfort.
                </p>

                {/* Bullet Features */}
                <div className="space-y-6 pt-6 border-t border-white/[0.04]">
                  {[
                    { title: 'Award-Winning Hair Artists', desc: 'Bespoke cuts, brilliant colors, and master-level treatments.', Icon: Award },
                    { title: 'Luxury Brands Only', desc: 'We curate elite skin, hair, and wellness formulations for your skin.', Icon: Shield },
                    { title: 'Red Carpet Experience', desc: 'Complimentary prosecco, premium lounges, and ultra-private suites.', Icon: Star },
                  ].map(({ title, desc, Icon }) => (
                    <div key={title} className="flex gap-4 items-start group">
                      <div className="w-8 h-8 rounded-lg bg-gold-500/5 border border-gold-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-gold-500/10 transition-colors">
                        <Icon size={14} className="text-gold-400" />
                      </div>
                      <div>
                        <h5 className="text-salon-white text-xs font-sans font-bold uppercase tracking-wider group-hover:text-gold-300 transition-colors">{title}</h5>
                        <p className="text-white/45 text-[11px] font-body mt-1 leading-relaxed font-light">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Booking Invitation */}
              <div className="pt-10 relative z-10">
                <MagneticButton>
                  <Link 
                    to="/book" 
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-salon-black text-xs font-sans font-bold uppercase tracking-widest rounded-lg transition-all duration-300 shadow-[0_10px_30px_rgba(201,168,76,0.25)] hover:shadow-[0_15px_45px_rgba(201,168,76,0.4)] block text-center"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Calendar size={14} />
                      Reserve Your Appointment
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                </MagneticButton>
                <span className="block text-center text-[10px] text-white/30 tracking-wider uppercase mt-4">
                  Instant confirmation • Complimentary consultations
                </span>
              </div>

            </div>
          </ScrollReveal>

        </div>
      </section>

      <Footer />
    </div>
  );
}
