import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Key } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [directOtp, setDirectOtp] = useState(null); // returned when email is not configured
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setSent(true);
      // If backend returns OTP directly (email not configured), show it
      if (res.data?.otp) {
        setDirectOtp(res.data.otp);
        toast.success('OTP generated! Check the code below.');
      } else {
        toast.success('Reset email sent! Check your inbox.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-salon-black flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="text-gold-500/60 text-xs font-sans tracking-widest uppercase flex items-center gap-2 mb-10 hover:text-gold-500">
          <ArrowLeft size={12} /> Back to Login
        </Link>
        <div className="font-display text-gold-500 text-xl tracking-widest mb-8">✦ LUXE SALON</div>
        {!sent ? (
          <>
            <h1 className="font-display text-4xl text-salon-white font-light mb-2">Reset Password</h1>
            <p className="text-salon-muted text-sm font-body mb-8">Enter your email address and we'll send you a 6-digit OTP and reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-gold">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-dark" required />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : <Mail size={14} />}
                {loading ? 'Sending...' : 'Send OTP & Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gold-500/20 border border-gold-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                {directOtp ? <Key size={28} className="text-gold-500" /> : <Mail size={28} className="text-gold-500" />}
              </div>
              <h2 className="font-display text-3xl text-salon-white mb-2">
                {directOtp ? 'Your OTP is Ready!' : 'Email Sent!'}
              </h2>
              {directOtp ? (
                <p className="text-salon-muted font-body text-sm">
                  Email sending is not configured yet. Use this OTP to reset your password:
                </p>
              ) : (
                <div>
                  <p className="text-salon-muted font-body text-sm mb-5">
                    If <span className="text-gold-500">{email}</span> is registered, you'll receive an email with a 6-digit OTP and a reset link.
                  </p>
                  <div className="bg-gold-500/10 border border-gold-500/30 rounded-md p-4 flex items-start gap-3 text-left shadow-lg">
                    <div className="text-gold-500 mt-0.5 text-lg">💡</div>
                    <p className="text-gold-500/90 text-sm font-body leading-relaxed">
                      <span className="font-semibold text-gold-500 block mb-0.5">Didn't see the email?</span> 
                      Please make sure to check your <strong className="text-white">spam or junk folder</strong>, as automated emails can occasionally get caught there.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {directOtp && (
              <div className="bg-salon-card border-2 border-dashed border-gold-500/50 rounded p-6 text-center mb-6">
                <p className="text-salon-muted text-xs font-sans tracking-widest uppercase mb-3">Your OTP Code</p>
                <div className="text-5xl font-bold tracking-[0.3em] text-gold-500 font-mono mb-3">{directOtp}</div>
                <p className="text-salon-muted text-xs">Valid for 1 hour</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="btn-gold py-3.5 w-full"
              >
                Enter OTP to Reset Password
              </button>
              <Link to="/login" className="text-center text-salon-muted hover:text-white font-sans text-sm tracking-wider uppercase">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
