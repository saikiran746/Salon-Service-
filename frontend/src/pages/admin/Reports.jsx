import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { reportsAPI, billingAPI } from '../../services/api';
import { Download, Calendar as CalendarIcon, Filter, DollarSign, FileText, CalendarCheck, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthStartString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function AdminReports() {
  const todayStr = getLocalDateString();
  const firstDayStr = getLocalMonthStartString();

  // Report Date Range State
  const [reportFrom, setReportFrom] = useState(firstDayStr);
  const [reportTo, setReportTo] = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch Report Data for the selected range
  const loadReport = async () => {
    setReportLoading(true);
    try {
      const res = await reportsAPI.getDaily({ from_date: reportFrom, to_date: reportTo });
      setReportData(res.data.data);
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportFrom, reportTo]);

  // Export handler using the current selection range
  const handleExport = async () => {
    if (!reportFrom || !reportTo) return toast.error('Please select both dates');
    setExportLoading(true);
    try {
      const res = await reportsAPI.exportData({ from: reportFrom, to: reportTo });
      const { bills, appointments } = res.data.data;
      
      if (bills.length === 0 && appointments.length === 0) {
        toast.info('No data found for this date range');
        return;
      }

      const csvRows = [];
      
      // Invoices Section
      if (bills.length > 0) {
        csvRows.push('--- INVOICES ---');
        const headers = ['Invoice Number', 'Date', 'Time', 'Customer', 'Phone', 'Subtotal', 'Discount', 'Tax', 'Total Amount', 'Payment Method'];
        csvRows.push(headers.join(','));
        
        bills.forEach(b => {
          const d = new Date(b.created_at);
          const row = [
            b.invoice_number,
            d.toLocaleDateString(),
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            `"${b.customer_name || 'Walk-In'}"`,
            b.customer_phone ? `="${b.customer_phone}"` : '-',
            b.subtotal || 0,
            b.discount_amount || 0,
            b.tax_amount || 0,
            b.total_amount || 0,
            b.payment_method
          ];
          csvRows.push(row.join(','));
        });
        csvRows.push('');
      }

      // Appointments Section
      if (appointments.length > 0) {
        csvRows.push('--- APPOINTMENTS ---');
        const apptHeaders = ['Appointment Date', 'Time', 'Customer', 'Phone', 'Service', 'Staff', 'Status'];
        csvRows.push(apptHeaders.join(','));
        appointments.forEach(a => {
          const row = [
            a.appointment_date,
            a.appointment_time,
            `"${a.customer_name || 'Unknown'}"`,
            a.customer_phone ? `="${a.customer_phone}"` : '-',
            `"${a.service_name || 'Unknown'}"`,
            `"${a.staff_name || 'Unknown'}"`,
            a.status
          ];
          csvRows.push(row.join(','));
        });
      }
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `salon_report_${reportFrom}_to_${reportTo}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Report exported successfully');
    } catch (err) {
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const setPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setReportTo(getLocalDateString(end));
    setReportFrom(getLocalDateString(start));
  };

  const downloadBillFile = async (id, invoiceNo) => {
    try {
      const { data } = await billingAPI.downloadInvoice(id);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed.');
    }
  };

  return (
    <AdminLayout title="Salon Financial Reports">
      {/* Date Filters & Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6 bg-salon-card/30 border border-salon-border p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-salon-muted font-sans uppercase tracking-wider">From:</span>
            <div className="relative">
              <CalendarIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-salon-muted" />
              <input 
                type="date" 
                value={reportFrom} 
                onChange={e => setReportFrom(e.target.value)} 
                className="input-dark pl-8 py-1.5 text-xs w-36" 
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-salon-muted font-sans uppercase tracking-wider">To:</span>
            <div className="relative">
              <CalendarIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-salon-muted" />
              <input 
                type="date" 
                value={reportTo} 
                onChange={e => setReportTo(e.target.value)} 
                className="input-dark pl-8 py-1.5 text-xs w-36" 
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setPreset(0)} className="badge badge-gray hover:text-gold-500 cursor-pointer transition-colors px-2 py-1 text-[10px]">Today</button>
            <button onClick={() => setPreset(7)} className="badge badge-gray hover:text-gold-500 cursor-pointer transition-colors px-2 py-1 text-[10px]">7 Days</button>
            <button onClick={() => setPreset(30)} className="badge badge-gray hover:text-gold-500 cursor-pointer transition-colors px-2 py-1 text-[10px]">30 Days</button>
          </div>
        </div>
        
        <button 
          onClick={handleExport}
          disabled={exportLoading}
          className="btn-gold px-4 py-2 text-xs flex items-center gap-2 font-semibold font-sans uppercase tracking-wider"
        >
          {exportLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {exportLoading ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {reportLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 shimmer rounded-sm" />
            <div className="h-24 shimmer rounded-sm" />
            <div className="h-24 shimmer rounded-sm" />
          </div>
          <div className="h-32 shimmer rounded-sm" />
          <div className="h-64 shimmer rounded-sm" />
        </div>
      ) : reportData && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-salon-card/50 p-4 border border-salon-border/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0 border border-gold-500/20">
                <DollarSign size={20} className="text-gold-500" />
              </div>
              <div>
                <p className="text-[10px] font-sans text-salon-muted uppercase tracking-widest mb-0.5">Total Revenue</p>
                <p className="font-display text-2xl text-gold-500 font-semibold">₹{reportData.totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            
            <div className="bg-salon-card/50 p-4 border border-salon-border/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                <FileText size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-sans text-salon-muted uppercase tracking-widest mb-0.5">Invoices Count</p>
                <p className="font-display text-2xl text-salon-white font-light">{reportData.invoicesCount}</p>
              </div>
            </div>

            <div className="bg-salon-card/50 p-4 border border-salon-border/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                <CalendarCheck size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] font-sans text-salon-muted uppercase tracking-widest mb-0.5">Appointments</p>
                <p className="font-display text-2xl text-salon-white font-light">{reportData.appointmentsCount}</p>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          {(() => {
            const methods = [
              { key: 'upi',        label: 'UPI',        emoji: '📱' },
              { key: 'card',       label: 'Card',       emoji: '💳' },
              { key: 'cash',       label: 'Cash',       emoji: '💵' },
              { key: 'wallet',     label: 'Wallet',     emoji: '👛' },
              { key: 'membership', label: 'Membership', emoji: '👑' },
            ];
            const totals = methods.map(m => {
              let amount = 0;
              let count = 0;
              reportData.bills.forEach(b => {
                 if (!b.payment_method) return;
                 const pm = b.payment_method.toLowerCase();
                 if (pm.includes(m.key)) {
                    count++;
                    if (pm.includes(':')) {
                       const parts = pm.split(',');
                       parts.forEach(part => {
                          const [k, v] = part.split(':');
                          if (k && k.trim() === m.key) amount += parseFloat(v || 0);
                       });
                    } else if (pm.includes(',')) {
                       const parts = pm.split(',');
                       if (parts.some(p => p.trim() === m.key)) {
                           amount += parseFloat(b.total_amount || 0) / parts.length;
                       }
                    } else {
                       amount += parseFloat(b.total_amount || 0);
                    }
                 }
              });
              return { ...m, amount, count };
            }).filter(m => m.count > 0);

            if (totals.length === 0) return null;
            return (
              <div className="bg-salon-card/30 border border-salon-border p-6">
                <div className="mb-4">
                  <div className="text-salon-white text-xs font-sans tracking-widest uppercase font-semibold">Payment Methods Breakdown</div>
                  <div className="text-salon-muted text-[10px] font-body mt-0.5">Transactions & amounts for the selected period</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {totals.map(m => (
                    <div key={m.key} className="stat-card border border-salon-border/40 bg-salon-card/40 backdrop-blur-md flex flex-col items-center justify-center py-4 gap-1.5">
                      <span className="text-xl">{m.emoji}</span>
                      <div className="font-display text-lg text-gold-500 font-semibold">₹{m.amount.toLocaleString('en-IN')}</div>
                      <div className="text-salon-white text-xs font-sans font-semibold">{m.label}</div>
                      <div className="text-salon-muted text-[10px] font-body">{m.count} txn{m.count !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Table list */}
          <div className="admin-card overflow-x-auto border border-salon-border bg-salon-card/30">
            <h3 className="p-6 font-display text-base text-salon-white border-b border-salon-border">Period Invoices Registry</h3>
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-salon-border bg-salon-black/40">
                  {['Invoice Number', 'Customer Name', 'Phone', 'Billing Date', 'Payment Mode', 'Final Amount', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.bills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-salon-muted text-sm font-body">No invoices generated for selected date range.</td>
                  </tr>
                ) : (
                  reportData.bills.map(b => (
                    <tr key={b.id} className="border-b border-salon-border/20 hover:bg-salon-black/40 transition-colors">
                      <td className="table-cell px-6 py-4 text-gold-500 text-xs font-sans font-bold">{b.invoice_number}</td>
                      <td className="table-cell px-6 py-4 text-xs font-semibold text-salon-white">{b.customer_name || 'Walk-In Customer'}</td>
                      <td className="table-cell px-6 py-4 text-xs text-salon-muted">{b.customer_phone || 'N/A'}</td>
                      <td className="table-cell px-6 py-4 text-xs text-salon-muted">
                        {new Date(b.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        <span className="text-[10px] text-salon-muted/60 ml-2">
                          {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="table-cell px-6 py-4 text-xs"><span className="badge badge-gray uppercase">{b.payment_method}</span></td>
                      <td className="table-cell px-6 py-4 font-display text-base text-gold-500">₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</td>
                      <td className="table-cell px-6 py-4 flex gap-3 font-sans">
                        <button 
                          onClick={() => downloadBillFile(b.id, b.invoice_number)} 
                          className="text-salon-muted hover:text-gold-500 transition-colors flex items-center" 
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';
                            window.open(`${backendOrigin}/invoices/${b.id}.pdf`, '_blank');
                          }} 
                          className="text-salon-muted hover:text-gold-500 transition-colors flex items-center" 
                          title="Preview invoice"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
