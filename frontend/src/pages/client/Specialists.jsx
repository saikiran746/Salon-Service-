import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Award, ArrowRight } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { staffAPI } from '../../services/api';

export default function Specialists() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffAPI.getAll({ is_active: 1 }).then(r => setStaff(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-salon-black">
      <Navbar />
      <section className="pt-32 pb-16 bg-salon-dark border-b border-salon-border text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold-500" /><span className="text-gold-500 text-xs tracking-[0.35em] font-sans uppercase">Our Team</span><div className="h-px w-8 bg-gold-500" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-light text-salon-white mb-4">Master Specialists</h1>
          <p className="text-salon-muted font-body text-lg max-w-xl mx-auto">Each specialist is hand-picked for their artistry, experience, and passion for excellence.</p>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-salon-card border border-salon-border p-6 flex gap-4">
                <div className="w-20 h-20 rounded-full shimmer shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-4 shimmer rounded w-3/4" /><div className="h-3 shimmer rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {staff.map((member) => (
              <div key={member.id} className="group bg-salon-card border border-salon-border hover:border-gold-500/40 transition-all duration-300 overflow-hidden">
                <div className="aspect-[3/2] overflow-hidden bg-salon-dark relative">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Award size={50} className="text-gold-500/20" /></div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-salon-black to-transparent">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} className={i < Math.round(member.rating || 0) ? 'text-gold-500 fill-gold-500' : 'text-salon-border'} />
                      ))}
                      <span className="text-white/60 text-xs font-body ml-1">({member.review_count || 0})</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl text-salon-white mb-1">{member.name}</h3>
                  <p className="text-gold-500 text-xs font-sans tracking-widest uppercase mb-3">
                    {member.specializations?.split(',').map(s => s.trim()).join(' • ')}
                  </p>
                  <p className="text-salon-muted text-sm font-body leading-relaxed mb-3 line-clamp-2">{member.bio}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-salon-border">
                    <span className="text-salon-muted text-xs font-sans">{member.experience} Experience</span>
                    <Link to={`/book?staff=${member.id}`} className="text-gold-500 text-xs font-sans tracking-widest uppercase hover:text-gold-400 flex items-center gap-1">
                      Book <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
