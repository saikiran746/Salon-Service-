import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Star, X } from 'lucide-react';
import { analyticsAPI } from '../../../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-white/50 text-[10px] font-sans uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/40 font-sans">{p.name}:</span>
          <span className="text-white font-semibold font-sans">
            {p.name?.includes('Revenue') ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function StaffPerformance() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState({ staff: [], revenueByStaff: [] });
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    analyticsAPI.getStaffPerformance()
      .then(res => {
        if (res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedStaff?.id) {
      setDetailLoading(true);
      analyticsAPI.getStaffDetail(selectedStaff.id)
        .then(res => {
          if (res.data?.success) {
            setSelectedStaffDetail(res.data.data);
          }
        })
        .catch(() => setSelectedStaffDetail(null))
        .finally(() => setDetailLoading(false));
    }
  }, [selectedStaff]);

  useEffect(() => {
    if (data.staff.length > 0 && location.state?.staffId) {
      const staffToSelect = data.staff.find(s => s.id === location.state.staffId);
      if (staffToSelect) {
        setSelectedStaff(staffToSelect);
        navigate('.', { replace: true, state: {} });
        setTimeout(() => {
          const el = document.getElementById(`staff-row-${staffToSelect.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [data.staff, location.state?.staffId, navigate]);

  if (loading) {
    return (
      <AdminLayout title="Staff Performance">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const { staff, revenueByStaff } = data;
  const top3 = staff.slice(0, 3);
  const allStaff = staff;

  return (
    <AdminLayout title="Staff Performance">

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="mb-6">
          <h3 className="card-title mb-4">🏆 Top Performers This Month</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((s, i) => (
              <div
                key={s.id}
                className={`admin-card cursor-pointer transition-all duration-200 ${selectedStaff?.id === s.id ? 'border-gold-500/40 shadow-[0_0_20px_rgba(201,168,76,0.1)]' : ''}`}
                onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
              >
                <div className="text-center">
                  {s.photo ? (
                    <img src={s.photo} alt={s.name} className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-3">
                      <span className="font-display text-gold-400 text-xl font-semibold">{s.avatar}</span>
                    </div>
                  )}
                  <h4 className="font-sans font-semibold text-white/85 text-sm mb-0.5">{s.name}</h4>
                  <p className="text-[11px] text-white/30 font-sans mb-3">{s.role}</p>
                  <div className="font-display text-2xl text-white font-light mb-1">
                    ₹{s.revenue >= 1000 ? `${(s.revenue/1000).toFixed(0)}K` : s.revenue.toLocaleString('en-IN')}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <Star size={11} className="text-gold-400" fill="#C9A84C" />
                    <span className="text-[12px] text-gold-400 font-sans font-semibold">{parseFloat(s.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[14px] text-white/75 font-sans font-semibold">{s.total_clients || 0}</p>
                      <p className="text-[9px] text-white/25 font-sans">Total Clients</p>
                    </div>
                    <div>
                      <p className="text-[14px] text-blue-400 font-sans font-semibold">{s.male_clients || 0}</p>
                      <p className="text-[9px] text-white/25 font-sans">Male</p>
                    </div>
                    <div>
                      <p className="text-[14px] text-pink-400 font-sans font-semibold">{s.female_clients || 0}</p>
                      <p className="text-[9px] text-white/25 font-sans">Female</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue by Staff Chart */}
      {revenueByStaff.length > 0 && (
        <div className="mb-6">
          <ChartCard title="Revenue by Staff" subtitle="Monthly revenue comparison (last 30 days)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByStaff} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Full staff table */}
      <div className="admin-card">
        <h3 className="card-title mb-5">All Staff Overview</h3>
        {allStaff.length === 0 ? (
          <p className="text-white/30 text-[12px] font-sans text-center py-8">No staff data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Staff', 'Total Clients', 'Male Clients', 'Female Clients', 'Revenue'].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allStaff.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <tr id={`staff-row-${s.id}`} className={`table-row cursor-pointer ${selectedStaff?.id === s.id ? 'bg-[#C9A84C]/5' : ''}`} onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          {s.photo ? (
                            <img src={s.photo} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gold-500/10 flex items-center justify-center">
                              <span className="text-[10px] text-gold-400 font-semibold">{s.avatar}</span>
                            </div>
                          )}
                          <span className="text-white/75 text-[12px] font-sans font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">{s.total_clients || 0}</td>
                      <td className="table-cell text-blue-400">{s.male_clients || 0}</td>
                      <td className="table-cell text-pink-400">{s.female_clients || 0}</td>
                      <td className="table-cell text-gold-400 font-semibold">₹{Number(s.revenue).toLocaleString('en-IN')}</td>
                    </tr>
                    
                    {/* EXPANDED DETAILS INLINE */}
                    {selectedStaff?.id === s.id && (
                      <tr>
                        <td colSpan="5" className="p-0 border-b border-white/[0.05]">
                          <div className="p-6 md:p-8 relative bg-[#080808] shadow-[inset_0_0_40px_rgba(201,168,76,0.03)] border-t-2 border-[#C9A84C]/40">
                            {/* Close button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedStaff(null); }}
                              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-[#C9A84C]/10 text-[#C9A84C] hover:text-white hover:bg-red-500/90 transition-all duration-300 border border-[#C9A84C]/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10"
                              title="Close Details"
                            >
                              <X size={14} />
                            </button>

                            {/* Premium Stats Header */}
                            <div className="flex flex-wrap items-center justify-between lg:justify-start gap-6 lg:gap-12 mb-8 bg-gradient-to-r from-[#C9A84C]/[0.08] to-transparent rounded-2xl p-6 border border-[#C9A84C]/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)] pr-16">
                              <div>
                                <p className="text-white font-semibold text-[18px]">{selectedStaff.appointments}</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mt-1">Total Clients</p>
                              </div>
                              <div className="w-px h-8 bg-white/10 hidden lg:block"></div>
                              <div>
                                <p className="text-white font-semibold text-[18px]">{selectedStaff.repeatRate}%</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mt-1">Rebooking</p>
                              </div>
                              <div className="w-px h-8 bg-white/10 hidden lg:block"></div>
                              <div>
                                <p className="text-white font-semibold text-[18px]">45min</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mt-1">Avg Time</p>
                              </div>
                              <div className="w-px h-8 bg-white/10 hidden lg:block"></div>
                              <div>
                                <p className="text-white font-semibold text-[18px] flex items-center gap-1.5">
                                  {parseFloat(selectedStaff.rating || 0).toFixed(1)} <Star size={12} fill="#C9A84C" className="text-gold-400" />
                                </p>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] mt-1">Satisfaction</p>
                              </div>

                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                              {/* Left Side: Monthly Trend Chart */}
                              {selectedStaff.monthlyTrend?.length > 0 && (
                                <div className="xl:col-span-4">
                                  <ChartCard title="Monthly Revenue" subtitle="Total revenue over the last 6 months">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={selectedStaff.monthlyTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`} />
                                        <Tooltip cursor={false} content={<CustomTooltip />} />
                                        <Bar dataKey="revenue" name="Revenue" fill="#C9A84C" radius={[2,2,0,0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </ChartCard>
                                </div>
                              )}
                              
                              {/* Right Side: Services Breakdown & Stats */}
                              <div className={selectedStaff.monthlyTrend?.length > 0 ? 'xl:col-span-8' : 'xl:col-span-12'}>
                                <div className="bg-[#0f0f0f] rounded-2xl border border-[#C9A84C]/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full">
                                  {detailLoading ? (
                                    <p className="text-white/30 text-[12px] font-sans text-center py-8">Loading services breakdown...</p>
                                  ) : selectedStaffDetail?.services?.length > 0 ? (
                                    <div className="overflow-auto custom-scrollbar max-h-[320px]">
                                      <table className="w-full">
                                        <thead className="sticky top-0 bg-[#0f0f0f] z-10 shadow-sm">
                                          <tr className="border-b border-white/[0.05]">
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Service</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Count</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Walk-Ins</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Male</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Female</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Booked</th>
                                            <th className="text-[10px] font-sans text-white/30 uppercase tracking-widest text-left py-3 px-4">Revenue</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {selectedStaffDetail.services.map((srv, idx) => (
                                            <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                              <td className="py-3 px-4 text-[13px] text-white/80 font-sans">{srv.name}</td>
                                              <td className="py-3 px-4 text-[13px] text-white/90 font-semibold">{srv.count}</td>
                                              <td className="py-3 px-4 text-[13px] text-white/60">{srv.walk_ins}</td>
                                              <td className="py-3 px-4 text-[13px] text-blue-400">{srv.male}</td>
                                              <td className="py-3 px-4 text-[13px] text-pink-400">{srv.female}</td>
                                              <td className="py-3 px-4 text-[13px] text-white/60">{srv.booked}</td>
                                              <td className="py-3 px-4 text-[13px] text-gold-400 font-semibold">₹{srv.revenue.toLocaleString('en-IN')}</td>
                                            </tr>
                                          ))}
                                          {selectedStaffDetail.services.length > 0 && (
                                            <tr className="border-t border-gold-500/20 bg-white/[0.02]">
                                              <td className="py-4 px-4 text-[12px] font-sans text-white/40 uppercase tracking-widest text-right">Total</td>
                                              <td className="py-4 px-4 text-[14px] text-white font-semibold">
                                                {selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)}
                                              </td>
                                              <td className="py-4 px-4 text-[14px] text-white/60 font-semibold">
                                                {selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.walk_ins) || 0), 0)}
                                              </td>
                                              <td className="py-4 px-4 text-[14px] text-blue-400 font-semibold">
                                                {selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.male) || 0), 0)}
                                              </td>
                                              <td className="py-4 px-4 text-[14px] text-pink-400 font-semibold">
                                                {selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.female) || 0), 0)}
                                              </td>
                                              <td className="py-4 px-4 text-[14px] text-white/60 font-semibold">
                                                {selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.booked) || 0), 0)}
                                              </td>
                                              <td className="py-4 px-4 text-[14px] text-gold-400 font-semibold">
                                                ₹{selectedStaffDetail.services.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0).toLocaleString('en-IN')}
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>

                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-white/30 text-[12px] font-sans text-center py-8">No services data available.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
