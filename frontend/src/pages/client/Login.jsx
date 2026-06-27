import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      
      if (data.data.user.role === 'admin' || data.data.user.role === 'super_admin') {
        toast.error('Invalid credentials.');
        return;
      }

      login(data.data.user, data.data.token, data.data.refreshToken);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate(from);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const { data } = await authAPI.googleLogin({ token: tokenResponse.access_token });
      login(data.data.user, data.data.token, data.data.refreshToken);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate(from);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error('Google Login failed.'),
  });

  return (
    <div className="min-h-screen bg-salon-black flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80" alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-salon-black/80 to-salon-black/20" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-16">
          <Link to="/" className="text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-16 hover:text-gold-500 transition-colors">
            <ArrowLeft size={12} /> Back to Home
          </Link>
          <div className="font-display text-gold-500 text-2xl tracking-widest mb-2">✦ TONI & GUY</div>
          <h2 className="font-display text-5xl text-white font-light leading-tight mb-6">
            Welcome<br />Back
          </h2>
          <p className="text-white/50 font-body leading-relaxed max-w-sm">
            Sign in to manage your appointments, access exclusive member benefits, and track your salon journey.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-10 hover:text-gold-500 transition-colors">
            <ArrowLeft size={12} /> Back
          </Link>

          <div className="mb-10">
            <h1 className="font-display text-4xl text-salon-white font-light mb-2">Sign In</h1>
            <p className="text-salon-muted text-sm font-body">Access your TONI & GUY account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-gold">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com" className="input-dark" required />
            </div>
            <div>
              <label className="label-gold">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" className="input-dark pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-gold-500 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-gold-500 text-xs font-sans hover:text-gold-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" />Signing in...</> : 'Sign In'}
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
              Don't have an account?{' '}
              <Link to="/register" className="text-gold-500 hover:text-gold-400 transition-colors font-semibold">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
