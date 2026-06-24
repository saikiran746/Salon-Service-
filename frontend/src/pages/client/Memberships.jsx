import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown as CrownIcon, Check, Star } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { membershipsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LuxuryReveal from '../../components/common/LuxuryReveal';
import ScrollReveal from '../../components/common/ScrollReveal';
import Parallax from '../../components/common/Parallax';

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    membershipsAPI.getAll()
      .then(r => setPlans(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (planId) => {
    if (!isAuthenticated) return toast.error('Please login to purchase a membership.');
    setPurchasing(planId);
    try {
      await membershipsAPI.purchase({ plan_id: planId, payment_method: 'online' });
      toast.success('Membership activated! Welcome to the club. 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed. Please try again.');
    } finally { setPurchasing(null); }
  };

  /* Determine which plan index looks "featured" (middle or the VIP one) */
  const getFeaturedIdx = (plans) => {
    const vipIdx = plans.findIndex(p => p.name?.toLowerCase().includes('vip'));
    if (vipIdx >= 0) return vipIdx;
    return Math.floor(plans.length / 2);
  };

  const featuredIdx = getFeaturedIdx(plans);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-gold-500/20 selection:text-gold-400">
      <Navbar />

      {/* ── Immersive Hero ── */}
      <section className="relative pt-32 pb-14 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#060606] to-[#030303]" />
        <Parallax speed={0.04} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse at top, rgba(201,168,76,0.13) 0%, transparent 65%)' }} />
          <div className="absolute -left-32 top-1/2 w-96 h-96 blur-[120px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.05)' }} />
          <div className="absolute -right-32 top-1/2 w-96 h-96 blur-[120px] rounded-full"
            style={{ background: 'rgba(201,168,76,0.05)' }} />
        </Parallax>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="section-eyebrow mb-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CrownIcon size={12} className="animate-pulse" />
            <span>VIP Privileges</span>
          </div>

          <LuxuryReveal text="Elite" accentText="Club" />

          <p className="text-white/55 font-body text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light mt-3 animate-fade-up"
            style={{ animationDelay: '0.4s' }}>
            Unlock curated perks, priority appointment slots, and private member discounts
            designed exclusively for connoisseurs of luxury at Toni &amp; Guy.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 gold-divider" />
      </section>

      {/* ── Membership Plans Grid ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 justify-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-[20px] overflow-hidden h-[520px] shimmer"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/[0.06] rounded-2xl">
              <CrownIcon size={36} className="text-gold-500/30 mx-auto mb-4" />
              <p className="text-white/30 font-sans text-xs uppercase tracking-widest">
                Membership plans coming soon
              </p>
            </div>
          ) : (
            <div className={`
              grid gap-6 sm:gap-8 items-stretch justify-center
              ${plans.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : ''}
              ${plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : ''}
              ${plans.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
            `}>
              {plans.map((plan, idx) => {
                const benefits = typeof plan.benefits === 'string'
                  ? JSON.parse(plan.benefits)
                  : (plan.benefits || []);
                const isFeatured = idx === featuredIdx;
                const isVip = plan.name?.toLowerCase().includes('vip');

                return (
                  <ScrollReveal key={plan.id} delay={idx * 0.1} className="h-full">
                    <div className={`membership-card ${isFeatured ? 'membership-card-featured' : 'membership-card-base'} h-full`}>

                      {/* Featured top bar */}
                      {isFeatured && (
                        <div className="relative overflow-hidden"
                          style={{ height: '4px', background: 'linear-gradient(90deg, transparent, #C9A84C, #E8C96A, #C9A84C, transparent)' }}>
                          <div className="absolute inset-0 animate-gold-shine"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }} />
                        </div>
                      )}

                      {/* VIP badge */}
                      {isVip && (
                        <div className="absolute top-5 right-5 z-10">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, #C9A84C, #E8C96A)',
                              fontSize: '9px',
                              fontFamily: 'Raleway, sans-serif',
                              fontWeight: 800,
                              letterSpacing: '0.2em',
                              color: '#0A0A0A',
                              textTransform: 'uppercase'
                            }}>
                            <Star size={8} fill="currentColor" /> ELITE VIP
                          </div>
                        </div>
                      )}

                      <div className="p-6 sm:p-8 flex flex-col h-full">
                        {/* Plan Icon & Name */}
                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isFeatured
                                  ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))'
                                  : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isFeatured ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              <CrownIcon size={18} className={isFeatured ? 'text-gold-400' : 'text-white/40'} />
                            </div>
                            <div>
                              <h3 className="font-display text-2xl sm:text-3xl text-white font-medium uppercase tracking-wider leading-none">
                                {plan.name}
                              </h3>
                            </div>
                          </div>
                          <p className="text-white/45 text-xs sm:text-sm font-body leading-relaxed"
                            style={{ minHeight: '2.5rem' }}>
                            {plan.description || 'Access premium benefits and personalized attention.'}
                          </p>
                        </div>

                        {/* Gold divider */}
                        <div className="gold-divider mb-6" />

                        {/* Pricing Block */}
                        <div className="mb-6 p-4 rounded-xl"
                          style={{
                            background: isFeatured ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isFeatured ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)'}`
                          }}>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-white/40 text-xs font-sans">Price</span>
                            <span className="font-display text-3xl sm:text-4xl font-semibold text-gold-400">
                              ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-white/30 text-[10px] font-sans tracking-[0.15em] mt-1.5 uppercase">
                            Valid for {plan.validity_days} Days &nbsp;·&nbsp; {Math.round(plan.validity_days / 30)} Months
                          </p>
                        </div>

                        {/* Benefits List */}
                        <div className="flex-1 space-y-3 mb-8">
                          {benefits.map((b, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{
                                  background: 'rgba(201,168,76,0.12)',
                                  border: '1px solid rgba(201,168,76,0.3)'
                                }}>
                                <Check size={9} className="text-gold-400" />
                              </div>
                              <span className="text-white/60 text-xs sm:text-[13px] font-body leading-relaxed">{b}</span>
                            </div>
                          ))}
                        </div>

                        {/* In-salon note */}
                        <div className="mt-auto p-4 rounded-xl text-center"
                          style={{
                            background: 'rgba(201,168,76,0.03)',
                            border: '1px solid rgba(201,168,76,0.1)'
                          }}>
                          <span className="block font-sans text-[9px] tracking-[0.25em] uppercase text-gold-500 mb-1">
                            ✦ IN-SALON PRIVILEGE ✦
                          </span>
                          <span className="block text-white/35 text-[10px] font-body italic leading-relaxed">
                            Exclusively at our Kondapur branch. Walk in today to activate.
                          </span>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Perks Strip ── */}
      <section className="py-12 border-y border-white/[0.04]"
        style={{ background: 'rgba(201,168,76,0.03)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { icon: '✦', label: '10–30% Off Services' },
              { icon: '⚡', label: 'Priority Booking' },
              { icon: '✨', label: 'Complimentary Treats' },
              { icon: '🎂', label: 'Birthday Specials' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="text-gold-400 text-2xl">{icon}</span>
                <span className="text-white/60 text-[11px] font-sans tracking-wide uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <h2 className="font-display text-3xl sm:text-4xl text-white text-center mb-12 font-light tracking-wide">
              Membership <span className="italic text-gold-400">FAQs</span>
            </h2>
          </ScrollReveal>

          <div className="space-y-0">
            {[
              { q: 'Can I upgrade my plan later?', a: 'Yes, you can upgrade to a higher plan anytime. The remaining value of your current plan will be adjusted.' },
              { q: 'How does the discount work?', a: 'Your membership discount is automatically applied to every service booking during your membership period.' },
              { q: 'Is the membership transferable?', a: 'Memberships are personal and tied to your account. They cannot be transferred to another person.' },
              { q: 'What happens when my membership expires?', a: 'You will receive a reminder 7 days before expiry. You can renew to continue enjoying member benefits.' },
            ].map(({ q, a }, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="py-6 border-b border-white/[0.05] group cursor-default">
                  <h4 className="font-display text-lg sm:text-xl text-white mb-2 font-light group-hover:text-gold-400 transition-colors duration-300">
                    {q}
                  </h4>
                  <p className="text-white/45 text-sm font-body leading-relaxed font-light">{a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
