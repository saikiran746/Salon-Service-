import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { settingsAPI } from '../../services/api';
import { formatTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  Save, Loader, Shield, Lock, Mail, Eye, EyeOff,
  Clock, Bell, ChevronDown, ChevronUp, AlertTriangle, CheckCircle
} from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialSecondaryEmail, setInitialSecondaryEmail] = useState('');
  const [isEmailUnlocked, setIsEmailUnlocked] = useState(false);
  
  // OTP Modal State for Email Change
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // OTP Modal State for Credential Change
  const [credOtpModalOpen, setCredOtpModalOpen] = useState(false);
  const [credOtpValue, setCredOtpValue] = useState('');
  const [credOtpLoading, setCredOtpLoading] = useState(false);
  const [pendingCredPayload, setPendingCredPayload] = useState(null);

  // ── Site settings form ──
  const [form, setForm] = useState({
    site_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    maps_link: '',
    instagram: '',
    facebook: '',
    twitter: '',
    working_hours: '',
    gstin: '',
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    closed_days: [],
    closed_slots: [],
    slot_interval: 30,
    open_time: '09:00',
    close_time: '20:00',
    secondary_alert_email: '',
  });

  // ── Admin credentials form ──
  const [credOpen, setCredOpen] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [creds, setCreds] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    settingsAPI.get()
      .then(res => {
        if (res.data?.data) {
          const rawData = res.data.data;
          let parsedClosed = [];
          try { parsedClosed = rawData.closed_days ? JSON.parse(rawData.closed_days) : []; } catch { parsedClosed = []; }
          let parsedClosedSlots = [];
          try { parsedClosedSlots = rawData.closed_slots ? JSON.parse(rawData.closed_slots) : []; } catch { parsedClosedSlots = []; }
            setInitialSecondaryEmail(rawData.secondary_alert_email || '');
            if (!rawData.secondary_alert_email) setIsEmailUnlocked(true);
            setForm({
              ...rawData,
              closed_days: parsedClosed,
              closed_slots: parsedClosedSlots,
              slot_interval: rawData.slot_interval ? parseInt(rawData.slot_interval, 10) : 30,
              open_time: rawData.open_time || '09:00',
              close_time: rawData.close_time || '20:00',
              secondary_alert_email: rawData.secondary_alert_email || '',
            });
        }
      })
      .catch(err => {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        closed_days: JSON.stringify(form.closed_days || []),
        closed_slots: JSON.stringify(form.closed_slots || []),
        slot_interval: parseInt(form.slot_interval, 10) || 30,
        open_time: form.open_time || '09:00',
        close_time: form.close_time || '20:00',
        // We do NOT send secondary_alert_email here to prevent bypassing OTP.
        // It must be saved via the dedicated "Save Email" button below.
      };
      await settingsAPI.update(payload);
      toast.success('Settings updated successfully!');
    } catch (err) {
      console.error('Failed to update settings', err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCredChange = (e) => {
    setCreds(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCredSubmit = async (e) => {
    e.preventDefault();
    if (!creds.currentPassword) { toast.error('Current password is required.'); return; }
    if (!creds.newEmail && !creds.newPassword) { toast.error('Provide a new email or new password to update.'); return; }
    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) {
      toast.error('New password and confirm password do not match.'); return;
    }
    if (creds.newPassword && creds.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.'); return;
    }

    setCredSaving(true);
    try {
      const payload = { currentPassword: creds.currentPassword };
      if (creds.newEmail) payload.newEmail = creds.newEmail;
      if (creds.newPassword) { payload.newPassword = creds.newPassword; payload.confirmPassword = creds.confirmPassword; }

      const res = await settingsAPI.requestCredChangeOtp(payload);
      
      if (res.data.otpRequired) {
        setPendingCredPayload(payload);
        setCredOtpModalOpen(true);
      } else {
        const finalRes = await settingsAPI.changeAdminCredentials(payload);
        toast.success(finalRes.data.message || 'Credentials updated! A security notification has been sent.');
        setCreds({ currentPassword: '', newEmail: '', newPassword: '', confirmPassword: '' });
        setCredOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request OTP / update credentials.';
      toast.error(msg);
    } finally {
      setCredSaving(false);
    }
  };

  const inputClass = 'w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 transition-colors placeholder:text-white/20';
  const labelClass = 'block text-xs font-sans tracking-wider text-white/50 uppercase mb-2';

  return (
    <AdminLayout title="Site Settings">
      <div className="max-w-4xl space-y-6">

        {/* ──────────────────────────────────────────── */}
        {/* MAIN SETTINGS CARD                          */}
        {/* ──────────────────────────────────────────── */}
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-xl font-display text-white">Global Configuration</h2>
            <p className="text-sm text-white/40 mt-1 font-sans">
              Update the contact information, social links, and other details that appear on the public website.
            </p>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader size={30} className="animate-spin text-[#C9A84C]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── General Info ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Site Name</label>
                  <input type="text" name="site_name" value={form.site_name || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Number</label>
                  <input type="text" name="whatsapp" value={form.whatsapp || ''} onChange={handleChange} className={inputClass} placeholder="+919876543210" />
                </div>
                <div>
                  <label className={labelClass}>Public Email(s)</label>
                  <textarea name="email" value={form.email || ''} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="One per line" />
                </div>
                <div>
                  <label className={labelClass}>Phone Number(s)</label>
                  <textarea name="phone" value={form.phone || ''} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="One per line" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Physical Address</label>
                  <textarea name="address" value={form.address || ''} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Google Maps Embed URL / Regular Link</label>
                  <input type="text" name="maps_link" value={form.maps_link || ''} onChange={handleChange} className={inputClass} placeholder="https://www.google.com/maps/embed?..." />
                  <p className="text-xs text-white/30 mt-1 font-sans">If you use an "Embed a map" URL (starts with /maps/embed), the map will be visible on the page.</p>
                </div>
                <div>
                  <label className={labelClass}>Instagram URL</label>
                  <input type="text" name="instagram" value={form.instagram || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Facebook URL</label>
                  <input type="text" name="facebook" value={form.facebook || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Twitter URL</label>
                  <input type="text" name="twitter" value={form.twitter || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Working Hours</label>
                  <textarea name="working_hours" value={form.working_hours || ''} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} placeholder="Mon-Sat: 9AM - 8PM" />
                </div>
              </div>

              {/* ── Invoice Configuration ── */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="mb-6">
                  <h3 className="text-lg font-display text-white">Invoice Configuration</h3>
                  <p className="text-sm text-white/40 mt-1 font-sans">These details appear on all generated invoice PDFs.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input type="text" name="gstin" value={form.gstin || ''} onChange={handleChange} className={inputClass} placeholder="27AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input type="text" name="bank_name" value={form.bank_name || ''} onChange={handleChange} className={inputClass} placeholder="e.g. HDFC Bank" />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input type="text" name="ifsc_code" value={form.ifsc_code || ''} onChange={handleChange} className={inputClass} placeholder="e.g. HDFC0001234" />
                  </div>
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <input type="text" name="account_number" value={form.account_number || ''} onChange={handleChange} className={inputClass} placeholder="e.g. 9876543210987" />
                  </div>
                </div>
              </div>

              {/* ── Salon Timings & Slot Interval ── */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="mb-6 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={18} className="text-[#C9A84C]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-white">Booking Slots & Timings</h3>
                    <p className="text-sm text-white/40 mt-1 font-sans">
                      Set the opening hours and the time gap between available booking slots. This applies to both the customer booking portal and the admin appointment panel.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Open Time</label>
                    <select
                      name="open_time"
                      value={form.open_time || '09:00'}
                      onChange={handleChange}
                      className={`${inputClass} cursor-pointer`}
                      required
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = (i % 2) * 30;
                        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        return (
                          <option key={val} value={val}>{formatTime(val)}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Close Time</label>
                    <select
                      name="close_time"
                      value={form.close_time || '20:00'}
                      onChange={handleChange}
                      className={`${inputClass} cursor-pointer`}
                      required
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2);
                        const m = (i % 2) * 30;
                        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        return (
                          <option key={val} value={val}>{formatTime(val)}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Slot Duration</label>
                    <select
                      name="slot_interval"
                      value={form.slot_interval || 30}
                      onChange={handleChange}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes (default)</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (1 hour)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex items-center">
                  <div className="w-full bg-white/[0.03] border border-white/8 rounded-xl p-4">
                    <p className="text-xs text-white/40 font-sans uppercase tracking-wider mb-3">Preview — First slots of the day</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const interval = parseInt(form.slot_interval, 10) || 30;
                        const parseTime = (str) => {
                          if (!str) return 0;
                          const [h, m] = str.split(':').map(Number);
                          return (h * 60) + (m || 0);
                        };
                        const openMins = parseTime(form.open_time || '09:00');
                        
                        const preview = [];
                        for (let m = openMins; m < openMins + (interval * 4); m += interval) {
                          const h = Math.floor(m / 60);
                          const min = m % 60;
                          preview.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                        }
                        return preview.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-lg text-[#C9A84C] text-xs font-mono">
                            {formatTime(s)}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Weekly Availability ── */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="mb-6">
                  <h3 className="text-lg font-display text-white">Weekly Availability Settings</h3>
                  <p className="text-sm text-white/40 mt-1 font-sans">
                    Enable or disable booking availability for each day of the week. Turn "Off" to mark a day as closed.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isClosed = form.closed_days?.includes(day);
                    const isOpen = !isClosed;
                    const handleToggle = () => {
                      let updatedClosed = [...(form.closed_days || [])];
                      if (isClosed) { updatedClosed = updatedClosed.filter(d => d !== day); }
                      else { updatedClosed.push(day); }
                      setForm(prev => ({ ...prev, closed_days: updatedClosed }));
                    };
                    return (
                      <div key={day} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <div>
                          <p className="text-xs font-sans font-medium text-white/80">{day}</p>
                          <p className={`text-[10px] font-sans mt-0.5 ${isOpen ? 'text-emerald-500 font-medium' : 'text-white/30'}`}>
                            {isOpen ? 'Open for Bookings' : 'Closed'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggle}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isOpen ? 'bg-[#C9A84C]' : 'bg-white/10'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${isOpen ? 'translate-x-4' : 'translate-x-0 bg-white/60'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Save Button ── */}
              <div className="pt-4 border-t border-white/10 flex justify-end mt-6">
                <button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold font-sans tracking-wider rounded-lg px-6 py-2.5 transition-colors flex items-center gap-2 disabled:opacity-60">
                  {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Settings
                </button>
              </div>

            </form>
          )}
        </div>

        {/* ──────────────────────────────────────────── */}
        {/* ADMIN SECURITY CARD                         */}
        {/* ──────────────────────────────────────────── */}
        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-xl">
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-white/10 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-display text-white">Admin Security Settings</h2>
              <p className="text-sm text-white/40 mt-1 font-sans">
                Manage admin login credentials and configure a secondary security alert email.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader size={24} className="animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Secondary alert email — saved with site settings */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={15} className="text-amber-400" />
                  <label className="text-sm font-sans font-semibold text-white/80">Secondary Security Alert Email</label>
                </div>
                <p className="text-xs text-white/40 font-sans mb-3">
                  When admin credentials (email or password) are changed, an automated security alert will be sent to this email address. Leave blank to disable. Uses the same email system as invoices and booking confirmations.
                </p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={form.secondary_alert_email || ''}
                      onChange={e => setForm(prev => ({ ...prev, secondary_alert_email: e.target.value }))}
                      disabled={!isEmailUnlocked}
                      className={`w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none transition-colors placeholder:text-white/20 ${!isEmailUnlocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-amber-500/60'}`}
                      placeholder="backup@example.com"
                    />
                  </div>
                  
                  {!isEmailUnlocked ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await settingsAPI.requestEmailOtp({});
                          toast.success('OTP sent to your current email address!');
                          setOtpModalOpen(true);
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to request OTP');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-sans rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {saving ? <Loader size={15} className="animate-spin" /> : <Shield size={15} />}
                      Change Email
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const payload = {
                            ...form,
                            closed_days: JSON.stringify(form.closed_days || []),
                            closed_slots: JSON.stringify(form.closed_slots || []),
                            slot_interval: parseInt(form.slot_interval, 10) || 30,
                            secondary_alert_email: form.secondary_alert_email || '',
                          };
                          await settingsAPI.update(payload);
                          setInitialSecondaryEmail(form.secondary_alert_email || '');
                          if (form.secondary_alert_email) setIsEmailUnlocked(false);
                          toast.success('Secondary alert email saved!');
                        } catch (err) {
                          toast.error('Failed to save email');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-sans rounded-lg border border-amber-500/20 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                      Save Email
                    </button>
                  )}
                </div>
                {form.secondary_alert_email && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-sans">Security alerts will be sent to <strong>{initialSecondaryEmail || form.secondary_alert_email}</strong></p>
                  </div>
                )}
                
                {/* OTP Modal for Email Change */}
                {otpModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
                      <h3 className="text-lg font-display text-white mb-2">Verify Security Change</h3>
                      <p className="text-xs text-white/50 mb-4 font-sans">Enter the 6-digit OTP sent to your old secondary email address to authorize this change.</p>
                      <input
                        type="text"
                        value={otpValue}
                        onChange={e => setOtpValue(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white mb-4 focus:outline-none focus:border-amber-500/60"
                      />
                      <div className="flex justify-end gap-3">
                        <button onClick={() => { setOtpModalOpen(false); setOtpValue(''); }} className="px-4 py-2 text-sm text-white/40 hover:text-white/70 font-sans transition-colors">Cancel</button>
                        <button
                          onClick={async () => {
                            setOtpLoading(true);
                            try {
                              await settingsAPI.verifyEmailOtp({ newEmail: initialSecondaryEmail, otp: otpValue });
                              toast.success('Verified! You can now edit the email address.');
                              setIsEmailUnlocked(true);
                              setOtpModalOpen(false);
                              setOtpValue('');
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Invalid OTP');
                            } finally {
                              setOtpLoading(false);
                            }
                          }}
                          disabled={otpLoading || otpValue.length < 6}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold font-sans text-sm rounded-lg px-5 py-2 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                          {otpLoading && <Loader size={14} className="animate-spin" />}
                          Verify & Update
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-white/8" />

              {/* Change Credentials — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setCredOpen(v => !v)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/8 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-amber-400" />
                    <div className="text-left">
                      <p className="text-sm font-sans font-semibold text-white/90">Change Admin Login Credentials</p>
                      <p className="text-xs text-white/35 font-sans mt-0.5">Update your admin email address or password</p>
                    </div>
                  </div>
                  {credOpen
                    ? <ChevronUp size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    : <ChevronDown size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  }
                </button>

                {credOpen && (
                  <div className="mt-3 p-5 bg-amber-500/[0.03] border border-amber-500/15 rounded-xl">

                    {/* Warning banner */}
                    <div className="flex items-start gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg mb-5">
                      <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300/80 font-sans leading-relaxed">
                        Changing credentials will log you out on next session. A <strong>security notification</strong> will appear in the admin notification panel.
                        {form.secondary_alert_email
                          ? ` A security alert email will also be sent to "${form.secondary_alert_email}".`
                          : ' Add a secondary alert email above to receive a security email notification.'}
                      </p>
                    </div>

                    <form onSubmit={handleCredSubmit} className="space-y-4">

                      {/* Current password — always required */}
                      <div>
                        <label className={labelClass}>Current Password <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type={showCurrentPw ? 'text' : 'password'}
                            name="currentPassword"
                            value={creds.currentPassword}
                            onChange={handleCredChange}
                            required
                            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors placeholder:text-white/20"
                            placeholder="Enter your current password"
                          />
                          <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            {showCurrentPw ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* New email (optional) */}
                        <div>
                          <label className={labelClass}>New Email <span className="text-white/25">(optional)</span></label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                              type="email"
                              name="newEmail"
                              value={creds.newEmail}
                              onChange={handleCredChange}
                              className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors placeholder:text-white/20"
                              placeholder="new@admin.com"
                            />
                          </div>
                          <p className="text-[10px] text-white/25 mt-1 font-sans">Leave blank to keep current email</p>
                        </div>

                        {/* Spacer on small screens */}
                        <div className="hidden md:block" />

                        {/* New password (optional) */}
                        <div>
                          <label className={labelClass}>New Password <span className="text-white/25">(optional)</span></label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                              type={showNewPw ? 'text' : 'password'}
                              name="newPassword"
                              value={creds.newPassword}
                              onChange={handleCredChange}
                              className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors placeholder:text-white/20"
                              placeholder="Min. 8 characters"
                            />
                            <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                              {showNewPw ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm new password */}
                        <div>
                          <label className={labelClass}>Confirm New Password</label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                              type={showConfirmPw ? 'text' : 'password'}
                              name="confirmPassword"
                              value={creds.confirmPassword}
                              onChange={handleCredChange}
                              className={`w-full bg-white/[0.04] border rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none transition-colors placeholder:text-white/20 ${
                                creds.newPassword && creds.confirmPassword && creds.newPassword !== creds.confirmPassword
                                  ? 'border-red-500/60 focus:border-red-500'
                                  : creds.newPassword && creds.confirmPassword && creds.newPassword === creds.confirmPassword
                                  ? 'border-emerald-500/60 focus:border-emerald-500'
                                  : 'border-white/10 focus:border-amber-500/60'
                              }`}
                              placeholder="Re-enter new password"
                            />
                            <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                              {showConfirmPw ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </div>
                          {creds.newPassword && creds.confirmPassword && (
                            <p className={`text-[10px] mt-1 font-sans ${creds.newPassword === creds.confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                              {creds.newPassword === creds.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setCredOpen(false); setCreds({ currentPassword: '', newEmail: '', newPassword: '', confirmPassword: '' }); }}
                          className="px-4 py-2 text-sm text-white/40 hover:text-white/70 font-sans transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={credSaving}
                          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold font-sans text-sm rounded-lg px-5 py-2.5 transition-colors disabled:opacity-60"
                        >
                          {credSaving ? <Loader size={14} className="animate-spin" /> : <Shield size={14} />}
                          Update Credentials
                        </button>
                      </div>

                    </form>
                  </div>
                )}
                
                {/* OTP Modal for Credentials Change */}
                {credOtpModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
                      <h3 className="text-lg font-display text-white mb-2">Verify Credentials Update</h3>
                      <p className="text-xs text-white/50 mb-4 font-sans">Enter the 6-digit OTP sent to your secondary email address to authorize these changes.</p>
                      <input
                        type="text"
                        value={credOtpValue}
                        onChange={e => setCredOtpValue(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white mb-4 focus:outline-none focus:border-amber-500/60"
                      />
                      <div className="flex justify-end gap-3">
                        <button onClick={() => { setCredOtpModalOpen(false); setCredOtpValue(''); setPendingCredPayload(null); }} className="px-4 py-2 text-sm text-white/40 hover:text-white/70 font-sans transition-colors">Cancel</button>
                        <button
                          onClick={async () => {
                            setCredOtpLoading(true);
                            try {
                              const finalPayload = { ...pendingCredPayload, otp: credOtpValue };
                              const res = await settingsAPI.changeAdminCredentials(finalPayload);
                              toast.success(res.data.message || 'Credentials updated! A security notification has been sent.');
                              setCredOtpModalOpen(false);
                              setCredOtpValue('');
                              setPendingCredPayload(null);
                              setCreds({ currentPassword: '', newEmail: '', newPassword: '', confirmPassword: '' });
                              setCredOpen(false);
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Invalid OTP');
                            } finally {
                              setCredOtpLoading(false);
                            }
                          }}
                          disabled={credOtpLoading || credOtpValue.length < 6}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold font-sans text-sm rounded-lg px-5 py-2 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                          {credOtpLoading && <Loader size={14} className="animate-spin" />}
                          Verify & Update
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
