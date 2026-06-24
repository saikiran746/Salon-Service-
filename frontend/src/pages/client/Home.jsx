import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Clock, Sparkles } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { servicesAPI, galleryAPI } from '../../services/api';
import AnimatedCountUp from '../../components/common/AnimatedCountUp';
import MagneticButton from '../../components/common/MagneticButton';
import ScrollReveal from '../../components/common/ScrollReveal';
import Parallax from '../../components/common/Parallax';

const HERO_SLIDES = [
  {
    bg: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80',
    tag: 'Luxury Hair Spa',
    title: 'Elevate Your\nSelf-Care Ritual',
    subtitle: 'Experience the pinnacle of luxury salon services. Where master artisans craft transformations that transcend the ordinary.'
  },
  {
    bg: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=80',
    tag: 'Expert Grooming',
    title: 'Precision Crafted\nFor You',
    subtitle: 'Our master stylists bring decades of expertise and an eye for perfection to every appointment.'
  },
  {
    bg: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=80',
    tag: 'Hair Coloring',
    title: 'Transform Your\nLook Today',
    subtitle: 'From subtle balayage to bold color transformations — your vision brought to life with expert precision.'
  },
];

const STATS = [
  { value: '5000', suffix: '+', label: 'Happy Clients' },
  { value: '15', suffix: '+', label: 'Expert Stylists' },
  { value: '8', suffix: '+', label: 'Years of Excellence' },
  { value: '4.9', suffix: '★', label: 'Average Rating' },
];

