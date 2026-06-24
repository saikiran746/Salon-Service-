import { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { galleryAPI } from '../../services/api';
import { Play, X, Sparkles, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LuxuryReveal from '../../components/common/LuxuryReveal';
import ScrollReveal from '../../components/common/ScrollReveal';
import Parallax from '../../components/common/Parallax';

export default function Gallery() {
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const CATEGORIES = ['All', 'Photos', 'Videos'];

  useEffect(() => {
    galleryAPI.getAll({ limit: 50 })
      .then(r => { setPosts(r.data.data); setFiltered(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(posts.filter(post => {
      if (activeCategory === 'All') return true;
      if (activeCategory === 'Photos') return post.media_type === 'image';
      if (activeCategory === 'Videos') return post.media_type === 'video';
      return post.category === activeCategory;
    }));
  }, [activeCategory, posts]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-gold-500/20 selection:text-gold-400 overflow-x-hidden">
      <Navbar />

      {/* ── Immersive Cinematic Hero ── */}
      <section className="relative pt-32 pb-14 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#060606] to-[#030303]" />
        <Parallax speed={0.04} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse at top, rgba(201,168,76,0.12) 0%, transparent 65%)' }} />
          <div className="absolute -left-32 top-1/2 w-80 h-80 blur-[100px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
          <div className="absolute -right-32 top-1/2 w-80 h-80 blur-[100px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.04)' }} />
        </Parallax>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="section-eyebrow mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Sparkles size={12} className="animate-pulse" />
            <span>The Art of Transformation</span>
          </div>

          <LuxuryReveal text="Couture" accentText="Lookbook" />

          <p className="text-white/55 font-body text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light mt-3 animate-fade-up"
            style={{ animationDelay: '0.4s' }}>
            Browse through real visual masterworks crafted by the elite stylists at Toni &amp; Guy.
            A testament to personal elegance, luxury styling, and signature glamour.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 gold-divider" />
      </section>

      {/* ── Sticky Category Filters ── */}
      <section className="sticky top-[64px] z-30 border-b border-white/[0.04]"
        style={{ background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-2.5 overflow-x-auto justify-start sm:justify-center pb-1 sm:pb-0
            hide-scrollbar-mobile items-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap flex-shrink-0 px-5 sm:px-7 py-2.5 text-[10px] font-sans
                  tracking-[0.2em] uppercase font-bold rounded-lg transition-all duration-300"
                style={activeCategory === cat ? {
                  background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)',
                  backgroundSize: '200% 100%',
                  color: '#0A0A0A',
                  boxShadow: '0 4px 20px rgba(201,168,76,0.3)'
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery Showcase Grid ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square shimmer rounded-2xl"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-28 border border-dashed border-white/[0.06] rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.01)' }}>
              <ImageIcon size={36} className="text-white/15 mx-auto mb-4" />
              <h3 className="text-white font-display text-2xl mb-2 font-light">Lookbook Coming Soon</h3>
              <p className="text-white/30 font-body text-xs tracking-widest uppercase">
                We are curating masterpieces for this style portfolio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map((post, idx) => (
                <ScrollReveal key={post.id} delay={Math.min(idx * 0.04, 0.4)}>
                  <div
                    onClick={() => setSelected(post)}
                    className="gallery-card group aspect-square"
                  >
                    {post.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center relative"
                        style={{ background: 'linear-gradient(135deg, #0E0E0E, #141414)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-400 group-hover:scale-110"
                          style={{
                            background: 'rgba(201,168,76,0.15)',
                            border: '1px solid rgba(201,168,76,0.35)',
                            boxShadow: '0 0 30px rgba(201,168,76,0.1)'
                          }}>
                          <Play size={22} className="text-gold-400 ml-0.5" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={post.media_url}
                        alt={post.title || 'Gallery'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-4"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }}>
                      {post.category && (
                        <span className="text-gold-400/80 text-[9px] font-sans tracking-[0.2em] uppercase mb-1
                          translate-y-3 group-hover:translate-y-0 transition-transform duration-400 delay-75">
                          ✦ {post.category}
                        </span>
                      )}
                      {post.title && (
                        <h4 className="text-white font-display text-sm font-medium tracking-wide uppercase
                          translate-y-3 group-hover:translate-y-0 transition-transform duration-400 delay-100">
                          {post.title}
                        </h4>
                      )}
                    </div>

                    {/* Gold corner brackets (hover) */}
                    <div className="absolute top-0 left-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-400"
                      style={{ borderTop: '2px solid rgba(201,168,76,0.7)', borderLeft: '2px solid rgba(201,168,76,0.7)' }} />
                    <div className="absolute top-0 right-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-400"
                      style={{ borderTop: '2px solid rgba(201,168,76,0.7)', borderRight: '2px solid rgba(201,168,76,0.7)' }} />
                    <div className="absolute bottom-0 left-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-400"
                      style={{ borderBottom: '2px solid rgba(201,168,76,0.7)', borderLeft: '2px solid rgba(201,168,76,0.7)' }} />
                    <div className="absolute bottom-0 right-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-400"
                      style={{ borderBottom: '2px solid rgba(201,168,76,0.7)', borderRight: '2px solid rgba(201,168,76,0.7)' }} />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Premium Lightbox ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
            style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(20px)' }}
            onClick={() => setSelected(null)}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center
                text-white/50 hover:text-white transition-colors duration-200 z-10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X size={18} />
            </motion.button>

            {/* Lightbox content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.08 }}
              className="relative max-w-4xl w-full overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #111111, #0A0A0A)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: '20px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(201,168,76,0.07)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Gold top bar */}
              <div className="h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, #E8C96A, #C9A84C, transparent)' }} />

              <div className="flex items-center justify-center"
                style={{ background: '#060606', minHeight: '200px', maxHeight: '70vh' }}>
                {selected.media_type === 'video' ? (
                  <video
                    src={selected.media_url}
                    autoPlay
                    controls
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                ) : (
                  <img
                    src={selected.media_url}
                    alt={selected.title}
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                )}
              </div>

              {(selected.title || selected.caption) && (
                <div className="p-5 sm:p-8"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0E0E0E' }}>
                  {selected.title && (
                    <h3 className="font-display text-xl sm:text-2xl text-white uppercase tracking-wider mb-2 font-light">
                      {selected.title}
                    </h3>
                  )}
                  {selected.caption && (
                    <p className="text-white/50 font-body text-xs sm:text-sm leading-relaxed font-light">
                      {selected.caption}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
