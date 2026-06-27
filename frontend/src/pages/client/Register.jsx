// ===== REGISTER PAGE =====
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match.');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      login(data.data.user, data.data.token, data.data.refreshToken);
      toast.success('Account created! Welcome to TONI & GUY.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const { data } = await authAPI.googleLogin({ token: tokenResponse.access_token });
      login(data.data.user, data.data.token, data.data.refreshToken);
      toast.success('Account accessed! Welcome to TONI & GUY.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google signup failed.'),
  });

  return (
    <div className="min-h-screen bg-salon-black flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=80" alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-salon-black/80 to-salon-black/20" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-16">
          <Link to="/" className="text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-16 hover:text-gold-500">
            <ArrowLeft size={12} /> Back to Home
          </Link>
          <div className="font-display text-gold-500 text-2xl tracking-widest mb-2">✦ TONI & GUY</div>
          <h2 className="font-display text-5xl text-white font-light leading-tight mb-6">Begin Your<br />Journey</h2>
          <p className="text-white/50 font-body leading-relaxed max-w-sm">
            Create your account to book appointments, track your history and unlock exclusive member benefits.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-10 hover:text-gold-500">
            <ArrowLeft size={12} /> Back
          </Link>
          <div className="mb-10">
            <h1 className="font-display text-4xl text-salon-white font-light mb-2">Create Account</h1>
            <p className="text-salon-muted text-sm font-body">Join the TONI & GUY community</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' },
              { label: 'Email Address', key: 'email', type: 'email', placeholder: 'your@email.com' },
              { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="label-gold">{label}</label>
                <input 
                  type={type} 
                  value={form[key]} 
                  onChange={e => {
                    const val = key === 'name' ? e.target.value.replace(/[0-9]/g, '') : e.target.value;
                    setForm(p => ({ ...p, [key]: val }));
                  }}
                  pattern={key === 'name' ? "[A-Za-z ]+" : undefined}
                  title={key === 'name' ? "Name must contain only letters and spaces" : undefined}
                  placeholder={placeholder} 
                  className="input-dark" 
                  required={key !== 'phone'} 
                />
              </div>
            ))}
            <div>
              <label className="label-gold">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 8 characters" className="input-dark pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-gold-500">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-gold">Confirm Password</label>
              <input type="password" value={form.confirm_password}
                onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Repeat password" className="input-dark" required />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="relative w-full text-center">
              <span className="bg-salon-black px-3 text-salon-muted text-xs relative z-10">OR CONTINUE WITH</span>
              <div className="absolute top-1/2 left-0 w-full h-px bg-salon-border"></div>
            </div>
            <div className="flex justify-center w-full">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full max-w-[350px] flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 rounded-md py-2.5 px-4 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 focus:ring-offset-salon-black"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.73 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span className="font-medium">Continue with Google</span>
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-salon-muted text-sm font-body">
              Already have an account?{' '}
              <Link to="/login" className="text-gold-500 hover:text-gold-400 font-semibold">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
