import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { servicesAPI, appointmentsAPI, settingsAPI } from '../../services/api';
import { formatTime, generateTimeSlots } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Clock, CheckCircle, Search, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultSlots = (dateStr, intervalMinutes = 30) => {
  let allSlots = generateTimeSlots(intervalMinutes).map(s => `${s}:00`);
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  
  if (dateStr === todayStr) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return allSlots.filter(s => {
      const [h, m] = s.split(':').map(Number);
      return h > currentHour || (h === currentHour && m > currentMinute);
    });
  }
  return allSlots;
};

export default function BookAppointment() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotToStaffMap, setSlotToStaffMap] = useState({});
  const [closedDays, setClosedDays] = useState([]);
  const [closedSlots, setClosedSlots] = useState([]);
  const [slotInterval, setSlotInterval] = useState(30);

  useEffect(() => {
    settingsAPI.get()
      .then(res => {
        if (res.data?.data) {
          const rawData = res.data.data;
          if (rawData.booking_slot_interval) {
            setSlotInterval(parseInt(rawData.booking_slot_interval, 10) || 30);
          }
          try {
            setClosedDays(JSON.parse(rawData.closed_days || '[]'));
          } catch(e) {
            setClosedDays([]);
          }
          try {
            const parsed = JSON.parse(rawData.closed_slots || '{}');
            setClosedSlots(Array.isArray(parsed) ? {} : parsed);
          } catch(e) {
            setClosedSlots({});
          }
        }
      })
      .catch(() => {});
  }, []);
  
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [newAppt, setNewAppt] = useState({
    service_id: '',
    staff_id: '',
    appointment_date: getLocalDateString(),
    appointment_time: '',
    customer_name: user?.name || '',
    customer_phone: user?.phone || ''
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

  useEffect(() => {
    servicesAPI.getAll({ is_active: 1 }).then(r => {
      const svcs = r.data.data;
      setServices(svcs);
      const preServiceId = searchParams.get('service');
      if (preServiceId) {
        const found = svcs.find(s => s.id === preServiceId);
        if (found) {
          setSelectedServices([found]);
          setNewAppt(p => ({ ...p, service_id: found.id }));
        }
      }
    }).catch(() => {});
  }, [searchParams]);

  const initialized = useRef(false);
  useEffect(() => {
    if (user && !initialized.current) {
      setNewAppt(p => ({ ...p, customer_name: user.name, customer_phone: user.phone || '' }));
      initialized.current = true;
    }
  }, [user]);

  useEffect(() => {
    if (newAppt.appointment_date && newAppt.service_id) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[new Date(newAppt.appointment_date).getDay()];
      if (closedDays.includes(dayOfWeek)) {
        setSlots([]);
        setSlotToStaffMap({});
        return;
      }
      setSlots(getDefaultSlots(newAppt.appointment_date, slotInterval));

      appointmentsAPI.getSmartRecommendations({ date: newAppt.appointment_date, service_id: newAppt.service_id })
        .then(r => {
          const recs = r.data.data || [];
          if (recs.length > 0) {
            const allSlots = new Set();
            const staffMapping = {};
            recs.forEach(rec => {
              rec.availableSlots.forEach(slot => {
                const time24 = slot.substring(0, 5);
                const h = parseInt(time24.split(':')[0], 10);
                const ampm = h >= 12 ? 'pm' : 'am';
                const hour12 = h % 12 || 12;
                const displayTime = `${hour12}:${time24.split(':')[1]} ${ampm}`;
                const isSlotClosed = (closedSlots[newAppt.appointment_date] || []).includes(displayTime);
                
                if (!isSlotClosed && !allSlots.has(slot)) {
                  allSlots.add(slot);
                  staffMapping[slot] = rec.staff.id;
                }
              });
            });
            const sortedSlots = Array.from(allSlots).sort();
            setSlots(sortedSlots);
            setSlotToStaffMap(staffMapping);

            // Reset selected time if it's not in the new slots
            if (newAppt.appointment_time && !sortedSlots.includes(newAppt.appointment_time)) {
              setNewAppt(p => ({ ...p, appointment_time: '', staff_id: '' }));
              toast.error('The selected time slot is unavailable for this service. Please choose another slot.');
            }
            if (newAppt.appointment_time) {
              setNewAppt(p => ({ ...p, staff_id: null }));
            }
          } else {
            setSlots([]);
            setNewAppt(p => ({ ...p, appointment_time: '', staff_id: '' }));
          }
        })
        .catch(() => { setSlots([]); setSlotToStaffMap({}); });
    } else if (newAppt.appointment_date) {
      // Load standard slots by default if no service selected yet
      setSlots(getDefaultSlots(newAppt.appointment_date, slotInterval));
      setSlotToStaffMap({});
    } else {
      setSlots([]);
      setSlotToStaffMap({});
    }
  }, [newAppt.appointment_date, newAppt.service_id, closedDays, closedSlots]);

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
      appointment_time: '',
      staff_id: ''
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

  const handleBook = async (e) => {
    e.preventDefault();
    if (booking) return; // Prevent multi-clicks
    if (selectedServices.length === 0 || !newAppt.appointment_date || !newAppt.appointment_time) {
      toast.error('Please select at least one service and a date/time.');
      return;
    }
    
    const assignedStaff = null;

    
    setBooking(true);
    try {
      const payload = { 
        ...newAppt, 
        service_id: selectedServices[0].id,
        service_ids: selectedServices.map(s => s.id),
        staff_id: assignedStaff, 
        source: 'online' 
      };
      const res = await appointmentsAPI.create(payload);
      setBooked({
        ...res.data.data,
        services: selectedServices,
      });
      toast.success(res.data.data?.status === 'pending' ? 'Appointment requested!' : 'Appointment confirmed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setBooking(false); }
  };

  const getSelectedDayName = () => {
    if (!newAppt.appointment_date) return '';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[new Date(newAppt.appointment_date).getDay()];
  };
  const selectedDayName = getSelectedDayName();
  const isSelectedDateClosed = closedDays.includes(selectedDayName);

  if (booked) {
    const isPending = booked.status === 'pending';
    return (
      <div className="min-h-screen bg-salon-black flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32 px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gold-500/20 border border-gold-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={36} className="text-gold-500" />
            </div>
            <h2 className="font-display text-4xl text-salon-white mb-3">
              {isPending ? 'Appointment Requested!' : 'Appointment Confirmed!'}
            </h2>
            <div className="text-salon-muted font-body mb-4 space-y-1">
              {booked.services?.map(s => (
                <div key={s.id} className="text-salon-white text-sm">
                  {s.name} <span className="text-gold-500 font-sans text-xs">· ₹{parseFloat(s.price).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <p className="text-gold-500 font-sans text-sm mb-8">
              {new Date(booked.appointment_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {formatTime(booked.appointment_time)}
              <br />
              Total: ₹{parseFloat(booked.price || 0).toLocaleString('en-IN')} ({booked.duration} mins)
            </p>
            <p className="text-salon-muted text-sm font-body mb-10">
              {isPending
                ? 'Your appointment request has been sent to the salon. You will receive an email once it is confirmed.'
                : 'A confirmation email has been sent to your registered email address.'}
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <button onClick={() => navigate('/dashboard')} className="btn-gold px-8 py-3">View My Appointments</button>
              ) : (
                <button onClick={() => navigate('/')} className="btn-gold px-8 py-3">Back to Home</button>
              )}
              <button onClick={() => { 
                setBooked(null); 
                setSelectedServices([]);
                setNewAppt(p => ({ ...p, appointment_date: getLocalDateString(), appointment_time: '', service_id: '', staff_id: '' }));
                setServiceSearch('');
              }} className="btn-outline-gold px-8 py-3">Book Another</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-salon-black overflow-x-hidden">
      <Navbar />
      
      {/* 3D Glassmorphic Header with floating elements */}
      <section className="relative pt-28 pb-8 overflow-hidden bg-[#0A0A0A] border-b border-white/[0.06] text-center">
        {/* Ambient glowing shapes */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-gold-500/10 to-transparent rounded-full filter blur-[80px] pointer-events-none animate-float-slow" />
        <div className="absolute -top-10 -right-10 w-[250px] h-[250px] bg-gradient-to-bl from-gold-500/5 to-transparent rounded-full filter blur-[60px] pointer-events-none animate-float-medium" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-ping" />
            <span className="text-[9px] font-sans tracking-[0.22em] uppercase font-bold text-gold-400">Premium Reservation Portal</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-light text-salon-white tracking-wide mb-4 animate-fade-up">
            Begin Your <span className="text-gradient-gold font-normal">Transformation</span>
          </h1>
          <p className="text-salon-muted font-body max-w-xl mx-auto text-xs md:text-sm leading-relaxed tracking-wide animate-fade-up">
            Select multiple bespoke services and secure an appointment with our elite specialists at Toni & Guy Essensuals.
          </p>
        </div>
      </section>

      <section className="py-6 max-w-lg mx-auto px-6">
        <div className="bg-salon-card border border-salon-border rounded-xl p-6 shadow-2xl">
          <h3 className="font-display text-2xl text-salon-white mb-6 text-center">New Appointment</h3>
          
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="label-gold">Customer Name</label>
              <input 
                type="text" 
                value={newAppt.customer_name} 
                onChange={e => setNewAppt(p => ({ ...p, customer_name: e.target.value.replace(/[0-9]/g, '') }))} 
                pattern="^[A-Za-z\s]+$"
                title="Customer name must contain only letters and spaces"
                className="input-dark text-sm w-full py-3.5 sm:py-3" 
                placeholder="Enter your name" 
                required 
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="label-gold">Services</label>
              
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-sans tracking-wider uppercase border transition-all duration-200 select-none ${
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
                  className="input-dark text-sm w-full pr-10 py-3.5 sm:py-3"
                  value={serviceSearch}
                  onChange={e => {
                    setServiceSearch(e.target.value);
                    setShowServiceDropdown(true);
                  }}
                  onFocus={() => setShowServiceDropdown(true)}
                />
                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-salon-muted" />
              </div>
              
              {showServiceDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-[#121212] border border-gold-500/30 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.05)] max-h-60 overflow-y-auto custom-scrollbar">
                  {services
                    .filter(s => {
                      const matchesCategory = selectedCategory === 'all' || s.category?.toLowerCase() === selectedCategory.toLowerCase();
                      const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .map(s => (
                      <div
                        key={s.id}
                        className="px-5 py-4 sm:py-3 text-sm text-salon-white hover:bg-gold-500/15 cursor-pointer border-b border-white/[0.04] last:border-0 transition-colors flex justify-between items-center"
                        onClick={() => handleAddService(s)}
                      >
                        <span className="font-sans font-medium text-left">{s.name}</span>
                        <span className="text-gold-500 font-display text-base ml-4 shrink-0">₹{parseFloat(s.price).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  {services.filter(s => {
                    const matchesCategory = selectedCategory === 'all' || s.category?.toLowerCase() === selectedCategory.toLowerCase();
                    const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).length === 0 && (
                    <div className="px-5 py-4 text-sm text-salon-muted text-center">No services found</div>
                  )}
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 bg-gold-500/10 border border-gold-500/30 text-salon-white px-3 py-1 rounded-full text-xs font-sans">
                        {s.name}
                        <button type="button" onClick={() => handleRemoveService(s.id)} className="text-gold-500 hover:text-gold-400 font-bold shrink-0 ml-0.5">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-salon-muted font-sans flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                    <span>Total Selected: <strong>{selectedServices.length}</strong></span>
                    <span>Duration: <strong>{totalDuration} mins</strong></span>
                    <span>Total Price: <strong className="text-gold-500">₹{totalPrice.toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
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
                    className="input-dark text-sm w-full pr-12 py-3.5 sm:py-3 cursor-pointer pointer-events-none group-hover:border-gold-500/50 transition-colors" 
                    required 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500/80 group-hover:text-gold-400 transition-colors bg-white/5 p-1.5 rounded-md group-hover:scale-105 active:scale-95 duration-150">
                    <Calendar size={16} />
                  </div>
                </div>

                {showCalendar && (
                  <div className="absolute left-0 bottom-full sm:bottom-auto sm:top-full z-50 mt-2 p-5 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(201,168,76,0.05)] w-[300px] animate-slide-up">
                    <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
                      <button
                        type="button"
                        disabled={calendarYear < new Date().getFullYear() || (calendarYear === new Date().getFullYear() && calendarMonth <= new Date().getMonth())}
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-md hover:bg-white/5 text-salon-muted hover:text-gold-400 disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <h4 className="font-display text-sm text-salon-white font-medium tracking-wide">
                        {monthNames[calendarMonth]} {calendarYear}
                      </h4>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-md hover:bg-white/5 text-salon-muted hover:text-gold-400 transition-all active:scale-90"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {weekDays.map(wd => (
                        <div key={wd} className="text-[9px] font-bold text-salon-muted/60 uppercase tracking-widest py-1 font-sans">
                          {wd}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                        const startDay = getStartDayOfWeek(calendarYear, calendarMonth);
                        const cells = [];
                        for (let i = 0; i < startDay; i++) {
                          cells.push(<div key={`pad-${i}`} className="h-8 w-8" />);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = formatDateString(calendarYear, calendarMonth, day);
                          const isPast = isDateInPast(calendarYear, calendarMonth, day);
                          const isSelected = newAppt.appointment_date === dateStr;
                          const isToday = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateStr;

                          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const cellDayOfWeek = dayNames[new Date(calendarYear, calendarMonth, day).getDay()];
                          const isClosedDay = closedDays.includes(cellDayOfWeek);
                          const isDisabled = isPast || isClosedDay;

                          cells.push(
                            <button
                              key={`day-${day}`}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                setNewAppt(p => ({
                                  ...p,
                                  appointment_date: dateStr,
                                  appointment_time: '',
                                  staff_id: ''
                                }));
                                setShowCalendar(false);
                              }}
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-sans transition-all duration-200 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-salon-black font-bold shadow-[0_0_12px_rgba(201,168,76,0.6)] scale-105'
                                  : isDisabled
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
                <div className="relative cursor-pointer group" onClick={() => setShowTimeSlots(!showTimeSlots)}>
                  <input 
                    type="text" 
                    readOnly 
                    value={
                      newAppt.appointment_time 
                        ? formatTime(newAppt.appointment_time)
                        : ''
                    }
                    placeholder="Select Time"
                    className="input-dark text-sm w-full pr-12 py-3.5 sm:py-3 cursor-pointer pointer-events-none group-hover:border-gold-500/50 transition-colors" 
                    required 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500/80 group-hover:text-gold-400 transition-all bg-white/5 p-1.5 rounded-md group-hover:scale-105 active:scale-95 duration-75">
                    <Clock size={16} />
                  </div>
                </div>
              </div>
            </div>

            {newAppt.appointment_date && showTimeSlots && (
              <div className="mt-4 p-4 border border-gold-500/20 bg-salon-black/40 rounded-lg shadow-inner">
                <label className="block text-gold-500 font-display text-lg mb-3 text-center">Available Sessions</label>
                
                {!newAppt.service_id && (
                  <p className="text-[10px] text-amber-500/80 text-center font-sans mb-3">
                    💡 Please search and select a service above to match with our expert specialists.
                  </p>
                )}

                {slots.length === 0 ? (
                  <p className="text-salon-muted text-xs italic bg-salon-dark/50 p-4 rounded-md text-center border border-salon-border/50">
                    Our specialists are currently fully engaged for this date. Please discover availability on another date.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {['Morning', 'Afternoon', 'Evening'].map(period => {
                      const periodSlots = slots.filter(slot => {
                        const h = parseInt(slot.substring(0, 2), 10);
                        if (period === 'Morning') return h < 12;
                        if (period === 'Afternoon') return h >= 12 && h < 17;
                        return h >= 17;
                      });

                      if (periodSlots.length === 0) return null;

                      return (
                        <div key={period} className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-px bg-gold-500/20 flex-1"></div>
                            <span className="text-gold-500 text-[10px] font-sans tracking-[0.2em] uppercase font-semibold">{period}</span>
                            <div className="h-px bg-gold-500/20 flex-1"></div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {periodSlots.map(slot => {
                              const time24 = slot.substring(0, 5);
                              const h = parseInt(time24.split(':')[0], 10);
                              const ampm = h >= 12 ? 'pm' : 'am';
                              const hour12 = h % 12 || 12;
                              const displayTime = `${hour12}:${time24.split(':')[1]} ${ampm}`;
                              const isSelected = newAppt.appointment_time?.substring(0, 5) === time24;
                              const isSlotClosed = (closedSlots[newAppt.appointment_date] || []).includes(displayTime);
                              
                              return (
                                <div key={slot} className="relative group/slot">
                                  <button 
                                    type="button" 
                                    disabled={isSlotClosed}
                                    onClick={() => {
                                      setNewAppt(p => ({ ...p, appointment_time: slot, staff_id: null }));
                                      setShowTimeSlots(false);
                                    }}
                                    className={`w-full group relative overflow-hidden py-2.5 px-1 rounded-md transition-all duration-300 ${
                                      isSlotClosed
                                        ? 'opacity-30 cursor-not-allowed bg-white/5 border border-white/5'
                                        : isSelected 
                                          ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-salon-black shadow-[0_0_15px_rgba(201,168,76,0.4)] scale-105 z-10' 
                                          : 'bg-salon-dark/80 border border-white/[0.05] text-salon-muted hover:border-gold-500/40 hover:bg-gold-500/5 hover:-translate-y-0.5'
                                    }`}
                                  >
                                    {isSelected && <div className="absolute inset-0 bg-white/20 blur-md rounded-full scale-150 animate-pulse" />}
                                    <div className="relative z-10 flex flex-col items-center justify-center">
                                      <span className={`text-sm font-sans font-bold tracking-wider ${isSelected ? 'text-salon-black' : isSlotClosed ? 'text-salon-muted' : 'text-salon-white group-hover:text-gold-400'}`}>
                                        {displayTime}
                                      </span>
                                      <span className={`text-[9px] font-bold tracking-widest ${isSelected ? 'text-black/60' : 'text-salon-muted/60'}`}>
                                        {slotToStaffMap[slot] ? 'AVAILABLE' : ''}
                                      </span>
                                    </div>
                                  </button>
                                  {isSlotClosed && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-salon-dark text-amber-500/90 text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/slot:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg border border-amber-500/20">
                                      Temporarily not available
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isSelectedDateClosed && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-400 font-sans leading-relaxed text-center animate-fade-in">
                ✨ <strong>A Gentle Note:</strong> We look forward to serving you! Please note that our salon is closed on <strong>{selectedDayName}s</strong> so our dedicated team of specialists can rest. We kindly invite you to select another convenient date, and we will be delighted to provide you with a premium, relaxing styling experience.
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <button 
                type="submit" 
                disabled={booking || selectedServices.length === 0 || isSelectedDateClosed} 
                className="relative overflow-hidden flex-1 py-4 text-xs font-sans tracking-[0.22em] uppercase font-bold bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 text-salon-black shadow-[0_4px_20px_rgba(201,168,76,0.35)] hover:shadow-[0_8px_30px_rgba(201,168,76,0.6)] active:shadow-[0_2px_10px_rgba(201,168,76,0.2)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none rounded-lg group"
              >
                {/* Apple-style light shimmer reflection sweep */}
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                
                <div className="relative z-10 flex justify-center items-center gap-3">
                  {booking ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  <span>{booking ? 'Confirming Reservation...' : 'Create Appointment'}</span>
                </div>
              </button>
            </div>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
