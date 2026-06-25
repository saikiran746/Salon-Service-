import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, appointmentsAPI, billingAPI, customersAPI } from '../../services/api';
import { formatTime } from '../../utils/helpers';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Calendar, Receipt, Crown as CrownIcon, User, LogOut, X, Download, Edit2, Save, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  confirmed: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-gray', in_progress: 'badge-gold', no_show: 'badge-red',
};

const TABS = [
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'bills', label: 'My Bills', icon: Receipt },
  { key: 'membership', label: 'Membership', icon: CrownIcon},
  { key: 'profile', label: 'Profile', icon: User },
];

export default function ClientDashboard() {
  const { tab = 'appointments' } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [appts, bls, prof] = await Promise.all([
          appointmentsAPI.getMyAppointments({ limit: 20 }),
          billingAPI.getMyBills(),
          customersAPI.getMyProfile(),
        ]);
        setAppointments(appts.data.data);
        setBills(bls.data.data);
        setProfile(prof.data.data);
        setEditForm({ name: prof.data.data?.name || user?.name || '', phone: prof.data.data?.phone || '' });
      } catch { toast.error('Failed to load data.'); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await customersAPI.updateMyProfile(editForm);
      setProfile(p => ({ ...p, name: editForm.name, phone: editForm.phone }));
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
      
      // Reload bills because setting a phone number might fetch matching walk-in bills!
      const bls = await billingAPI.getMyBills();
      setBills(bls.data.data);
    } catch { toast.error('Failed to update profile.'); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match!');
    }
    try {
      await authAPI.setPassword({ newPassword });
      setIsSettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password set successfully! You can now log in with email and password.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to set password.'); }
  };

  const cancelAppointment = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentsAPI.cancel(id);
      setAppointments(p => p.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled.');
    } catch (err) { toast.error(err.response?.data?.message || 'Cancel failed.'); }
  };

  const downloadBill = async (id, invoiceNo) => {
    try {
      const { data } = await billingAPI.downloadInvoice(id);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = `${invoiceNo}.pdf`; a.click();
    } catch { toast.error('Download failed.'); }
  };

  return (
    <div className="min-h-screen bg-salon-black">
      <Navbar />
      <section className="pt-28 pb-0 bg-salon-dark border-b border-salon-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 bg-gold-500/20 border border-gold-500/30 rounded-full flex items-center justify-center">
              <span className="text-gold-500 font-display text-xl">{user?.name?.[0]}</span>
            </div>
            <div>
              <h1 className="font-display text-2xl text-salon-white">Welcome back, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-salon-muted text-xs font-sans tracking-wider">{profile?.membership_name ? `${profile.membership_name} Member` : 'Standard Account'}</p>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => navigate(`/dashboard/${key}`)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-sans tracking-wider uppercase whitespace-nowrap border-b-2 transition-all ${tab === key ? 'border-gold-500 text-gold-500' : 'border-transparent text-salon-muted hover:text-salon-white'}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-salon-border border-t-gold-500 rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Appointments */}
            {tab === 'appointments' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl text-salon-white">My Appointments</h2>
                  <Link to="/book" className="btn-gold text-xs px-5 py-2">+ Book New</Link>
                </div>
                {appointments.length === 0 ? (
                  <div className="text-center py-20 bg-salon-card border border-salon-border">
                    <Calendar size={40} className="text-salon-muted/30 mx-auto mb-4" />
                    <p className="text-salon-muted font-sans mb-4">No appointments yet</p>
                    <Link to="/book" className="btn-gold px-6 py-2.5">Book Your First Appointment</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map(appt => {
                      const isBilled = bills.some(b => b.appointment_id === appt.id);
                      return (
                      <div key={appt.id} className="bg-salon-card border border-salon-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-salon-border/80 transition-colors">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0 rounded-lg group-hover:scale-110 transition-transform">
                            <Calendar size={18} className="text-gold-500" />
                          </div>
                          <div>
                            <h4 className="font-sans text-salon-white font-semibold text-sm group-hover:text-gold-400 transition-colors">{appt.service_name}</h4>
                            <p className="text-salon-muted text-xs font-body mt-0.5">with {appt.staff_name}</p>
                            <p className="text-gold-500 text-xs font-sans mt-1">
                              {new Date(appt.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(appt.appointment_time)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-white/5 w-full sm:w-auto">
                          <span className={`badge ${STATUS_BADGE[appt.status] || 'badge-gray'} animate-glow-pulse`}>{appt.status}</span>
                          {appt.status !== 'completed' && (
                            <span className="text-salon-white font-display text-sm">₹{parseFloat(appt.price || 0).toLocaleString('en-IN')}</span>
                          )}
                          {['confirmed', 'pending'].includes(appt.status) && !isBilled && (
                            <button onClick={() => cancelAppointment(appt.id)} className="text-red-400/70 hover:text-red-400 bg-red-400/10 p-1.5 rounded-md transition-colors"><X size={15} /></button>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}

            {/* Bills */}
            {tab === 'bills' && (
              <div>
                <h2 className="font-display text-2xl text-salon-white mb-6">My Bills</h2>
                {bills.length === 0 ? (
                  <div className="text-center py-20 bg-salon-card border border-salon-border rounded-xl">
                    <Receipt size={40} className="text-salon-muted/30 mx-auto mb-4" />
                    <p className="text-salon-muted font-sans">No bills yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bills.map(bill => (
                      <div key={bill.id} className="glass-card hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                        <div>
                          <p className="text-salon-white text-sm font-sans font-semibold group-hover:text-gold-400">{bill.invoice_number}</p>
                          <p className="text-salon-muted text-xs font-body mt-0.5">{(typeof bill.created_at === 'string' && !bill.created_at.includes('T') ? new Date(bill.created_at.replace(' ', 'T') + 'Z') : new Date(bill.created_at)).toLocaleDateString('en-IN')} · {bill.payment_method?.toUpperCase()}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 sm:border-0 pt-4 sm:pt-0">
                          <span className="font-display text-xl text-gold-500 font-bold">₹{parseFloat(bill.total_amount).toLocaleString('en-IN')}</span>
                          <button onClick={() => downloadBill(bill.id, bill.invoice_number)} className="text-salon-muted hover:text-gold-500 bg-white/5 p-2 rounded-full transition-colors"><Download size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Membership */}
            {tab === 'membership' && (
              <div className="max-w-lg mx-auto sm:mx-0">
                <h2 className="font-display text-2xl text-salon-white mb-6">My Membership</h2>
                {profile?.membership_id ? (
                  <div className="glass-card-gold p-8 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl group-hover:bg-gold-500/20 transition-all duration-700"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                      <div className="w-14 h-14 bg-gold-500/20 border border-gold-500/40 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(201,168,76,0.3)] animate-pulse">
                        <Crown size={24} className="text-gold-500" />
                      </div>
                      <div>
                        <h3 className="font-display text-3xl text-gold-500 drop-shadow-md">{profile.membership_name}</h3>
                        <p className="text-salon-white text-xs font-sans tracking-widest uppercase mt-1">Active Member</p>
                      </div>
                    </div>
                    <div className="space-y-4 mb-8 relative z-10">
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span className="text-salon-muted text-sm font-sans">Discount</span>
                        <span className="text-gold-500 font-bold font-sans text-base">{profile.discount}% OFF</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span className="text-salon-muted text-sm font-sans">Valid Until</span>
                        <span className="text-salon-white text-sm font-body">{profile.membership_expiry ? new Date(profile.membership_expiry).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                    </div>
                    <Link to="/memberships" className="btn-outline-gold w-full py-3.5 text-center block relative z-10 hover:bg-gold-500 hover:text-salon-black">Upgrade Plan</Link>
                  </div>
                ) : (
                  <div className="glass-card p-10 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Crown size={48} className="text-salon-muted/40 mx-auto mb-6 group-hover:text-gold-500/40 transition-colors duration-500" />
                    <h3 className="font-display text-3xl text-salon-white mb-4 relative z-10">No Active Membership</h3>
                    <p className="text-salon-muted font-body text-base mb-8 relative z-10">Join our membership club for exclusive discounts and premium benefits.</p>
                    <Link to="/memberships" className="btn-gold px-8 py-4 relative z-10 w-full sm:w-auto inline-block">Explore Memberships</Link>
                  </div>
                )}
              </div>
            )}

            {/* Profile */}
            {tab === 'profile' && (
              <div className="max-w-lg mx-auto sm:mx-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <h2 className="font-display text-2xl text-salon-white">My Profile</h2>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="text-gold-500 hover:text-gold-400 text-xs font-sans tracking-wider uppercase flex items-center gap-1.5 self-start sm:self-auto bg-white/5 px-3 py-1.5 rounded-full transition-colors">
                      <Edit2 size={12} /> Edit Info
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="glass-card p-6 space-y-5">
                    <div>
                      <label className="text-salon-muted text-[10px] font-sans tracking-widest uppercase mb-1.5 block">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value.replace(/[0-9]/g, '') }))} 
                        pattern="^[A-Za-z\s]+$"
                        title="Name must contain only letters and spaces"
                        className="w-full bg-salon-black/50 border border-white/10 p-3.5 text-salon-white text-sm rounded-lg focus:border-gold-500/50 outline-none transition-colors" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-salon-muted text-[10px] font-sans tracking-widest uppercase mb-1.5 block">Phone Number (For Bill Linking)</label>
                      <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value.replace(/\\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile number" className="w-full bg-salon-black/50 border border-white/10 p-3.5 text-salon-white text-sm rounded-lg focus:border-gold-500/50 outline-none transition-colors" />
                    </div>
                    <div className="pt-3 flex gap-3">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-dark flex-1 py-3.5 text-xs uppercase">Cancel</button>
                      <button type="submit" className="btn-gold flex-1 py-3.5 text-xs uppercase font-bold flex justify-center items-center gap-2"><Save size={14}/> Save</button>
                    </div>
                  </form>
                ) : (
                  <div className="glass-card p-6 sm:p-8 space-y-4">
                    {[
                      { label: 'Full Name', value: profile?.name || user?.name },
                      { label: 'Email Address', value: profile?.email || user?.email },
                      { label: 'Phone Number', value: profile?.phone || 'Not set' },
                      { label: 'Total Visits', value: profile?.total_visits || 0 },
                      { label: 'Total Spent', value: <span className="text-gold-500 font-bold">₹{parseFloat(profile?.total_spent || 0).toLocaleString('en-IN')}</span> },
                      { label: 'Member Since', value: profile ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-white/5 last:border-0 gap-1 sm:gap-4">
                        <span className="text-salon-muted text-sm font-sans">{label}</span>
                        <span className="text-salon-white text-base sm:text-sm font-body font-medium">{value}</span>
                      </div>
                    ))}
                    <div className="pt-6 border-t border-white/5 mt-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                          <h3 className="text-salon-white font-sans font-medium text-sm">Account Security</h3>
                          <p className="text-salon-muted text-xs font-body mt-1">Set a password if you signed in with Google, or update your existing password.</p>
                        </div>
                        {!isSettingPassword && (
                          <button onClick={() => setIsSettingPassword(true)} className="btn-outline-gold py-2 px-4 text-[10px] tracking-wider shrink-0 w-full sm:w-auto flex items-center justify-center gap-2">
                            <Lock size={12} /> ADD / UPDATE PASSWORD
                          </button>
                        )}
                      </div>

                      {isSettingPassword && (
                        <form onSubmit={handleSetPassword} className="mt-4 p-4 bg-salon-black/40 border border-white/5 rounded-lg space-y-4">
                          <div className="space-y-3">
                            <div className="relative">
                              <label className="text-salon-muted text-[10px] font-sans tracking-widest uppercase mb-1.5 block">New Password</label>
                              <div className="relative">
                                <input 
                                  type={showPassword ? 'text' : 'password'} 
                                  value={newPassword} 
                                  onChange={e => setNewPassword(e.target.value)} 
                                  minLength={6}
                                  placeholder="Minimum 6 characters"
                                  className="w-full bg-salon-black/50 border border-white/10 p-3 pr-10 text-salon-white text-sm rounded-lg focus:border-gold-500/50 outline-none transition-colors" 
                                  required 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-salon-white transition-colors">
                                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <label className="text-salon-muted text-[10px] font-sans tracking-widest uppercase mb-1.5 block">Confirm Password</label>
                              <div className="relative">
                                <input 
                                  type={showPassword ? 'text' : 'password'} 
                                  value={confirmPassword} 
                                  onChange={e => setConfirmPassword(e.target.value)} 
                                  minLength={6}
                                  placeholder="Confirm your password"
                                  className="w-full bg-salon-black/50 border border-white/10 p-3 pr-10 text-salon-white text-sm rounded-lg focus:border-gold-500/50 outline-none transition-colors" 
                                  required 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-salon-white transition-colors">
                                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => { setIsSettingPassword(false); setNewPassword(''); setConfirmPassword(''); }} className="btn-dark flex-1 py-2.5 text-[10px] uppercase">Cancel</button>
                            <button type="submit" className="btn-gold flex-1 py-2.5 text-[10px] uppercase font-bold flex justify-center items-center gap-2"><Save size={14}/> Save Password</button>
                          </div>
                        </form>
                      )}
                    </div>

                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 transition-all text-xs font-sans tracking-wider uppercase mt-6 font-bold">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}

const Crown = ({ size, className }) => (
  <svg width={size} height={size} className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 8l2 10h12l2-10-8-6z" />
  </svg>
);
