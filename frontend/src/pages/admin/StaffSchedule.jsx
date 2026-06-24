import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { scheduleAPI, staffAPI } from '../../services/api';
import { formatTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  Calendar, Users, Clock, Plus, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, UserX, Activity, AlertCircle
} from 'lucide-react';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StaffSchedule() {
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [shiftData, setShiftData] = useState({
    date: getLocalDateString(),
    start_time: '09:00',
    end_time: '18:00',
    is_off: false,
  });

  const todayStr = getLocalDateString();
  const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));

  // ── Fetch staff independently so it never fails silently ──────────────────
  useEffect(() => {
    setLoadingStaff(true);
    staffAPI.getAll()
      .then(res => {
        const data = res?.data?.data || [];
        setStaffList(data);
      })
      .catch(() => toast.error('Could not load staff list.'))
      .finally(() => setLoadingStaff(false));
  }, []);

  // ── Fetch shifts + analytics whenever the date changes ────────────────────
  const fetchShiftsAndAnalytics = async () => {
    setLoadingShifts(true);
    const dateStr = getLocalDateString(currentDate);
    try {
      const res = await scheduleAPI.getShifts({ start_date: dateStr, end_date: dateStr });
      setShifts(res?.data?.data || []);
    } catch {
      setShifts([]);
    }
    try {
      const res2 = await scheduleAPI.getAnalytics();
      setAnalytics(res2?.data?.data || {});
    } catch {
      setAnalytics({});
    }
    setLoadingShifts(false);
  };

  useEffect(() => { fetchShiftsAndAnalytics(); }, [currentDate]);

  // ── Assign shift ──────────────────────────────────────────────────────────
  const handleAssignShift = async (e) => {
    e.preventDefault();
    if (!selectedStaff) { toast.error('Please select a staff member.'); return; }
    try {
      await scheduleAPI.assignShift({
        staff_id: selectedStaff,
        date: shiftData.date,
        start_time: `${shiftData.start_time}:00`,
        end_time: `${shiftData.end_time}:00`,
        break_start: null,
        break_duration: 0,
        is_off: shiftData.is_off,
      });
      toast.success('Shift assigned successfully!');
      setIsModalOpen(false);
      fetchShiftsAndAnalytics();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to assign shift.');
    }
  };

  const openModal = (staff) => {
    if (staff) {
      setSelectedStaff(staff.id);
      const shift = shifts.find(s => s.staff_id === staff.id);
      setShiftData({
        date: getLocalDateString(currentDate),
        start_time: shift ? shift.start_time.substring(0, 5) : '09:00',
        end_time: shift ? shift.end_time.substring(0, 5) : '18:00',
        is_off: shift ? shift.is_off === 1 : false,
      });
    } else {
      setSelectedStaff('');
      setShiftData({
        date: getLocalDateString(currentDate),
        start_time: '09:00',
        end_time: '18:00',
        is_off: false,
      });
    }
    setIsModalOpen(true);
  };

  const changeDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d);
  };

  const dateStr = getLocalDateString(currentDate);
  const isToday = dateStr === todayStr;
  const isTomorrow = dateStr === tomorrowStr;
  const unscheduledStaff = staffList.filter(s => !shifts.find(sh => sh.staff_id === s.id));

  return (
    <AdminLayout title="Staff Schedule">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-between items-end">
          <div>
            <h1 className="text-3xl font-display text-white mb-1">Staff Schedule</h1>
            <p className="text-white/40 text-sm font-sans">Assign working hours so clients can book appointments.</p>
          </div>
          <button
            onClick={() => openModal(null)}
            className="btn-gold flex items-center gap-2"
          >
            <Plus size={16} /> Assign Shift
          </button>
        </div>

        {/* ── Analytics Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Scheduled Today', value: analytics.active_shifts ?? 0, icon: Users, cls: 'text-emerald-400 bg-emerald-500/15' },
            { label: 'On Leave', value: analytics.on_leave ?? 0, icon: UserX, cls: 'text-red-400 bg-red-500/15' },
            { label: 'Today Appointments', value: analytics.today_appointments ?? 0, icon: Calendar, cls: 'text-blue-400 bg-blue-500/15' },
            { label: 'Available Staff', value: analytics.available_staff ?? 0, icon: Activity, cls: 'text-amber-400 bg-amber-500/15' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
                  <Icon size={17} />
                </div>
                <p className="text-[10px] font-sans tracking-widest text-white/40 uppercase leading-tight">{label}</p>
              </div>
              <p className="text-3xl font-display text-white">{value}</p>
            </div>
          ))}
        </div>


        {/* ── Schedule Table ──────────────────────────────────────────────── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Date Navigator */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => changeDate(-1)}
                className="w-8 h-8 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center">
                <ChevronLeft size={18} className="text-white/50" />
              </button>
              <div className="text-center min-w-[170px]">
                <p className="text-base font-display text-white">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {isToday && <span className="text-[10px] text-emerald-400 font-sans uppercase tracking-wider">Today</span>}
                {isTomorrow && <span className="text-[10px] text-amber-400 font-sans uppercase tracking-wider">Tomorrow</span>}
              </div>
              <button onClick={() => changeDate(1)}
                className="w-8 h-8 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center">
                <ChevronRight size={18} className="text-white/50" />
              </button>
            </div>
            <div className="flex gap-2">
              {[
                { label: 'Working', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                { label: 'Off Day', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
                { label: 'Not Scheduled', cls: 'bg-white/5 text-white/30 border-white/10' },
              ].map(({ label, cls }) => (
                <span key={label} className={`px-3 py-1 rounded-full text-[10px] uppercase font-sans tracking-wider border ${cls}`}>{label}</span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="p-4">
            {loadingStaff ? (
              <div className="flex items-center justify-center py-16 gap-3 text-white/30">
                <div className="w-5 h-5 border-2 border-white/10 border-t-gold-500 rounded-full animate-spin" />
                <span className="text-sm font-sans">Loading staff...</span>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-sans text-sm">No staff found.</p>
                <p className="text-white/20 font-body text-xs mt-1">Add staff members from the Staff section first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffList.map(staff => {
                  const shift = shifts.find(s => s.staff_id === staff.id);
                  return (
                    <div key={staff.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors">
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 w-52 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                          {staff.photo
                            ? <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gold-500/15 flex items-center justify-center text-gold-400 font-bold font-sans text-sm">
                                {staff.name?.[0]?.toUpperCase()}
                              </div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{staff.name}</p>
                          <p className="text-[11px] text-white/40 truncate">{staff.specializations?.split(',')[0] || 'Stylist'}</p>
                        </div>
                      </div>

                      {/* Shift Status */}
                      <div className="flex-1">
                        {loadingShifts ? (
                          <div className="w-24 h-5 bg-white/5 rounded animate-pulse" />
                        ) : !shift ? (
                          <div className="flex items-center gap-2 text-white/25 text-xs font-sans">
                            <Clock size={13} /> Not Scheduled
                          </div>
                        ) : shift.is_off ? (
                          <div className="flex items-center gap-2 text-red-400 text-xs font-sans">
                            <XCircle size={13} /> Off Day
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-sans w-fit">
                            <CheckCircle size={13} />
                            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                          </div>
                        )}
                      </div>

                      {/* Edit/Assign Button */}
                      <button
                        onClick={() => openModal(staff)}
                        className="flex-shrink-0 text-white/30 hover:text-gold-400 transition-colors text-[11px] font-sans uppercase tracking-wider border border-white/10 hover:border-gold-500/30 px-3 py-1.5 rounded-lg"
                      >
                        {shift ? 'Edit' : 'Assign'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Assign Shift Modal ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <div>
                <h3 className="font-display text-xl text-white">Assign Shift</h3>
                <p className="text-white/30 text-xs font-sans mt-0.5">Set working hours for a staff member</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignShift} className="p-5 space-y-5">
              {/* Staff Selector */}
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-sans">
                  Staff Member *
                </label>
                {loadingStaff ? (
                  <div className="w-full h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl animate-pulse" />
                ) : (
                  <select
                    required
                    value={selectedStaff}
                    onChange={e => setSelectedStaff(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 font-sans"
                  >
                    <option value="">Select Staff Member...</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
                {!loadingStaff && staffList.length === 0 && (
                  <p className="text-red-400/70 text-xs font-sans mt-1">
                    No staff found. Add staff from the Staff section first.
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-sans">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={shiftData.date}
                  min={todayStr}
                  onChange={e => setShiftData({ ...shiftData, date: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 font-sans"
                />
                <div className="flex gap-2 mt-2">
                  <button type="button"
                    onClick={() => setShiftData({ ...shiftData, date: todayStr })}
                    className={`text-[11px] font-sans border px-3 py-1 rounded-lg transition-colors ${shiftData.date === todayStr ? 'text-gold-400 border-gold-500/40 bg-gold-500/10' : 'text-white/30 border-white/10 hover:text-white/60'}`}>
                    Today
                  </button>
                  <button type="button"
                    onClick={() => setShiftData({ ...shiftData, date: tomorrowStr })}
                    className={`text-[11px] font-sans border px-3 py-1 rounded-lg transition-colors ${shiftData.date === tomorrowStr ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-white/30 border-white/10 hover:text-white/60'}`}>
                    Tomorrow
                  </button>
                </div>
              </div>

              {/* Start / End Time */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-sans">Start Time *</label>
                  <input
                    type="time"
                    required
                    disabled={shiftData.is_off}
                    value={shiftData.start_time}
                    onChange={e => setShiftData({ ...shiftData, start_time: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 disabled:opacity-40 font-sans"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2 font-sans">End Time *</label>
                  <input
                    type="time"
                    required
                    disabled={shiftData.is_off}
                    value={shiftData.end_time}
                    onChange={e => setShiftData({ ...shiftData, end_time: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500/50 disabled:opacity-40 font-sans"
                  />
                </div>
              </div>

              {/* Off Day Toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                <input
                  type="checkbox"
                  checked={shiftData.is_off}
                  onChange={e => setShiftData({ ...shiftData, is_off: e.target.checked })}
                  className="w-4 h-4 accent-red-500 rounded"
                />
                <div>
                  <span className="text-white/70 text-sm font-sans">Mark as Off Day</span>
                  <p className="text-white/25 text-[11px] font-sans mt-0.5">Staff won't appear in client booking</p>
                </div>
              </label>

              <button type="submit" className="w-full btn-gold py-3 font-sans text-sm tracking-wider">
                Save Shift
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
