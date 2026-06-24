import { useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { AlertTriangle, Clock, TrendingUp, Package } from 'lucide-react';
import { inventoryData } from '../../../utils/mockAnalytics';

const tabs = [
  { id: 'lowStock', label: 'Low Stock', icon: AlertTriangle, color: 'text-red-400', count: inventoryData.lowStock.length },
  { id: 'expiring', label: 'Expiring', icon: Clock, color: 'text-orange-400', count: inventoryData.expiring.length },
  { id: 'fastMoving', label: 'Fast Moving', icon: TrendingUp, color: 'text-emerald-400', count: inventoryData.fastMoving.length },
  { id: 'deadStock', label: 'Dead Stock', icon: Package, color: 'text-gray-400', count: inventoryData.deadStock.length },
];

export default function InventoryAlerts() {
  const [activeTab, setActiveTab] = useState('lowStock');

  return (
    <AdminLayout title="Inventory Alerts">

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {tabs.map(tab => (
          <div key={tab.id} className={`stat-card cursor-pointer transition-all duration-200 ${activeTab === tab.id ? 'border-gold-500/30 shadow-[0_0_16px_rgba(201,168,76,0.08)]' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2`}>
              <tab.icon size={14} className={tab.color} />
            </div>
            <div className="font-display text-3xl text-white font-light">{tab.count}</div>
            <div className="text-[9px] text-white/25 font-sans uppercase tracking-wider mt-0.5">{tab.label}</div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'lowStock' && (
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-red-400" />
            <h3 className="card-title">Low Stock Products</h3>
            <span className="badge-red text-[9px]">URGENT REORDER</span>
          </div>
          <div className="space-y-2">
            {inventoryData.lowStock.map((item, i) => {
              const pct = (item.stock / item.minStock) * 100;
              const urgency = item.stock <= 2 ? 'border-red-500/20 bg-red-500/5' : 'border-orange-500/15 bg-orange-500/5';
              return (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${urgency}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/75 font-sans font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-white/25 font-sans">{item.sku} · {item.category}</p>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <div className="flex justify-between text-[10px] font-sans mb-1">
                      <span className="text-white/30">{item.stock}/{item.minStock}</span>
                      <span className={item.stock <= 2 ? 'text-red-400' : 'text-orange-400'}>{item.unit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.stock <= 2 ? '#EF4444' : '#F59E0B' }} />
                    </div>
                  </div>
                  <button className="btn-outline-gold text-[9px] px-3 py-1.5 flex-shrink-0">Reorder</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'expiring' && (
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-orange-400" />
            <h3 className="card-title">Expiring Products</h3>
          </div>
          <div className="space-y-2">
            {inventoryData.expiring.map((item, i) => {
              const daysLeft = Math.round((new Date(item.expiry) - new Date()) / 86400000);
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-orange-500/15 bg-orange-500/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/75 font-sans font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-white/25 font-sans">{item.sku} · {item.category}</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-[12px] font-sans font-semibold text-orange-400">{daysLeft} days</p>
                    <p className="text-[9px] text-white/20 font-sans">expires {item.expiry}</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-[12px] font-sans text-white/60">{item.stock}</p>
                    <p className="text-[9px] text-white/20 font-sans">in stock</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'fastMoving' && (
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-emerald-400" />
            <h3 className="card-title">Fast Moving Products</h3>
          </div>
          <div className="space-y-2">
            {inventoryData.fastMoving.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors border border-white/[0.04]">
                <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-emerald-400 font-bold">#{i+1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/75 font-sans font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-white/25 font-sans">{item.sku} · {item.category}</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-[13px] font-sans font-semibold text-emerald-400">{item.soldThisMonth}</p>
                  <p className="text-[9px] text-white/20 font-sans">sold this month</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-[12px] font-sans text-gold-400 font-semibold">₹{item.revenue.toLocaleString()}</p>
                  <p className="text-[9px] text-white/20 font-sans">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deadStock' && (
        <div className="admin-card">
          <div className="flex items-center gap-2 mb-4">
            <Package size={14} className="text-white/30" />
            <h3 className="card-title">Dead Stock</h3>
            <span className="badge-gray text-[9px]">CLEARANCE NEEDED</span>
          </div>
          <div className="space-y-2">
            {inventoryData.deadStock.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/50 font-sans font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-white/20 font-sans">{item.sku} · {item.category} · Last sold: {item.lastSold}</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-[12px] font-sans text-white/40">{item.stock} units</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-[12px] font-sans text-red-400">₹{item.value.toLocaleString()}</p>
                  <p className="text-[9px] text-white/20 font-sans">tied capital</p>
                </div>
                <button className="btn-outline-gold text-[9px] px-3 py-1.5 flex-shrink-0">Discount</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
