import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import ChartCard from '../../../components/admin/ChartCard';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Receipt, TrendingUp, DollarSign, Percent, Tag, CreditCard } from 'lucide-react';
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
          <span className="text-white font-semibold font-sans">₹{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

const defaultData = {
  totalBills: 0, avgBillValue: 0, highestBill: 0, gstCollected: 0, discountGiven: 0, netRevenue: 0,
  avgBillTrend: [], paymentMethods: [], breakdown: []
};

export default function BillingAnalytics() {
  const [billingData, setBillingData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getBillingAnalytics()
      .then(res => { if (res.data?.success) setBillingData(res.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Billing Analytics">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-[11px] text-white/30 font-sans tracking-widest uppercase">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const kpis = [
    { label: 'Total Bills', value: billingData.totalBills.toLocaleString(), icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Avg Bill Value', value: `₹${billingData.avgBillValue.toLocaleString()}`, icon: TrendingUp, color: 'text-gold-400', bg: 'bg-gold-500/10' },
    { label: 'Highest Bill', value: `₹${billingData.highestBill.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'GST Collected', value: `₹${billingData.gstCollected.toLocaleString('en-IN')}`, icon: Percent, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Discount Given', value: `₹${billingData.discountGiven.toLocaleString('en-IN')}`, icon: Tag, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Net Revenue', value: `₹${billingData.netRevenue.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  const paymentIcons = { 'Cash': '💵', 'Card': '💳', 'Upi': '📱', 'Online': '👑' };

  return (
    <AdminLayout title="Billing Analytics">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="stat-card text-center">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mx-auto mb-2`}>
              <k.icon size={14} className={k.color} />
            </div>
            <div className="font-display text-xl text-white font-light">{k.value}</div>
            <div className="text-[9px] text-white/25 font-sans uppercase tracking-wider mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ChartCard title="Average Bill Value Trend" subtitle="Monthly average bill amount">
            {billingData.avgBillTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={billingData.avgBillTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avg" name="Avg Bill Value" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-white/20 text-[11px] font-sans">No billing data yet</div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Revenue Breakdown" subtitle="By category">
          <div className="flex flex-col items-center">
            {billingData.breakdown.filter(b => b.value > 0).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={billingData.breakdown.filter(b => b.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {billingData.breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                    <Tooltip cursor={false} content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5 mt-1">
                  {billingData.breakdown.filter(b => b.value > 0).map((b, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                        <span className="text-[11px] text-white/40 font-sans">{b.name}</span>
                      </div>
                      <span className="text-[11px] text-white/60 font-sans">₹{(b.value/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-white/20 text-[11px] font-sans">No data</div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Payment Methods */}
      <ChartCard title="Payment Methods" subtitle="Transactions & amounts by method">
        {billingData.paymentMethods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {billingData.paymentMethods.filter(pm => pm.method.toLowerCase() !== 'online').map((pm, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">{paymentIcons[pm.method] || '💳'}</div>
                <div className="font-display text-xl text-white font-light">₹{pm.amount.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-white/50 font-sans mt-1">{pm.method}</div>
                <div className="text-[10px] text-white/25 font-sans">{pm.txns} transactions</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[120px] text-white/20 text-[11px] font-sans">No payment data yet</div>
        )}
      </ChartCard>
    </AdminLayout>
  );
}
