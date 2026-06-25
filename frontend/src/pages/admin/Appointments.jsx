// ===== ADMIN APPOINTMENTS PAGE =====
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { appointmentsAPI, servicesAPI, staffAPI, scheduleAPI, settingsAPI } from '../../services/api';
import { Search, Filter, Check, X, RefreshCw, Plus, Clock, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['', 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_BADGE = { confirmed: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-gray' };

import { generateTimeSlots } from '../../utils/helpers';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSlotsStatus = (dateStr, staffList, appointmentsList, timeSlots) => {
  const activeAppts = appointmentsList.filter(a => a.status !== 'cancelled');

  return timeSlots.map(slot => {
    const [sH, sM] = slot.split(':').map(Number);
    const slotMins = sH * 60 + sM;

    const staffStatuses = staffList.map(st => {
      const isBusy = activeAppts.some(appt => {
        if (appt.staff_id !== st.id) return false;
        if (!appt.appointment_time) return false;
        
        const [aH, aM] = appt.appointment_time.split(':').map(Number);
        const apptMins = aH * 60 + aM;
        const apptDur = appt.duration || 30;
        
        return slotMins >= apptMins && slotMins < apptMins + apptDur;
      });

      return {
        staffId: st.id,
        staffName: st.name,
        isBusy
      };
    });

    const busyCount = staffStatuses.filter(s => s.isBusy).length;
    const totalCount = staffList.length;
    const availableCount = totalCount - busyCount;

    return {
      slot,
      staffStatuses,
      availableCount,
      totalCount,
      status: totalCount === 0 ? 'no_staff' : (busyCount === 0 ? 'available' : (availableCount === 0 ? 'booked' : 'partial'))
    };
  });
};

const getLocalTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getClosestSlotTime = () => {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  
  if (hours < 9) {
    return '09:00:00';
  }
  if (hours >= 19) {
    return '18:30:00';
  }
  
  if (minutes < 15) {
    minutes = '00';
  } else if (minutes < 45) {
    minutes = '30';
  } else {
    minutes = '00';
    hours += 1;
  }
  
  if (hours >= 19) {
    return '18:30:00';
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
};

export default function AdminAppointments() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: getLocalDateString(), search: searchParams.get('search') || '', page: 1 });
  const [pagination, setPagination] = useState({});

  const todayStr = getLocalDateString();
  const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));

  const [slotDataToday, setSlotDataToday] = useState([]);
  const [slotDataTomorrow, setSlotDataTomorrow] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsActiveTab, setSlotsActiveTab] = useState('today');
  const [closedSlots, setClosedSlots] = useState({});
  const [slotInterval, setSlotInterval] = useState(30);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');

  const timeSlots = generateTimeSlots(slotInterval, openTime, closeTime);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get();
      if (res.data?.data) {
        if (res.data.data.slot_interval) {
          setSlotInterval(parseInt(res.data.data.slot_interval, 10));
        }
        if (res.data.data.open_time) setOpenTime(res.data.data.open_time);
        if (res.data.data.close_time) setCloseTime(res.data.data.close_time);
        const raw = res.data.data.closed_slots;
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          setClosedSlots(Array.isArray(parsed) ? {} : parsed);
        } catch(e) {
          setClosedSlots({});
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleSlot = async (slot) => {
    const targetDate = slotsActiveTab === 'today' ? todayStr : tomorrowStr;
    const currentForDate = closedSlots[targetDate] || [];
    const isClosed = currentForDate.includes(slot);
    const updatedForDate = isClosed 
      ? currentForDate.filter(s => s !== slot) 
      : [...currentForDate, slot];
      
    const updatedClosed = { ...closedSlots, [targetDate]: updatedForDate };
    
    setClosedSlots(updatedClosed);
    toast.success(`Time slot ${slot} turned ${isClosed ? 'On' : 'Off'} successfully for ${targetDate}!`);
    
    try {
      const res = await settingsAPI.get();
      const settings = res.data?.data || {};
      
      const payload = {
        ...settings,
        closed_slots: JSON.stringify(updatedClosed)
      };
      await settingsAPI.update(payload);
    } catch (err) {
      console.error('Failed to toggle slot:', err);
      toast.error('Failed to toggle slot availability. Reverting change.');
      setClosedSlots(closedSlots); // Revert to old state
    }
  };

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) setFilters(p => ({ ...p, search: s }));
  }, [searchParams]);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [slots, setSlots] = useState([]);
  
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);

  const [newAppt, setNewAppt] = useState({
    service_id: '',
    staff_id: '',
    appointment_date: '',
    appointment_time: '',
    customer_id: '',
    customer_name: '',
    customer_phone: ''
  });

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + parseFloat(s.price), 0);
  const categories = ['all', ...new Set(services.map(s => s.category).filter(Boolean))];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Handle clicking outside custom dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowServiceDropdown(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const isDateInPast = (y, m, d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(y, m, d);
    return cellDate < today;
  };

  const formatDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getDaysInMonth = (y, m) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getStartDayOfWeek = (y, m) => {
    return new Date(y, m, 1).getDay();
  };

  const handleOpenCalendar = () => {
    if (newAppt.appointment_date) {
      const d = new Date(newAppt.appointment_date);
      if (!isNaN(d.getTime())) {
        setCalendarMonth(d.getMonth());
        setCalendarYear(d.getFullYear());
      }
    }
    setShowCalendar(true);
  };

  const handleAddService = (service) => {
    if (selectedServices.some(s => s.id === service.id)) {
      toast.error('Service is already selected.');
      return;
    }
    const updated = [...selectedServices, service];
    setSelectedServices(updated);
    setNewAppt(p => ({
      ...p,
      service_id: updated[0]?.id || '',
      appointment_date: p.appointment_date || '',
      appointment_time: '',
      staff_id: '',
      customer_id: p.customer_id || '',
      customer_name: p.customer_name || '',
      customer_phone: p.customer_phone || '',
      customer_gender: p.customer_gender || ''
    }));
    setServiceSearch('');
    setShowServiceDropdown(false);
  };

  const handleRemoveService = (serviceId) => {
    const updated = selectedServices.filter(s => s.id !== serviceId);
    setSelectedServices(updated);
    setNewAppt(p => ({
      ...p,
      service_id: updated[0]?.id || '',
      appointment_time: '',
      staff_id: ''
    }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 20 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await appointmentsAPI.getAll(params);
      setAppointments(data.data);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load appointments.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);
  useEffect(() => {
    servicesAPI.getAll().then(r => setServices(r.data.data)).catch(() => {});
    staffAPI.getAll().then(r => setStaff(r.data.data)).catch(() => {});
  }, []);

  const loadSlotsOverview = async () => {
    setLoadingSlots(true);
    try {
      const [apptsTodayRes, apptsTomorrowRes, staffTodayRes, staffTomorrowRes, staffListRes] = await Promise.all([
        appointmentsAPI.getAll({ date: todayStr, limit: 200 }),
        appointmentsAPI.getAll({ date: tomorrowStr, limit: 200 }),
        scheduleAPI.getAvailableStaff(todayStr),
        scheduleAPI.getAvailableStaff(tomorrowStr),
        staffAPI.getAll()
      ]);

      const apptsToday = apptsTodayRes.data.data || [];
      const apptsTomorrow = apptsTomorrowRes.data.data || [];
      const allStaff = staffListRes.data.data || [];
      const activeStaff = allStaff.filter(s => s.is_active === 1 || s.is_active === true);

      let staffToday = staffTodayRes.data.data || [];
      if (staffToday.length === 0) staffToday = activeStaff;

      let staffTomorrow = staffTomorrowRes.data.data || [];
      if (staffTomorrow.length === 0) staffTomorrow = activeStaff;

      setSlotDataToday(getSlotsStatus(todayStr, staffToday, apptsToday, timeSlots));
      setSlotDataTomorrow(getSlotsStatus(tomorrowStr, staffTomorrow, apptsTomorrow, timeSlots));
    } catch (err) {
      console.error('Failed to load slots overview:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlotsOverview();
  }, [appointments]);

  useEffect(() => {
    if (newAppt.appointment_date) {
      if (newAppt.staff_id && newAppt.service_id) {
        appointmentsAPI.getAvailableSlots({ staff_id: newAppt.staff_id, date: newAppt.appointment_date, service_id: newAppt.service_id })
          .then(r => {
            const fetched = r.data.data || [];
            setSlots(fetched.length > 0 ? fetched : timeSlots.map(t => `${t}:00`));
          })
          .catch(() => setSlots(timeSlots.map(t => `${t}:00`)));
      } else {
        setSlots(timeSlots.map(t => `${t}:00`));
      }
    } else {
      setSlots([]);
    }
  }, [newAppt.staff_id, newAppt.appointment_date, newAppt.service_id]);

  const openCreateModal = () => {
    setNewAppt({
      service_id: '',
      staff_id: '',
      appointment_date: getLocalDateString(),
      appointment_time: '',
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_gender: ''
    });
    setSelectedServices([]);
    setServiceSearch('');
    setShowTimeSlots(false);
    setShowCreate(true);
  };

  const updateStatus = async (id, status) => {
    try {
      await appointmentsAPI.update(id, { status });
      setAppointments(p => p.map(a => a.id === id ? { ...a, status } : a));
      toast.success(`Appointment marked as ${status}.`);
    } catch { toast.error('Update failed.'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service.');
      return;
    }
    setIsCreating(true);
    try {
      const payload = {
        ...newAppt,
        service_id: selectedServices[0].id,
        service_ids: selectedServices.map(s => s.id),
        staff_id: newAppt.staff_id || null
      };
      const response = await appointmentsAPI.create(payload);
      toast.success('Appointment created!');
      setShowCreate(false);

      // WhatsApp Auto-open Logic
      try {
        const appt = response.data.data;
        const phone = appt?.customer_phone || newAppt.customer_phone;
        if (phone) {
          let cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone; // Default to India prefix
          }

          // Format Date beautifully
          let displayDate = appt?.appointment_date || newAppt.appointment_date;
          if (displayDate) {
            displayDate = new Date(displayDate).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }

          // Format Time beautifully
          let displayTime = appt?.appointment_time || newAppt.appointment_time || '';
          if (displayTime) {
            const [h, m] = displayTime.split(':');
            const hr = parseInt(h, 10);
            const ampm = hr >= 12 ? 'PM' : 'AM';
            displayTime = `${hr % 12 || 12}:${m} ${ampm}`;
          }

          const staffName = appt?.staff_name || staff.find(s => s.id === newAppt.staff_id)?.name || 'Any Available Specialist';
          const servicesNames = appt?.service_name || selectedServices.map(s => s.name).join(', ');
          const priceStr = `₹${parseFloat(appt?.price || totalPrice).toLocaleString('en-IN')}`;
          const custName = appt?.customer_name || newAppt.customer_name || 'Valued Customer';

          const message = `✨ *TONI & GUY ESSENSUALS* ✨\n_Kondapur, Hyderabad_\n\nHello *${custName}*,\n\nYour luxury styling appointment has been successfully booked! 🎉\n\n*Booking Details:*\n📅 *Date:* ${displayDate}\n⏰ *Time:* ${displayTime}\n✂️ *Services:* ${servicesNames}\n👤 *Stylist:* ${staffName}\n💰 *Total Price:* ${priceStr}\n\nThank you for choosing TONI & GUY Essensuals. We look forward to pampering you! 💛\n\n📍 *Location:* https://maps.app.goo.gl/9R2CqM5w4N7Xv8p67\n📞 *Contact:* +91 98765 43210`;

          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(waUrl, '_blank');
        }
      } catch (waErr) {
        console.error('Failed to trigger WhatsApp message redirect:', waErr);
      }

      setNewAppt({
        service_id: '',
        staff_id: '',
        appointment_date: '',
        appointment_time: '',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_gender: ''
      });
      setSelectedServices([]);
      setServiceSearch('');
      load();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed.'); 
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AdminLayout title="Appointments">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
          <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))} placeholder="Search by customer name, phone, email..." className="input-dark pl-9 text-xs w-full" />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} className="input-dark w-40 text-xs">
          {STATUS_OPTS.map(s => <option key={s} value={s} className="bg-salon-dark text-salon-white">{s || 'All Status'}</option>)}
        </select>
        
        {/* Quick Date Toggles */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              setFilters(p => ({ ...p, date: todayStr, page: 1 }));
              setSlotsActiveTab('today');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-sans font-semibold uppercase tracking-wider transition-all duration-200 ${
              filters.date === todayStr
                ? 'bg-gold-500 text-salon-black font-bold font-sans'
                : 'bg-white/5 border border-white/10 text-salon-white hover:border-gold-500/50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              setFilters(p => ({ ...p, date: tomorrowStr, page: 1 }));
              setSlotsActiveTab('tomorrow');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-sans font-semibold uppercase tracking-wider transition-all duration-200 ${
              filters.date === tomorrowStr
                ? 'bg-gold-500 text-salon-black font-bold font-sans'
                : 'bg-white/5 border border-white/10 text-salon-white hover:border-gold-500/50'
            }`}
          >
            Tomorrow
          </button>
        </div>

        <input type="date" value={filters.date} onChange={e => {
          const val = e.target.value;
          setFilters(p => ({ ...p, date: val, page: 1 }));
          if (val === todayStr) setSlotsActiveTab('today');
          else if (val === tomorrowStr) setSlotsActiveTab('tomorrow');
        }} className="input-dark w-40 text-xs" />
        <button onClick={openCreateModal} className="btn-gold text-xs px-4 py-2 flex items-center gap-2 whitespace-nowrap"><Plus size={13} /> New Appointment</button>
      </div>

      {/* Slots Overview Section */}
      <div className="admin-card p-5 mb-6 relative z-30">
        <div className="flex justify-between items-center mb-4 border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="font-display text-sm text-salon-white flex items-center gap-2">
              <Clock size={16} className="text-gold-500" /> Two-Day Slots Availability
            </h3>
            <p className="text-[10px] text-salon-muted font-sans mt-0.5">
              Real-time availability of scheduled stylists
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSlotsActiveTab('today');
                setFilters(p => ({ ...p, date: todayStr, page: 1 }));
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-sans uppercase tracking-wider transition-all ${
                slotsActiveTab === 'today'
                  ? 'bg-gold-500 text-salon-black font-bold font-sans'
                  : 'bg-white/5 border border-white/10 text-salon-muted hover:text-salon-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setSlotsActiveTab('tomorrow');
                setFilters(p => ({ ...p, date: tomorrowStr, page: 1 }));
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-sans uppercase tracking-wider transition-all ${
                slotsActiveTab === 'tomorrow'
                  ? 'bg-gold-500 text-salon-black font-bold font-sans'
                  : 'bg-white/5 border border-white/10 text-salon-muted hover:text-salon-white'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {loadingSlots ? (
          <div className="flex items-center justify-center py-6 gap-2 text-salon-muted text-xs">
            <div className="w-4 h-4 border-2 border-white/10 border-t-gold-500 rounded-full animate-spin" />
            <span>Calculating slots availability...</span>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {(slotsActiveTab === 'today' ? slotDataToday : slotDataTomorrow).map(item => {
                const h = parseInt(item.slot.split(':')[0], 10);
                const ampm = h >= 12 ? 'pm' : 'am';
                const hour12 = h % 12 || 12;
                const displayTime = `${hour12}:${item.slot.split(':')[1]} ${ampm}`;

                const targetDate = slotsActiveTab === 'today' ? todayStr : tomorrowStr;
                const isClosed = (closedSlots[targetDate] || []).includes(item.slot);
                const isOpen = !isClosed;
                const hasBookings = item.status === 'booked' || item.status === 'partial';

                // Check if slot is in the past for today
                const now = new Date();
                const currentTimeVal = now.getHours() * 60 + now.getMinutes();
                const slotTimeVal = h * 60 + parseInt(item.slot.split(':')[1], 10);
                const isPast = slotsActiveTab === 'today' && slotTimeVal < currentTimeVal;

                let badgeClass = '';
                let statusText = '';
                
                if (isPast) {
                  badgeClass = 'bg-white/5 border-white/5 text-white/20 opacity-30 pointer-events-none grayscale';
                  statusText = 'PASSED';
                } else if (isClosed) {
                  badgeClass = 'bg-red-500/5 border-red-500/20 text-red-400/40 opacity-70';
                  statusText = 'OFF';
                } else if (item.status === 'no_staff') {
                  badgeClass = 'bg-white/5 border-white/10 text-white/30';
                  statusText = 'No Staff';
                } else if (item.status === 'available') {
                  badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/15';
                  statusText = `${item.availableCount}/${item.totalCount} Free`;
                } else if (item.status === 'partial') {
                  badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/15';
                  statusText = `${item.availableCount}/${item.totalCount} Free`;
                } else if (item.status === 'booked') {
                  badgeClass = 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/50 hover:bg-red-500/15';
                  statusText = 'Fully Booked';
                }

                return (
                  <div
                    key={item.slot}
                    className={`relative p-2 rounded-lg border text-center transition-all group flex flex-col justify-between items-center min-h-[70px] ${badgeClass}`}
                  >
                    <div>
                      <div className="text-[11px] font-bold font-sans tracking-tight text-salon-white">{displayTime}</div>
                      <div className="text-[9px] font-sans tracking-wide mt-0.5 uppercase opacity-80">{statusText}</div>
                    </div>

                    {/* Tiny On/Off Switch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSlot(item.slot);
                      }}
                      className={`relative inline-flex h-3.5 w-7 shrink-0 rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1.5 cursor-pointer ${
                        isOpen ? 'bg-[#C9A84C]' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          isOpen ? 'translate-x-3.5 bg-salon-black' : 'translate-x-0 bg-white/60'
                        }`}
                        style={{ transform: isOpen ? 'translateX(14px)' : 'translateX(0)' }}
                      />
                    </button>

                    {/* Tooltip on Hover */}
                    {item.status !== 'no_staff' && !isClosed && (
                      <div className="absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 w-48 bg-[#0D0D0D] border border-white/10 p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <p className="text-[9px] text-salon-muted font-sans uppercase tracking-wider mb-2 text-left border-b border-white/[0.06] pb-1">
                          Stylists Status ({displayTime})
                        </p>
                        <div className="space-y-1.5 text-left max-h-32 overflow-y-auto pr-1">
                          {item.staffStatuses.map(st => (
                            <div key={st.staffId} className="flex justify-between items-center text-[10px] font-sans">
                              <span className="text-salon-white truncate pr-2">{st.staffName}</span>
                              <span className={st.isBusy ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                                {st.isBusy ? 'Booked' : 'Available'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-salon-border">
              {['Date & Time', 'Customer', 'Service', 'Specialist', 'Price', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-salon-border/50">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>)}
                </tr>
              ))
            ) : appointments.map(appt => (
              <tr key={appt.id} className="border-b border-salon-border/50 hover:bg-salon-black/20">
                <td className="table-cell">
                  <div className="font-sans text-gold-500 text-xs">{new Date(appt.appointment_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                  <div className="text-salon-muted text-xs">
                    {appt.appointment_time ? (() => {
                      const [h, m] = appt.appointment_time.split(':');
                      const hr = parseInt(h, 10);
                      const ampm = hr >= 12 ? 'pm' : 'am';
                      return `${hr % 12 || 12}:${m} ${ampm}`;
                    })() : ''}
                  </div>
                </td>
                <td className="table-cell">
                  <div className="font-sans text-xs font-semibold text-salon-white">{appt.customer_name || 'Walk-In'}</div>
                  <div className="text-salon-muted text-xs">{appt.customer_phone || ''}</div>
                </td>
                <td className="table-cell text-xs">{appt.service_name}</td>
                <td className="table-cell text-xs">{appt.staff_name || 'Unassigned'}</td>
                <td className="table-cell font-display text-sm">₹{parseFloat(appt.price || 0).toLocaleString('en-IN')}</td>
                <td className="table-cell">
                  {['completed', 'cancelled'].includes(appt.status) ? (
                    <span className={`text-xs font-sans font-semibold capitalize ${STATUS_BADGE[appt.status]?.replace('badge', 'text').replace('-blue', '-400').replace('-green', '-400').replace('-red', '-400') || 'text-salon-muted'}`}>
                      {appt.status}
                    </span>
                  ) : (
                    <select value={appt.status} onChange={e => updateStatus(appt.id, e.target.value)}
                      className={`bg-transparent border-0 text-xs font-sans font-semibold cursor-pointer focus:outline-none capitalize ${STATUS_BADGE[appt.status]?.replace('badge', 'text').replace('-blue', '-400').replace('-green', '-400').replace('-red', '-400') || 'text-salon-muted'}`}>
                      {STATUS_OPTS.filter(s => s).map(s => <option key={s} value={s} className="bg-salon-dark text-salon-white capitalize">{s}</option>)}
                    </select>
                  )}
                </td>
                <td className="table-cell">
                  {appt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(appt.id, 'confirmed')} title="Confirm/Accept" className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                      <button onClick={() => updateStatus(appt.id, 'cancelled')} title="Reject/Cancel" className="text-red-400/70 hover:text-red-400"><X size={14} /></button>
                    </div>
                  )}
                  {appt.status === 'confirmed' && (
                    <button 
                      onClick={() => navigate(`/admin/billing?appointment_id=${appt.id}&phone=${encodeURIComponent(appt.customer_phone || '')}&service=${encodeURIComponent(appt.service_name || '')}&stylist=${encodeURIComponent(appt.staff_name || '')}&price=${encodeURIComponent(appt.price || '')}`)}
                      title="Complete Bill"
                      className="text-gold-400 hover:text-gold-300 flex items-center gap-1 bg-gold-400/10 px-2 py-1 rounded border border-gold-400/20"
                    >
                      <FileText size={12} /> <span className="text-[9px] uppercase font-sans tracking-wider font-semibold">Bill</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && appointments.length === 0 && (
          <div className="text-center py-12 text-salon-muted font-sans text-sm">No appointments found.</div>
        )}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 p-4">
            {[...Array(Math.min(pagination.pages, 10))].map((_, i) => (
              <button key={i} onClick={() => setFilters(p => ({ ...p, page: i + 1 }))}
                className={`w-8 h-8 text-xs font-sans ${filters.page === i + 1 ? 'bg-gold-500 text-salon-black font-bold' : 'border border-salon-border text-salon-muted hover:border-gold-500'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/[0.08] w-full max-w-lg p-6 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden animate-slide-up">
            {/* Ambient glows inside modal */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full filter blur-[50px] opacity-10 pointer-events-none bg-gold-500" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full filter blur-[50px] opacity-5 pointer-events-none bg-gold-500" />

            <div className="flex justify-between items-center mb-5 relative z-10">
              <div>
                <h3 className="font-display text-xl text-salon-white">New Appointment</h3>
                <p className="text-salon-muted text-[9px] tracking-widest uppercase font-sans mt-0.5">Admin Concierge Panel</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="text-salon-muted hover:text-white p-1 rounded-full hover:bg-white/5 transition-all">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div>
                  <label className="label-gold">Customer Name</label>
                  <input 
                    type="text" 
                    value={newAppt.customer_name} 
                    onChange={e => setNewAppt(p => ({ ...p, customer_name: e.target.value.replace(/[0-9]/g, '') }))} 
                    pattern="^[A-Za-z\s]+$"
                    title="Customer name must contain only letters and spaces"
                    className="input-dark text-xs py-2.5" 
                    placeholder="Enter customer name" 
                    required 
                  />
                </div>
                <div>
                  <label className="label-gold">Contact Number</label>
                  <input 
                    type="tel" 
                    value={newAppt.customer_phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewAppt(p => ({ ...p, customer_phone: val }));
                    }} 
                    className="input-dark text-xs py-2.5" 
                    placeholder="Enter 10-digit number" 
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit mobile number"
                  />
                </div>
              </div>

              <div className="relative z-10 mt-3 mb-3">
                <label className="label-gold mb-2 block">Customer Gender</label>
                <div className="flex gap-3">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewAppt(p => ({ ...p, customer_gender: g }))}
                      className={`px-4 py-2 text-xs font-sans font-semibold tracking-wider uppercase border transition-all ${
                        newAppt.customer_gender === g
                          ? 'bg-gold-500 text-salon-black border-gold-500'
                          : 'bg-transparent text-salon-muted border-salon-border hover:border-gold-500/50 hover:text-salon-white'
                      }`}
                    >
                      {g === 'Male' ? '♂ Male' : g === 'Female' ? '♀ Female' : '⊕ Other'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Selector block */}
              <div className={`relative ${showServiceDropdown ? 'z-40' : 'z-20'}`} ref={dropdownRef}>
                <label className="label-gold">Services</label>
                
                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-full text-[8px] font-sans tracking-wider uppercase border transition-all duration-200 select-none ${
                        selectedCategory === cat
                          ? 'bg-gold-500 text-salon-black border-gold-500 font-bold shadow-[0_0_8px_rgba(201,168,76,0.3)]'
                          : 'bg-salon-dark/60 border-salon-border text-salon-muted hover:border-gold-500/40 hover:text-salon-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search and add a service..."
                    className="input-dark text-xs w-full pr-10 py-2.5"
                    value={serviceSearch}
                    onChange={e => {
                      setServiceSearch(e.target.value);
                      setShowServiceDropdown(true);
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted" />
                </div>
                
                {showServiceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-gold-500/30 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.05)] max-h-60 overflow-y-auto custom-scrollbar">
                    {services
                      .filter(s => {
                        const matchesCategory = selectedCategory === 'all' || s.category?.toLowerCase() === selectedCategory.toLowerCase();
                        const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
                        const matchesGender = !newAppt.customer_gender || !s.gender || s.gender === 'Both' || s.gender === newAppt.customer_gender;
                        return matchesCategory && matchesSearch && matchesGender;
                      })
                      .map(s => (
                        <div
                          key={s.id}
                          className="px-5 py-3.5 text-sm text-salon-white hover:bg-gold-500/15 cursor-pointer border-b border-white/[0.04] last:border-0 transition-colors flex justify-between items-center"
                          onClick={() => handleAddService(s)}
                        >
                          <span className="font-sans font-medium text-left">{s.name}</span>
                          <span className="text-gold-500 font-display text-base ml-4 shrink-0">₹{parseFloat(s.price).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    {services.filter(s => {
                      const matchesCategory = selectedCategory === 'all' || s.category?.toLowerCase() === selectedCategory.toLowerCase();
                      const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
                      const matchesGender = !newAppt.customer_gender || !s.gender || s.gender === 'Both' || s.gender === newAppt.customer_gender;
                      return matchesCategory && matchesSearch && matchesGender;
                    }).length === 0 && (
                      <div className="px-5 py-3 text-sm text-salon-muted text-center">No services found</div>
                    )}
                  </div>
                )}

                {selectedServices.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {selectedServices.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-1 bg-gold-500/10 border border-gold-500/30 text-salon-white px-2 py-0.5 rounded-full text-[9px] font-sans">
                          {s.name}
                          <button type="button" onClick={() => handleRemoveService(s.id)} className="text-gold-500 hover:text-gold-400 font-bold shrink-0 ml-0.5">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="text-[9px] text-salon-muted font-sans flex justify-between items-center bg-white/5 p-1.5 rounded border border-white/5">
                      <span>Total Selected: <strong>{selectedServices.length}</strong></span>
                      <span>Duration: <strong>{totalDuration} mins</strong></span>
                      <span>Total Price: <strong className="text-gold-500">₹{totalPrice.toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10">
                <label className="label-gold">Staff</label>
                <select value={newAppt.staff_id} onChange={e => setNewAppt(p => ({ ...p, staff_id: e.target.value }))} className="input-dark text-xs py-2.5">
                  <option value="" className="bg-salon-dark text-salon-white">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id} className="bg-salon-dark text-salon-white">{s.name}</option>)}
                </select>
              </div>

              {/* Date and Time Selector (Custom Calendar Popover) */}
              <div className={`grid grid-cols-2 gap-3 relative ${showCalendar ? 'z-40' : 'z-10'}`}>
                <div className="relative" ref={calendarRef}>
                  <label className="label-gold">Date</label>
                  <div className="relative cursor-pointer group" onClick={handleOpenCalendar}>
                    <input 
                      type="text" 
                      readOnly 
                      value={
                        newAppt.appointment_date 
                          ? new Date(newAppt.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : ''
                      }
                      placeholder="Select Date"
                      className="input-dark text-xs w-full pr-8 cursor-pointer pointer-events-none group-hover:border-gold-500/50 transition-colors py-2.5" 
                      required 
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gold-500/80 group-hover:text-gold-400 transition-colors bg-white/5 p-1 rounded-md">
                      <Calendar size={13} />
                    </div>
                  </div>

                  {showCalendar && (
                    <div className="absolute left-0 bottom-full z-50 mb-2 p-4 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] w-[260px] animate-slide-up">
                      <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2">
                        <button
                          type="button"
                          disabled={calendarYear < new Date().getFullYear() || (calendarYear === new Date().getFullYear() && calendarMonth <= new Date().getMonth())}
                          onClick={handlePrevMonth}
                          className="p-1 rounded-md hover:bg-white/5 text-salon-muted hover:text-gold-400 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <h4 className="font-display text-xs text-salon-white font-medium tracking-wide">
                          {monthNames[calendarMonth]} {calendarYear}
                        </h4>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 rounded-md hover:bg-white/5 text-salon-muted hover:text-gold-400 transition-all active:scale-90"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                        {weekDays.map(wd => (
                          <div key={wd} className="text-[8px] font-bold text-salon-muted/60 uppercase tracking-widest py-0.5 font-sans">
                            {wd}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {(() => {
                          const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                          const startDay = getStartDayOfWeek(calendarYear, calendarMonth);
                          const cells = [];
                          for (let i = 0; i < startDay; i++) {
                            cells.push(<div key={`pad-${i}`} className="h-6 w-6" />);
                          }
                          for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = formatDateString(calendarYear, calendarMonth, day);
                            const isPast = isDateInPast(calendarYear, calendarMonth, day);
                            const isSelected = newAppt.appointment_date === dateStr;
                            const isToday = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateStr;

                            cells.push(
                              <button
                                key={`day-${day}`}
                                type="button"
                                disabled={isPast}
                                onClick={() => {
                                  setNewAppt(p => ({
                                    ...p,
                                    appointment_date: dateStr,
                                    appointment_time: '',
                                    staff_id: ''
                                  }));
                                  setShowCalendar(false);
                                }}
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-sans transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-salon-black font-bold shadow-[0_0_8px_rgba(201,168,76,0.6)]'
                                    : isPast
                                      ? 'text-white/10 cursor-not-allowed pointer-events-none'
                                      : isToday
                                        ? 'border border-gold-500/50 text-gold-400 font-bold hover:bg-gold-500/10'
                                        : 'text-salon-white hover:bg-white/5 hover:text-gold-400'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-gold">Time</label>
                  <div className="relative">
                    <input type="time" value={newAppt.appointment_time?.substring(0, 5) || ''}
                      onChange={e => setNewAppt(p => ({ ...p, appointment_time: e.target.value }))} className="input-dark text-xs w-full pr-10 py-2.5" required />
                    <button type="button" onClick={() => setShowTimeSlots(!showTimeSlots)} className="absolute right-3 top-1/2 -translate-y-1/2 text-salon-muted hover:text-gold-500 transition-colors">
                      <Clock size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {newAppt.appointment_date && showTimeSlots && (
                <div className="relative z-10">
                  <label className="label-gold">Select a Time Slot</label>
                  <div className="grid grid-cols-4 gap-2 mt-2 max-h-32 overflow-y-auto pr-1">
                    {slots.filter(slot => {
                      const time24 = slot.substring(0, 5);
                      const today = new Date();
                      const isToday = formatDateString(today.getFullYear(), today.getMonth(), today.getDate()) === newAppt.appointment_date;
                      if (isToday) {
                        const currentHours = today.getHours();
                        const currentMinutes = today.getMinutes();
                        const [slotHours, slotMinutes] = time24.split(':').map(Number);
                        if (slotHours < currentHours || (slotHours === currentHours && slotMinutes <= currentMinutes)) {
                          return false;
                        }
                      }
                      const dateToCheck = newAppt.appointment_date || formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                      if ((closedSlots[dateToCheck] || []).some(cs => cs === slot || cs === slot.substring(0, 5))) {
                        return false;
                      }
                      return true;
                    }).map(slot => {
                      const time24 = slot.substring(0, 5);
                      const h = parseInt(time24.split(':')[0], 10);
                      const ampm = h >= 12 ? 'pm' : 'am';
                      const hour12 = h % 12 || 12;
                      const displayTime = `${hour12}:${time24.split(':')[1]} ${ampm}`;
                      const isSelected = newAppt.appointment_time?.substring(0, 5) === time24;

                      return (
                        <div key={slot} className="relative group/slot">
                          <button 
                            type="button" 
                            onClick={() => {
                              setNewAppt(p => ({ ...p, appointment_time: slot }));
                              setShowTimeSlots(false);
                            }}
                            className={`w-full py-2 text-[10px] font-sans tracking-wider text-center transition-all border rounded-md ${
                              isSelected 
                                ? 'bg-gold-500/20 text-gold-400 border-gold-500/50 shadow-inner' 
                                : 'border-white/10 text-salon-white hover:border-gold-500/40 hover:text-gold-400'
                            }`}
                          >
                            {displayTime}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shimmer sweeping luxury buttons footer */}
              <div className="flex gap-4 pt-4 relative z-10">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 py-3 text-[10px] tracking-widest uppercase font-sans font-bold bg-white/5 border border-white/10 hover:border-gold-500/40 text-salon-white rounded-md transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={selectedServices.length === 0 || isCreating}
                  className="relative overflow-hidden flex-1 py-3.5 text-[10px] tracking-widest uppercase font-sans font-bold bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 text-salon-black shadow-[0_4px_15px_rgba(201,168,76,0.3)] hover:shadow-[0_6px_20px_rgba(201,168,76,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 rounded-md group disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin relative z-10"></div>
                  ) : (
                    <>
                      <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                      <span className="relative z-10">Create</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