/* ── Hero Slider ── */
function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent(c => (c + 1) % HERO_SLIDES.length);
        setTransitioning(false);
      }, 300);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[current];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Images */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={s.bg}
            alt=""
            className="w-full h-full object-cover"
            style={{ transform: 'scale(1.06)', filter: 'brightness(0.38)' }}
          />
        </div>
      ))}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85" />
        {/* Gold ambient glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2"
          style={{ background: 'radial-gradient(ellipse at bottom center, rgba(201,168,76,0.05) 0%, transparent 70%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 text-center">
        <div className="mx-auto">
          {/* Eyebrow */}
          <div
            key={`tag-${current}`}
            className="flex items-center justify-center gap-3 mb-5 sm:mb-6 animate-slide-up-fade"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="h-px w-8 sm:w-10" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
            <span className="text-gold-400 text-[10px] sm:text-xs tracking-[0.35em] font-sans uppercase font-bold">
              {slide.tag}
            </span>
            <div className="h-px w-8 sm:w-10" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>

          {/* Hero Title */}
          <h1
            key={`title-${current}`}
            className="font-display font-extralight text-white leading-[1.05] mb-5 sm:mb-6 whitespace-pre-line animate-slide-up-fade"
            style={{
              fontSize: 'clamp(2.8rem, 6.5vw, 5.5rem)',
              animationDelay: '0.25s',
              textShadow: '0 2px 40px rgba(0,0,0,0.6)'
            }}
          >
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p
            key={`sub-${current}`}
            className="text-white/70 font-body text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto animate-slide-up-fade"
            style={{ animationDelay: '0.4s' }}
          >
            {slide.subtitle}
          </p>

          {/* Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up-fade"
            style={{ animationDelay: '0.55s' }}
          >
            <MagneticButton className="w-full sm:w-auto">
              <Link to="/book" className="btn-gold w-full sm:w-auto justify-center animate-glow-pulse"
                style={{ fontSize: '11px', padding: '15px 36px' }}>
                Book Your Experience <ArrowRight size={13} />
              </Link>
            </MagneticButton>
            <MagneticButton className="w-full sm:w-auto">
              <Link to="/services" className="btn-outline-gold w-full sm:w-auto justify-center"
                style={{ fontSize: '11px', padding: '15px 36px' }}>
                Explore Services
              </Link>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 sm:bottom-10 left-4 sm:left-6 flex items-center gap-2 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all duration-500 rounded-full"
            style={{
              height: '2px',
              width: i === current ? '32px' : '12px',
              background: i === current
                ? 'linear-gradient(90deg, #C9A84C, #E8C96A)'
                : 'rgba(255,255,255,0.25)'
            }}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 sm:bottom-10 right-4 sm:right-6 flex flex-col items-center gap-2 z-10">
        <div className="w-px h-10 sm:h-14" style={{ background: 'linear-gradient(to bottom, rgba(201,168,76,0.5), transparent)' }} />
        <span className="text-white/30 text-[9px] font-sans tracking-[0.25em] uppercase"
          style={{ writingMode: 'vertical-rl' }}>
          Scroll
        </span>
      </div>
    </section>
  );
}

/* ── Stats Bar ── */
function StatsBar() {
  return (
    <section className="relative py-7 sm:py-8 overflow-hidden"
      style={{ background: 'linear-gradient(90deg, #B8901E, #C9A84C, #E8C96A, #C9A84C, #B8901E)' }}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          backgroundSize: '200% 100%',
          animation: 'goldShine 3s ease-in-out infinite'
        }} />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
          {STATS.map(({ value, suffix, label }) => (
            <ScrollReveal key={label}>
              <div>
                <div className="font-display text-2xl sm:text-3xl font-semibold text-[#0A0A0A]">
                  <AnimatedCountUp end={value + suffix} />
                </div>
                <div className="text-[#0A0A0A]/65 text-[10px] sm:text-xs font-sans tracking-[0.2em] uppercase mt-1 font-semibold">
                  {label}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Services Preview ── */
function ServicesPreview({ services }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: '#050505' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-14 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-8 sm:w-12 bg-gold-500" />
              <span className="text-gold-500 text-[10px] sm:text-xs tracking-[0.35em] font-sans uppercase font-bold">
                Our Offerings
              </span>
              <div className="h-px w-8 sm:w-12 bg-gold-500" />
            </div>
            <h2 className="section-title">Signature Services</h2>
          </div>
        </ScrollReveal>

        {/* Mobile: horizontal scroll, Desktop: grid */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 pb-6 sm:pb-0
          snap-x snap-mandatory hide-scrollbar-mobile"
          style={{ scrollPaddingLeft: '16px' }}>
          {(services || []).slice(0, 6).map((svc, idx) => (
            <ScrollReveal key={svc.id} delay={idx * 0.07}
              className="min-w-[82vw] xs:min-w-[72vw] sm:min-w-0 snap-center h-full">
              <div className="service-card group h-full">
                {svc.image && (
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img
                      src={svc.image}
                      alt={svc.name}
                      className="w-full h-full object-cover"
                      style={{ transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C]/60 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="badge badge-gray bg-black/70 backdrop-blur-md capitalize text-[9px]">
                        {svc.category}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  {!svc.image && (
                    <div className="mb-3">
                      <span className="badge badge-gray capitalize text-[9px]">{svc.category}</span>
                    </div>
                  )}
                  <h3 className="font-display text-lg sm:text-xl text-white mb-2 leading-snug
                    group-hover:text-gold-400 transition-colors duration-300">
                    {svc.name}
                  </h3>
                  <p className="text-white/45 text-xs sm:text-[13px] font-body line-clamp-2 mb-5 leading-relaxed flex-1">
                    {svc.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 mt-auto"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-sans">
                        <Clock size={11} /> {svc.duration}m
                      </div>
                      <div className="h-3 w-px bg-white/10" />
                      <span className="font-display text-lg sm:text-xl text-gold-400 font-medium">
                        ₹{parseFloat(svc.price).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <MagneticButton>
                      <Link to={`/book?service=${svc.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-sans font-bold
                          uppercase tracking-[0.15em] text-gold-400 border border-gold-500/25
                          transition-all duration-300 group-hover:bg-gold-500 group-hover:text-[#0A0A0A]
                          group-hover:border-gold-500 group-hover:shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
                        style={{ background: 'rgba(201,168,76,0.04)' }}>
                        Book <ArrowRight size={10} />
                      </Link>
                    </MagneticButton>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-14">
          <MagneticButton className="inline-block">
            <Link to="/services" className="btn-outline-gold inline-flex items-center gap-2"
              style={{ fontSize: '11px', padding: '13px 32px' }}>
              View All Services <ArrowRight size={13} />
            </Link>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

/* ── Membership Teaser ── */
function MembershipTeaser() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #070707, #0A0A0A)' }} />
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #C9A84C 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />
      {/* Gold glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-8 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
              border: '1px solid rgba(201,168,76,0.25)'
            }}>
            <CrownSvg className="w-7 h-7 text-gold-400" />
          </div>
          <h2 className="section-title mb-5">
            Join Our Exclusive<br />Membership Club
          </h2>
          <p className="text-white/50 font-body text-sm sm:text-base lg:text-lg leading-relaxed mb-10 sm:mb-12 max-w-2xl mx-auto font-light">
            Unlock premium benefits, priority bookings, exclusive discounts and a truly personalized
            salon experience crafted just for you.
          </p>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-12">
            {['10–30% off services', 'Priority booking', 'Complimentary treatments', 'Birthday specials'].map(b => (
              <div key={b} className="flex items-center gap-2 text-white/60 text-xs sm:text-sm font-body">
                <span className="text-gold-500 text-base">✦</span> {b}
              </div>
            ))}
          </div>

          <MagneticButton className="inline-block">
            <Link to="/memberships" className="btn-gold"
              style={{ fontSize: '11px', padding: '15px 40px' }}>
              Explore Memberships
            </Link>
          </MagneticButton>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ── Gallery Teaser ── */
function GalleryTeaser({ posts }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: '#080808' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="section-title mb-3">Our Work</h2>
            <p className="text-white/45 font-body text-sm sm:text-base">Transformations that speak for themselves</p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {(posts || []).slice(0, 8).map((post, idx) => (
            <ScrollReveal key={post.id} delay={idx * 0.05}>
              <div className="gallery-card aspect-square group cursor-pointer">
                <img
                  src={post.media_url}
                  alt={post.title || 'Gallery'}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }}>
                  <div className="text-center px-3">
                    {post.title && (
                      <p className="text-white text-xs font-display font-medium tracking-wide uppercase
                        translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                        {post.title}
                      </p>
                    )}
                  </div>
                </div>
                {/* Gold corner accent */}
                <div className="absolute top-0 left-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ borderTop: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C' }} />
                <div className="absolute bottom-0 right-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-all duration-500"
                  style={{ borderBottom: '2px solid #C9A84C', borderRight: '2px solid #C9A84C' }} />
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-14">
          <MagneticButton className="inline-block">
            <Link to="/gallery" className="btn-outline-gold inline-flex items-center gap-2"
              style={{ fontSize: '11px', padding: '13px 32px' }}>
              View Full Gallery <ArrowRight size={13} />
            </Link>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

const CrownSvg = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l-3 6-5-3 2 10h12l2-10-5 3-3-6z" />
  </svg>
);

export default function Home() {
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    servicesAPI.getAll({ is_active: 1 }).then(r => setServices(r.data.data)).catch(() => {});
    galleryAPI.getAll({ limit: 8 }).then(r => setGallery(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />
      <HeroSlider />
      <StatsBar />
      <ServicesPreview services={services} />
      <MembershipTeaser />
      <GalleryTeaser posts={gallery} />
      <Footer />
    </div>
  );
}
