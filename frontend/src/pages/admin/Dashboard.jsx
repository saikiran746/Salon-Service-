import { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, subWeeks, addWeeks, subMonths, addMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import KPICard from '../../components/admin/KPICard';
import ChartCard from '../../components/admin/ChartCard';
import { reportsAPI } from '../../services/api';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, Calendar, Users, UserPlus,
  Repeat, Crown, Star, ArrowRight, Medal, Activity, Receipt,
  Phone, Globe, Landmark, Wallet
} from 'lucide-react';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-white/60 text-[10px] font-sans uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/50 font-sans">{p.name}:</span>
          <span className="text-white font-semibold font-sans">
            {p.name?.includes('Revenue') || p.name?.includes('₹')
              ? `₹${Number(p.value).toLocaleString('en-IN')}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const kpiCards = [
  { label: "Today's Revenue", key: 'todayRevenue', icon: DollarSign },
  { label: 'Monthly Revenue', key: 'monthlyRevenue', icon: TrendingUp },
  { label: 'New Client Revenue', key: 'newClientRevenue', icon: Landmark },
  { label: 'Old Client Revenue', key: 'oldClientRevenue', icon: Wallet },
  { label: 'Total Clients', key: 'totalClients', icon: Users },
  { label: 'Walk-ins', key: 'walkIns', icon: UserPlus },
  { label: 'Phone Appointments', key: 'phoneAppointments', icon: Phone },
  { label: 'Website Appointments', key: 'websiteAppointments', icon: Globe },
];




export default function AdminDashboard() {
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [chartPage, setChartPage] = useState(1);
  const [revenueChartPage, setRevenueChartPage] = useState(1);
  const [kpis, setKpis] = useState({});
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [apptSummary, setApptSummary] = useState({ completed: 0, confirmed: 0, cancelled: 0, pending: 0, total: 0 });
  const [revenueBreakdown, setRevenueBreakdown] = useState([
    { name: 'Services', value: 0, color: '#C9A84C' },
    { name: 'Memberships', value: 0, color: '#8B5CF6' }
  ]);
  const [newOldRevenueBreakdown, setNewOldRevenueBreakdown] = useState([
    { name: 'New Clients', value: 0, color: '#10B981' },
    { name: 'Repeat Clients', value: 0, color: '#3B82F6' }
  ]);
  const [appointmentSourceBreakdown, setAppointmentSourceBreakdown] = useState([
    { name: 'Website', value: 0, color: '#C9A84C' },
    { name: 'Phone', value: 0, color: '#8B5CF6' },
    { name: 'Walk-in', value: 0, color: '#EF4444' }
  ]);
  const [loading, setLoading] = useState(true);

  // New States for Today's Revenue expanded modal
  const [revenueViewMode, setRevenueViewMode] = useState('week'); // 'week' | 'month'
  const [revenueRefDate, setRevenueRefDate] = useState(new Date());
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [isRevenueLoading, setIsRevenueLoading] = useState(false);

  useEffect(() => {
    if (selectedKpi?.key === 'todayRevenue') {
      const fetchDailyRevenue = async () => {
        setIsRevenueLoading(true);
        let startDate, endDate;
        if (revenueViewMode === 'week') {
          startDate = startOfWeek(revenueRefDate, { weekStartsOn: 1 }); // Monday start
          endDate = endOfWeek(revenueRefDate, { weekStartsOn: 1 });
        } else {
          startDate = startOfMonth(revenueRefDate);
          endDate = endOfMonth(revenueRefDate);
        }
        
        try {
          const res = await reportsAPI.getDaily({
            from_date: format(startDate, 'yyyy-MM-dd'),
            to_date: format(endDate, 'yyyy-MM-dd')
          });
          
          if (res.data?.success) {
            const bills = res.data.data.bills || [];
            
            // Create empty array of days
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            const dataMap = {};
            days.forEach(d => {
              dataMap[format(d, 'yyyy-MM-dd')] = 0;
            });
            
            bills.forEach(b => {
              const dateKey = format(new Date(b.created_at), 'yyyy-MM-dd');
              if (dataMap[dateKey] !== undefined) {
                dataMap[dateKey] += parseFloat(b.total_amount || 0);
              }
            });
            
            const chartData = days.map(d => ({
              date: format(d, 'MMM d'),
              value: dataMap[format(d, 'yyyy-MM-dd')]
            }));
            
            setRevenueChartData(chartData);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsRevenueLoading(false);
        }
      };
      
      fetchDailyRevenue();
    }
  }, [selectedKpi, revenueRefDate, revenueViewMode]);

  const formatBreakdownValue = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await reportsAPI.getDashboard();
        if (response.data?.success) {
          const apiData = response.data.data;
          
          // 1. Map API data to kpiCards
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthsKeys = []; // YYYY-MM
          const monthsLabels = []; // Jan
          for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            monthsKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            monthsLabels.push(`${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`);
          }

          const monthlyRevenueMap = {};
          const monthlyTransactionsMap = {};
          
          (apiData.charts?.revenue || []).forEach(item => {
            monthlyRevenueMap[item.month] = Number(item.revenue);
            monthlyTransactionsMap[item.month] = Number(item.transactions);
          });
          
          const revenueSparkline = monthsKeys.map(m => monthlyRevenueMap[m] || 0);
          const appointmentsSparkline = monthsKeys.map(m => monthlyTransactionsMap[m] || 0);

          const newCustomersMap = {};
          (apiData.charts?.customerGrowth || []).forEach(item => {
            newCustomersMap[item.month] = Number(item.new_customers);
          });
          const newCustomersSparkline = monthsKeys.map(m => newCustomersMap[m] || 0);

          const billedClientsMap = {};
          (apiData.charts?.billedClientsTrend || []).forEach(item => {
            billedClientsMap[item.month] = Number(item.new_customers);
          });
          const billedClientsSparkline = monthsKeys.map(m => billedClientsMap[m] || 0);

          const mapTrend = (trendArray) => {
            const mapObj = {};
            const trendData = [];
            (trendArray || []).forEach(item => {
              mapObj[item.month] = Number(item.count);
            });
            const sparkline = monthsKeys.map(m => mapObj[m] || 0);
            monthsKeys.forEach((m, i) => {
              trendData.push({ month: monthsLabels[i], value: mapObj[m] || 0 });
            });
            return { sparkline, trendData };
          };

          const walkinsTrend = mapTrend(apiData.charts?.repeatWalkinsTrend);
          const allWalkinsTrend = mapTrend(apiData.charts?.walkInsTrend);
          const bookedApptsTrend = mapTrend(apiData.charts?.repeatBookedApptsTrend);
          const bookedByCallsTrend = mapTrend(apiData.charts?.repeatBookedByCallsTrend);

          const newClientRevTrendMap = mapTrend(apiData.charts?.newClientRevenueTrend);
          const oldClientRevTrendMap = mapTrend(apiData.charts?.oldClientRevenueTrend);
          const phoneApptsTrendMap = mapTrend(apiData.charts?.phoneApptsTrend);
          const websiteApptsTrendMap = mapTrend(apiData.charts?.websiteApptsTrend);

          const todayRevenueVal = Number(apiData.revenue?.daily || 0);
          const walkInsThisMonthVal = Number(apiData.appointments?.walkInsThisMonth || 0);
          const walkInsPrevMonthVal = Number(apiData.appointments?.walkInsPrevMonth || 0);

          const repeatedClientsVal = Number(apiData.customers?.repeatWalkins || 0) + Number(apiData.customers?.repeatBookedAppts || 0) + Number(apiData.customers?.repeatBookedByCalls || 0);
          const repeatedClientsPrev = Number(apiData.customers?.repeatWalkinsPrev || 0) + Number(apiData.customers?.repeatBookedApptsPrev || 0) + Number(apiData.customers?.repeatBookedByCallsPrev || 0);
          const repeatedClientsGrowth = repeatedClientsPrev > 0 
            ? ((repeatedClientsVal - repeatedClientsPrev) / repeatedClientsPrev) * 100 
            : (repeatedClientsVal > 0 ? 100 : 0);
          
          const repeatedClientsTrendData = monthsKeys.map((m, i) => ({
            month: monthsLabels[i],
            value: (walkinsTrend.sparkline[i] || 0) + 
                   (bookedApptsTrend.sparkline[i] || 0) + 
                   (bookedByCallsTrend.sparkline[i] || 0)
          }));
          const repeatedClientsSparkline = repeatedClientsTrendData.map(t => t.value);

          const totalClientsVal = billedClientsSparkline[billedClientsSparkline.length - 1] || 0;
          const totalClientsPrev = billedClientsSparkline[billedClientsSparkline.length - 2] || 0;
          const totalClientsGrowth = totalClientsPrev > 0 ? ((totalClientsVal - totalClientsPrev) / totalClientsPrev) * 100 : (totalClientsVal > 0 ? 100 : 0);


          const mappedKpiData = {
            todayRevenue: {
              value: todayRevenueVal,
              prev: todayRevenueVal * 0.9,
              growth: todayRevenueVal > 0 ? 12.2 : 0,
              currency: '₹',
              sparkline: revenueSparkline,
              trendData: revenueSparkline.map((val, i) => ({ month: monthsLabels[i], value: val }))
            },
            monthlyRevenue: {
              value: Number(apiData.revenue?.monthly || 0),
              prev: Number(apiData.revenue?.total || 0) - Number(apiData.revenue?.monthly || 0),
              growth: Number(apiData.revenue?.monthly || 0) > 0 ? 11.2 : 0,
              currency: '₹',
              sparkline: revenueSparkline,
              trendData: revenueSparkline.map((val, i) => ({ month: monthsLabels[i], value: val }))
            },
            newClientRevenue: {
              value: Number(apiData.revenue?.newClientThisMonth || 0),
              prev: Number(apiData.revenue?.newClientPrevMonth || 0),
              growth: apiData.revenue?.newClientPrevMonth > 0 ? ((apiData.revenue.newClientThisMonth - apiData.revenue.newClientPrevMonth) / apiData.revenue.newClientPrevMonth) * 100 : (apiData.revenue?.newClientThisMonth > 0 ? 100 : 0),
              currency: '₹',
              sparkline: newClientRevTrendMap.sparkline,
              trendData: newClientRevTrendMap.trendData
            },
            oldClientRevenue: {
              value: Number(apiData.revenue?.oldClientThisMonth || 0),
              prev: Number(apiData.revenue?.oldClientPrevMonth || 0),
              growth: apiData.revenue?.oldClientPrevMonth > 0 ? ((apiData.revenue.oldClientThisMonth - apiData.revenue.oldClientPrevMonth) / apiData.revenue.oldClientPrevMonth) * 100 : (apiData.revenue?.oldClientThisMonth > 0 ? 100 : 0),
              currency: '₹',
              sparkline: oldClientRevTrendMap.sparkline,
              trendData: oldClientRevTrendMap.trendData
            },
            totalClients: {
              value: totalClientsVal,
              prev: totalClientsPrev,
              growth: totalClientsGrowth,
              sparkline: billedClientsSparkline,
              trendData: billedClientsSparkline.map((val, i) => ({ month: monthsLabels[i], value: val }))
            },
            walkIns: {
              value: Number(apiData.appointments?.walkInsThisMonth || 0),
              prev: Number(apiData.appointments?.walkInsPrevMonth || 0),
              growth: apiData.appointments?.walkInsPrevMonth > 0 ? ((apiData.appointments.walkInsThisMonth - apiData.appointments.walkInsPrevMonth) / apiData.appointments.walkInsPrevMonth) * 100 : (apiData.appointments?.walkInsThisMonth > 0 ? 100 : 0),
              sparkline: allWalkinsTrend.sparkline,
              trendData: allWalkinsTrend.trendData
            },
            phoneAppointments: {
              value: Number(apiData.appointments?.phoneThisMonth || 0),
              prev: Number(apiData.appointments?.phonePrevMonth || 0),
              growth: apiData.appointments?.phonePrevMonth > 0 ? ((apiData.appointments.phoneThisMonth - apiData.appointments.phonePrevMonth) / apiData.appointments.phonePrevMonth) * 100 : (apiData.appointments?.phoneThisMonth > 0 ? 100 : 0),
              sparkline: phoneApptsTrendMap.sparkline,
              trendData: phoneApptsTrendMap.trendData
            },
            websiteAppointments: {
              value: Number(apiData.appointments?.websiteThisMonth || 0),
              prev: Number(apiData.appointments?.websitePrevMonth || 0),
              growth: apiData.appointments?.websitePrevMonth > 0 ? ((apiData.appointments.websiteThisMonth - apiData.appointments.websitePrevMonth) / apiData.appointments.websitePrevMonth) * 100 : (apiData.appointments?.websiteThisMonth > 0 ? 100 : 0),
              sparkline: websiteApptsTrendMap.sparkline,
              trendData: websiteApptsTrendMap.trendData
            }
          };

          setKpis(mappedKpiData);

          // 2. Map Revenue Monthly Trend
          if (apiData.charts?.revenue && apiData.charts.revenue.length > 0) {
            const mappedRevenueTrend = apiData.charts.revenue.map(item => {
              const [yyyy, mm] = item.month.split('-');
              return {
                month: `${monthNames[parseInt(mm) - 1]} '${yyyy.slice(-2)}` || item.month,
                revenue: Number(item.revenue || 0),
                services: Number(item.services || 0),
                memberships: Number(item.memberships || 0),
                transactions: Number(item.transactions || 0)
              };
            });
            setRevenueTrend(mappedRevenueTrend);
          }

          // 3. Map Top Services
          if (apiData.charts?.topServices && apiData.charts.topServices.length > 0) {
            const mappedTopServices = apiData.charts.topServices.map(item => ({
              name: item.name,
              revenue: Number(item.revenue),
              bookings: Number(item.bookings),
              color: '#C9A84C'
            }));
            setTopServices(mappedTopServices);
          }

          // 4. Map Appointment Status Summary
          if (apiData.appointments?.summary) {
            setApptSummary(apiData.appointments.summary);
          }

          // 5. Map Revenue Breakdown
          const servicesVal = Number(apiData.revenue?.monthlyServices || apiData.revenue?.monthly || 0);
          const membershipsVal = Number(apiData.revenue?.monthlyMemberships || 0);
          setRevenueBreakdown([
            { name: 'Services', value: servicesVal, color: '#C9A84C' },
            { name: 'Memberships', value: membershipsVal, color: '#8B5CF6' }
          ]);
          setNewOldRevenueBreakdown([
            { name: 'New Clients', value: Number(apiData.revenue?.newClientThisMonth || 0), color: '#10B981' },
            { name: 'Repeat Clients', value: Number(apiData.revenue?.oldClientThisMonth || 0), color: '#3B82F6' }
          ]);
          setAppointmentSourceBreakdown([
            { name: 'Website', value: Number(apiData.appointments?.websiteThisMonth || 0), color: '#C9A84C' },
            { name: 'Phone', value: Number(apiData.appointments?.phoneThisMonth || 0), color: '#8B5CF6' },
            { name: 'Walk-in', value: Number(apiData.appointments?.walkInsThisMonth || 0), color: '#EF4444' }
          ]);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-[11px] text-white/40 font-sans tracking-widest uppercase">Loading Dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      
      {/* Welcome banner */}
      <div className="mb-6 p-5 rounded-xl border border-gold-500/10 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.05) 0%, rgba(10,10,10,0) 60%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative">
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase mb-1">
            Good Evening ✦
          </p>
          <h2 className="font-display text-2xl text-white font-light">
            TONI & GUY ESSENSUALS — <span className="text-gradient-gold">Kondapur</span>
          </h2>
          <p className="text-[12px] text-white/30 font-sans mt-1">
            Today's revenue is tracking <span className="text-emerald-400">12.2% ahead</span> of yesterday. 9 appointments remaining today.
          </p>
        </div>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((card, i) => (
          <KPICard
            key={card.key}
            label={card.label}
            data={kpis[card.key]}
            icon={card.icon}
            delay={i * 60}
            onClick={() => setSelectedKpi(card)}
          />
        ))}
      </div>



      {/* ── Revenue Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Revenue Trend */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Revenue Trend"
            subtitle="12-Month Trend Analysis"
            headerRight={
              <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                <button
                  onClick={() => setRevenueChartPage(0)}
                  disabled={revenueChartPage === 0}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors text-xs ${revenueChartPage === 0 ? 'text-white/20 cursor-not-allowed' : 'text-gold-400 hover:bg-white/10'}`}
                >
                  ←
                </button>
                <button
                  onClick={() => setRevenueChartPage(1)}
                  disabled={revenueChartPage === 1}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors text-xs ${revenueChartPage === 1 ? 'text-white/20 cursor-not-allowed' : 'text-gold-400 hover:bg-white/10'}`}
                >
                  →
                </button>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend.slice(revenueChartPage * 6, (revenueChartPage + 1) * 6)} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="servicesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="membershipsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', fontFamily: 'Raleway', color: 'rgba(255,255,255,0.4)', paddingBottom: '10px' }} />
                <Area type="monotone" dataKey="services" name="Service Revenue" stroke="#C9A84C" strokeWidth={2} fill="url(#servicesGradient)" dot={false} />
                <Area type="monotone" dataKey="memberships" name="Membership Revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#membershipsGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Revenue Breakdown (New vs Old) */}
        <ChartCard title="Revenue Breakdown" subtitle="New vs Repeat Clients">
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={newOldRevenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {newOldRevenueBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip cursor={false} content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {newOldRevenueBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[11px] text-white/40 font-sans">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-white/70 font-sans font-medium">
                    {formatBreakdownValue(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Appointment Source Pie */}
        <ChartCard title="Appointment Source" subtitle="Walk-ins vs Phone vs Web">
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={appointmentSourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {appointmentSourceBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip cursor={false} content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {appointmentSourceBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[11px] text-white/40 font-sans">{item.name}</span>
                  </div>
                  <span className="text-[11px] text-white/70 font-sans font-medium">
                    {item.value} Appts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>



      {/* ── Services + Appointment Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        
        {/* Top Services */}
        <div className="lg:col-span-2">
          <ChartCard title="Top Services by Revenue" subtitle="This month performance">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topServices}
                margin={{ top: 5, right: 10, bottom: 75, left: 0 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway', angle: -35, textAnchor: 'end' }} 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0} 
                  height={85}
                />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
                  {topServices.map((entry, i) => (
                    <Cell key={i} fill={entry.color || '#C9A84C'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Appointment Summary */}
        <ChartCard title="Appointments" subtitle="Status breakdown">
          <div className="space-y-3">
            {[
              { label: 'Completed', value: apptSummary.completed, total: apptSummary.total, color: '#10B981', icon: '✓' },
              { label: 'Confirmed', value: apptSummary.confirmed, total: apptSummary.total, color: '#3B82F6', icon: '○' },
              { label: 'Cancelled', value: apptSummary.cancelled, total: apptSummary.total, color: '#EF4444', icon: '✕' },
              { label: 'Pending', value: apptSummary.pending, total: apptSummary.total, color: '#F59E0B', icon: '⌛' },
            ].map((item, i) => {
              const pct = item.total > 0 ? (item.value / item.total) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.icon}</span>
                      <span className="text-[11px] text-white/50 font-sans">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white/70 font-sans font-medium">{item.value}</span>
                      <span className="text-[10px] text-white/20 font-sans">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <p className="text-center text-[11px] text-white/20 font-sans">
              Total: <span className="text-white/50 font-semibold">{apptSummary.total.toLocaleString()}</span> this month
            </p>
          </div>
        </ChartCard>
      </div>

      {/* ── Quick Links to Analytics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Client Analytics', to: '/admin/analytics/clients', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Staff Performance', to: '/admin/analytics/staff', icon: Medal, color: 'text-gold-400', bg: 'bg-gold-500/10' },
          { label: 'Service Analytics', to: '/admin/analytics/services', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Appt Analytics', to: '/admin/analytics/appointments', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Billing Analytics', to: '/admin/analytics/billing', icon: Receipt, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        ].map((item, i) => (
          <Link
            key={i}
            to={item.to}
            className="glass-card p-4 hover:border-gold-500/20 transition-all duration-200 group flex flex-col items-center gap-2 text-center hover:-translate-y-0.5"
          >
            <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
              <item.icon size={16} className={item.color} />
            </div>
            <p className="text-[10px] text-white/40 font-sans font-semibold tracking-wide group-hover:text-white/70 transition-colors leading-tight">
              {item.label}
            </p>
          </Link>
        ))}
      </div>

      {/* ── KPI Expanded Modal ── */}
      {selectedKpi && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-salon-card border border-gold-500/20 p-4 md:p-6 rounded-2xl w-full max-w-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setSelectedKpi(null); setChartPage(1); }}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex items-center justify-between mb-4 md:mb-8 pr-8">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <selectedKpi.icon size={20} className="text-gold-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg md:text-2xl text-white font-light">{selectedKpi.label}</h3>
                  <p className="text-xs md:text-sm text-white/40 font-sans mt-0.5 md:mt-1">
                    {selectedKpi.key === 'todayRevenue' 
                      ? (revenueViewMode === 'week' ? 'Weekly Revenue Trend' : 'Monthly Revenue Trend') 
                      : '12-Month Trend Analysis'}
                  </p>
                </div>
              </div>
              
              {selectedKpi.key === 'todayRevenue' ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex bg-white/5 rounded-lg p-1">
                    <button 
                      onClick={() => { setRevenueViewMode('week'); setRevenueRefDate(new Date()); }}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${revenueViewMode === 'week' ? 'bg-gold-500/20 text-gold-400' : 'text-white/40 hover:text-white/80'}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => { setRevenueViewMode('month'); setRevenueRefDate(new Date()); }}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${revenueViewMode === 'month' ? 'bg-gold-500/20 text-gold-400' : 'text-white/40 hover:text-white/80'}`}
                    >
                      Month
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRevenueRefDate(revenueViewMode === 'week' ? subWeeks(revenueRefDate, 1) : subMonths(revenueRefDate, 1))}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-gold-500/10 text-gold-400 hover:bg-gold-500/20"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setRevenueRefDate(revenueViewMode === 'week' ? addWeeks(revenueRefDate, 1) : addMonths(revenueRefDate, 1))}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-gold-500/10 text-gold-400 hover:bg-gold-500/20"
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartPage(0)}
                    disabled={chartPage === 0}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${chartPage === 0 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gold-500/10 text-gold-400 hover:bg-gold-500/20'}`}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setChartPage(1)}
                    disabled={chartPage === 1}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${chartPage === 1 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gold-500/10 text-gold-400 hover:bg-gold-500/20'}`}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full relative">
              {isRevenueLoading && selectedKpi.key === 'todayRevenue' && (
                <div className="absolute inset-0 z-10 bg-salon-card/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedKpi.key === 'todayRevenue' ? revenueChartData : (kpis[selectedKpi.key]?.trendData || []).slice(chartPage * 6, (chartPage + 1) * 6)}>
                  <defs>
                    <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey={selectedKpi.key === 'todayRevenue' ? 'date' : 'month'} 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway' }} 
                    axisLine={false} tickLine={false} dy={10} 
                  />
                  <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} dx={-10}
                    tickFormatter={v => kpis[selectedKpi.key]?.currency ? `₹${(v/1000).toFixed(0)}K` : (kpis[selectedKpi.key]?.unit ? `${v}${kpis[selectedKpi.key]?.unit}` : v)} />
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name={selectedKpi.label} stroke="#C9A84C" strokeWidth={3} fill="url(#modalGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
