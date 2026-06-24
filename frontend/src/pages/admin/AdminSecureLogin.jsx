import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

/**
 * AdminSecureLogin — handles the one-time magic link from security alert emails.
 * Route: /admin/secure-login?token=<uuid>
 *
 * Flow:
 *  1. Read ?token from URL
 *  2. POST to /api/auth/admin/magic-login with the token
 *  3. On success: store JWT → set auth context → redirect to /admin/settings
 *  4. On failure: show error with a fallback "Go to Login" button
 */
export default function AdminSecureLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('No security token found in this link. Please log in manually.');
      return;
    }

    let cancelled = false;

    const doMagicLogin = async () => {
      try {
        const { data } = await authAPI.adminMagicLogin(token);
        if (cancelled) return;

        // Store session
        login(data.data.user, data.data.token, data.data.refreshToken);
        setStatus('success');

        // Short delay so the user sees the success state, then redirect to settings
        setTimeout(() => {
          if (!cancelled) navigate('/admin/settings', { replace: true });
        }, 2000);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message ||
          'This security link is invalid or has already been used. Please log in manually.';
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    doMagicLogin();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-salon-black flex items-center justify-center px-6 relative">
      {/* Subtle gold dot grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, #C9A84C 2px, transparent 0)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-10">
          <div className="w-16 h-16 bg-gold-500/10 border border-gold-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
            {status === 'verifying' && (
              <Loader2 size={28} className="text-gold-500 animate-spin" />
            )}
            {status === 'success' && (
              <ShieldCheck size={28} className="text-emerald-400" />
            )}
            {status === 'error' && (
              <ShieldAlert size={28} className="text-red-400" />
            )}
          </div>
          <div className="font-display text-gold-500 text-lg tracking-wider">
            ✦ TONI &amp; GUY ESSENSUALS
          </div>
          <p className="text-salon-muted text-[10px] tracking-widest font-sans uppercase mt-1">
            Admin Security Portal
          </p>
        </div>

        <div className="bg-salon-card border border-salon-border p-10 shadow-2xl">
          {/* ── Verifying ── */}
          {status === 'verifying' && (
            <>
              <h1 className="font-display text-2xl text-salon-white font-light mb-3">
                Verifying Security Link
              </h1>
              <p className="text-salon-muted text-sm font-body leading-relaxed">
                Please wait while we validate your one-time security token and
                establish a secure admin session…
              </p>
              <div className="mt-8 flex justify-center">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-gold-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={22} className="text-emerald-400" />
              </div>
              <h1 className="font-display text-2xl text-salon-white font-light mb-3">
                Access Granted
              </h1>
              <p className="text-salon-muted text-sm font-body leading-relaxed">
                Your identity has been verified. Redirecting you to{' '}
                <span className="text-gold-500">Admin Settings</span> so you can
                review and secure your credentials…
              </p>
              <div className="mt-6 h-1 bg-salon-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 rounded-full"
                  style={{ width: '100%', transition: 'width 1.8s linear' }}
                />
              </div>
            </>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
                <ShieldAlert size={22} className="text-red-400" />
              </div>
              <h1 className="font-display text-2xl text-salon-white font-light mb-3">
                Link Expired or Used
              </h1>
              <p className="text-salon-muted text-sm font-body leading-relaxed mb-6">
                {errorMsg}
              </p>
              <div
                className="bg-red-500/5 border border-red-500/20 rounded p-4 text-xs text-red-300/80 font-sans leading-relaxed mb-6 text-left"
              >
                <strong className="text-red-300">Why does this happen?</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Security links expire after <strong>1 hour</strong>.</li>
                  <li>Each link can only be used <strong>once</strong>.</li>
                  <li>If credentials were changed again, a new link was sent.</li>
                </ul>
              </div>
              <button
                onClick={() => navigate('/admin/login', { replace: true })}
                className="btn-gold w-full py-3.5 flex items-center justify-center gap-2"
              >
                <Shield size={14} />
                Go to Admin Login
              </button>
            </>
          )}
        </div>

        <p className="text-salon-border text-xs font-sans mt-6">
          Protected by end-to-end encryption · One-time access only
        </p>
      </div>
    </div>
  );
}
