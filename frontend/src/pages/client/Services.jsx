import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Search, Filter, Sparkles } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { servicesAPI } from '../../services/api';
import LuxuryReveal from '../../components/common/LuxuryReveal';
import ScrollReveal from '../../components/common/ScrollReveal';
import MagneticButton from '../../components/common/MagneticButton';
import Parallax from '../../components/common/Parallax';



export default function Services() {
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([{ key: 'all', label: 'All Services' }]);

  useEffect(() => {
    servicesAPI.getAll({ is_active: 1 }).then(r => {
      const data = r.data.data;
      setServices(data);
      setFiltered(data);
      const unique = [...new Set(data.map(s => s.category).filter(Boolean))];
      setCategories([
        { key: 'all', label: 'All Services' },
        ...unique.map(c => ({ key: c.toLowerCase(), label: c }))
      ]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = services;
    if (category !== 'all') {
      result = result.filter(s => s.category?.toLowerCase() === category);
    }
    if (search) result = result.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [category, search, services]);


  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-gold-500/20 selection:text-gold-400 overflow-x-hidden">
      <Navbar />

      {/* ── Immersive Hero ── */}
      <section className="relative pt-32 pb-14 text-center overflow-hidden">
        {/* Background ambience */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#060606] to-[#030303]" />
        <Parallax speed={0.04} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px]"
            style={{ background: 'radial-gradient(ellipse at top, rgba(201,168,76,0.12) 0%, transparent 65%)' }} />
          <div className="absolute -left-32 top-1/2 w-80 h-80 blur-[100px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
          <div className="absolute -right-32 top-1/2 w-80 h-80 blur-[100px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
        </Parallax>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="section-eyebrow mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Sparkles size={12} className="animate-pulse" />
            <span>Bespoke Hair &amp; Skin Care</span>
          </div>

          <LuxuryReveal text="Signature" accentText="Menu" />

          <p className="text-white/55 font-body text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light mt-3 animate-fade-up"
            style={{ animationDelay: '0.4s' }}>
            Indulge in professional hair design, advanced skin care, and luxury treatments by Toni &amp; Guy.
            Meticulously curated for your individual style.
          </p>
        </div>

        {/* Bottom gold line */}
        <div className="absolute bottom-0 left-0 right-0 gold-divider" />
      </section>

      {/* ── Sticky Filters & Search ── */}
      <section className="sticky top-[64px] z-30 border-b border-white/[0.04]"
        style={{ background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar-mobile items-center flex-1 min-w-0">
              {categories.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`
                    whitespace-nowrap flex-shrink-0 px-4 sm:px-5 py-2 text-[10px] font-sans tracking-[0.18em] 
                    uppercase font-bold transition-all duration-300 rounded-lg
                    ${category === key
                      ? 'text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.3)]'
                      : 'text-white/50 hover:text-gold-400 hover:border-gold-500/30'
                    }
                  `}
                  style={category === key ? {
                    background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)',
                    backgroundSize: '200% 100%',
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-shrink-0 w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search treatments..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-sans text-white placeholder-white/25
                  bg-white/[0.03] border border-white/[0.06] rounded-lg
                  focus:outline-none focus:border-gold-500/40 focus:bg-white/[0.05]
                  transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-[18px] overflow-hidden border border-white/[0.04]"
                  style={{ background: 'linear-gradient(145deg, #131313, #0C0C0C)' }}>
                  <div className="aspect-[16/10] shimmer" />
                  <div className="p-6 space-y-4">
                    <div className="h-3 w-16 shimmer rounded-full" />
                    <div className="h-5 w-3/4 shimmer rounded-lg" />
                    <div className="h-3 w-full shimmer rounded-lg" />
                    <div className="h-3 w-2/3 shimmer rounded-lg" />
                    <div className="flex items-center justify-between pt-3">
                      <div className="h-5 w-24 shimmer rounded-lg" />
                      <div className="h-8 w-20 shimmer rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-28 border border-dashed border-white/[0.06] rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.01)' }}>
              <Filter size={36} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/35 font-sans text-[11px] uppercase tracking-[0.25em]">
                No signature services match your search.
              </p>
              <button onClick={() => { setCategory('all'); setSearch(''); }}
                className="mt-6 text-gold-500 font-sans text-xs tracking-widest uppercase hover:text-gold-400 transition-colors duration-200">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filtered.map((svc, idx) => (
                <ScrollReveal key={svc.id} delay={idx * 0.05} className="h-full">
                  <div className="service-card group">
                    {/* Service Image */}
                    {svc.image && (
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <img
                          src={svc.image}
                          alt={svc.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                          style={{ transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                        />
                        {/* Image overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C]/60 via-transparent to-transparent" />
                        <div className="absolute top-3.5 right-3.5">
                          <span className="badge badge-gray bg-black/70 backdrop-blur-md capitalize text-[9px]">
                            {svc.category}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      {/* Category (no image) */}
                      {!svc.image && (
                        <div className="mb-3">
                          <span className="badge badge-gray capitalize text-[9px]">{svc.category}</span>
                        </div>
                      )}

                      {/* Name */}
                      <h3 className="font-display text-lg sm:text-xl text-white mb-2 leading-snug
                        group-hover:text-gold-400 transition-colors duration-300">
                        {svc.name}
                      </h3>

                      {/* Description */}
                      <p className="text-white/45 text-xs sm:text-[13px] font-body line-clamp-2 mb-5 leading-relaxed flex-1">
                        {svc.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 mt-auto"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
                        {/* Duration & Price */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-sans">
                            <Clock size={11} />
                            <span>{svc.duration}m</span>
                          </div>
                          <div className="h-3 w-px bg-white/10" />
                          <span className="font-display text-lg sm:text-xl text-gold-400 font-medium">
                            ₹{parseFloat(svc.price).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Book Button */}
                        <MagneticButton>
                          <Link
                            to={`/book?service=${svc.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-sans font-bold
                              uppercase tracking-[0.15em] text-gold-400 border border-gold-500/25
                              transition-all duration-300 group-hover:bg-gold-500 group-hover:text-[#0A0A0A]
                              group-hover:border-gold-500 group-hover:shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
                            style={{ background: 'rgba(201,168,76,0.04)' }}
                          >
                            Book <ArrowRight size={10} />
                          </Link>
                        </MagneticButton>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Exclusive CTA ── */}
      <section className="relative py-24 sm:py-32 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505]" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at center, rgba(201,168,76,0.07) 0%, transparent 65%)' }} />

        <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <h2 className="font-display font-light text-white mb-4 uppercase tracking-wider"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Ready for Your <br />
              <span className="font-semibold italic" style={{
                background: 'linear-gradient(135deg, #E8C96A, #C9A84C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Transformation?
              </span>
            </h2>
            <p className="text-white/45 text-sm font-body mb-10 leading-relaxed font-light">
              Secure your booking today and experience premium styling personalized for you.
            </p>
            <MagneticButton className="inline-block">
              <Link
                to="/book"
                className="btn-gold"
                style={{ fontSize: '11px', padding: '16px 40px' }}
              >
                Book Appointment
              </Link>
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
