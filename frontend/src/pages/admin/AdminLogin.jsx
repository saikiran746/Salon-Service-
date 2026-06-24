import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield } from 'lucide-react';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.adminLogin(form);
      login(data.data.user, data.data.token, data.data.refreshToken);
      toast.success('Welcome back, Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-salon-black flex items-center justify-center px-6 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, #C9A84C 2px, transparent 0)', backgroundSize: '50px 50px' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-gold-500/10 border border-gold-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-gold-500" />
          </div>
          <div className="font-display text-gold-500 text-lg tracking-wider">✦ TONI & GUY ESSENSUALS Kondapur</div>
          <p className="text-salon-muted text-[10px] tracking-widest font-sans uppercase mt-1">Admin Control Panel</p>
        </div>

        <div className="bg-salon-card border border-salon-border p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl text-salon-white font-light mb-1">Admin Login</h1>
            <p className="text-salon-muted text-sm font-body">Restricted access. Authorized personnel only.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-gold">Admin Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="input-dark" required autoComplete="off" />
            </div>
            <div>
              <label className="label-gold">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••••" className="input-dark pr-10" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-gold-500">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-gold-500/80 hover:text-gold-500 text-xs font-sans tracking-wider">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <><Shield size={14} /> Access Admin Panel</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-salon-border text-center">
            <Link to="/" className="text-salon-muted text-xs font-sans tracking-wider hover:text-gold-500 transition-colors">
              ← Return to Website
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-salon-border text-xs font-sans">Protected by end-to-end encryption</p>
        </div>
      </div>
    </div>
  );
}
