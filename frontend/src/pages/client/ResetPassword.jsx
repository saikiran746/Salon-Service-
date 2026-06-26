import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // If token is present, we are in Link mode. Otherwise, OTP mode.
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email') || '';

  const [form, setForm] = useState({
    email: emailFromUrl,
    otp: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        password: form.password
      };

      if (tokenFromUrl) {
        payload.token = tokenFromUrl;
      } else {
        if (!form.otp || !form.email) {
          toast.error('Email and OTP are required');
          setLoading(false);
          return;
        }
        payload.email = form.email;
        payload.otp = form.otp;
      }

      await authAPI.resetPassword(payload);
      setSuccess(true);
      toast.success('Password successfully reset!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Token or OTP may be invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-salon-black flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center py-8">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={28} className="text-emerald-500" />
          </div>
          <h2 className="font-display text-3xl text-salon-white mb-3">Password Reset!</h2>
          <p className="text-salon-muted font-body leading-relaxed mb-8">
            Your password has been successfully updated. You can now log in with your new password.
          </p>
          <Link to="/login" className="btn-gold px-8 py-3 inline-block">Proceed to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-salon-black flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-10 hover:text-gold-500">
          <ArrowLeft size={12} /> Back to Login
        </Link>
        
        <div className="font-display text-gold-500 text-xl tracking-widest mb-8">✦ TONI & GUY</div>
        
        <h1 className="font-display text-4xl text-salon-white font-light mb-2">Create New Password</h1>
        <p className="text-salon-muted text-sm font-body mb-8">
          {tokenFromUrl ? "Enter your new password below." : "Enter your email, the 6-digit OTP sent to you, and your new password."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!tokenFromUrl && (
            <>
              <div>
                <label className="label-gold">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="your@email.com" 
                  className="input-dark" 
                  required 
                />
              </div>
              <div>
                <label className="label-gold">6-Digit OTP</label>
                <input 
                  type="text" 
                  name="otp"
                  value={form.otp} 
                  onChange={handleChange} 
                  placeholder="123456" 
                  className="input-dark tracking-[0.25em] font-bold text-lg text-center" 
                  maxLength={6}
                  required 
                />
              </div>
            </>
          )}

          <div>
            <label className="label-gold">New Password</label>
            <input 
              type="password" 
              name="password"
              value={form.password} 
              onChange={handleChange} 
              placeholder="••••••••" 
              className="input-dark" 
              required 
              minLength={6}
            />
          </div>
          <div>
            <label className="label-gold">Confirm New Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={form.confirmPassword} 
              onChange={handleChange} 
              placeholder="••••••••" 
              className="input-dark" 
              required 
            />
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : <Lock size={14} />}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
