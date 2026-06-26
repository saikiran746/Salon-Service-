// ===== ADMIN BILLING PAGE (POS REDESIGN) =====
import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { billingAPI, customersAPI, servicesAPI, membershipsAPI, authAPI, staffAPI, whatsappAPI } from '../../services/api';
import { Plus, Download, X, Search, User, Shield, Sparkles, Check, Crown, Phone, ArrowRight, Wallet, CreditCard, Landmark, CheckCircle, Eye, Mail, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthStartString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function AdminBilling() {
  // Billing history & stats
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ date: getLocalDateString(), payment_method: '', page: 1 });
  
  // Active DB lists
  const [dbServices, setDbServices] = useState([]);
  const [dbMembershipPlans, setDbMembershipPlans] = useState([]);
  
  // POS States
  const [mobileSearch, setMobileSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Inline quick-add customer
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddEmail, setQuickAddEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Inline membership modal
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [purchasingMembershipId, setPurchasingMembershipId] = useState('');
  const [buyingMembership, setBuyingMembership] = useState(false);

  // Gender & Stylist
  const [selectedGender, setSelectedGender] = useState('');
  
  const handleGenderChange = (g) => {
    // Toggle: clicking the same gender deselects it
    setSelectedGender(prev => prev === g ? '' : g);
  };

  const [servicesLoading, setServicesLoading] = useState(false);
  const [dbStaff, setDbStaff] = useState([]);
  const [selectedStylistId, setSelectedStylistId] = useState('');

  // Service Selector inputs
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [filteredServiceSuggestions, setFilteredServiceSuggestions] = useState([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [selectedServiceInput, setSelectedServiceInput] = useState(null);
  const [serviceQty, setServiceQty] = useState(1);
  const [servicePrice, setServicePrice] = useState('');

  // Settle & Calculation states
  const [addedItems, setAddedItems] = useState([]);

  const [gstPercent, setGstPercent] = useState(5); // Default 5%, editable
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'card', 'upi', 'wallet', 'split'
  
  // Split payment amounts
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [splitWallet, setSplitWallet] = useState(0);

  // Success & Preview States
  const [saving, setSaving] = useState(false);
  const [lastGeneratedBillId, setLastGeneratedBillId] = useState(null);
  const [lastGeneratedInvoiceNo, setLastGeneratedInvoiceNo] = useState('');
  const [lastGeneratedCustomerPhone, setLastGeneratedCustomerPhone] = useState('');
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [waSettings, setWaSettings] = useState(null);

  // Auto-fill from Appointment states
  const [appointmentId, setAppointmentId] = useState(null);
  const [pendingUrlParams, setPendingUrlParams] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apptId = urlParams.get('appointment_id');
    if (apptId) {
      setPendingUrlParams({
        appointment_id: apptId,
        phone: urlParams.get('phone'),
        service: urlParams.get('service'),
        stylist: urlParams.get('stylist'),
        price: urlParams.get('price')
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (pendingUrlParams && dbServices.length > 0) { // dbStaff might be empty or load later, don't wait strictly on it if it's 0 length, but dbServices should exist
      setAppointmentId(pendingUrlParams.appointment_id);
      
      if (pendingUrlParams.phone) {
        setMobileSearch(pendingUrlParams.phone);
      }
      
      const srv = dbServices.find(s => s.name.toLowerCase() === (pendingUrlParams.service || '').toLowerCase());
      const stf = dbStaff.find(s => s.name.toLowerCase() === (pendingUrlParams.stylist || '').toLowerCase());
      
      if (srv || pendingUrlParams.service) {
        setAddedItems([{
          description: srv ? srv.name : pendingUrlParams.service,
          quantity: 1,
          price: pendingUrlParams.price ? parseFloat(pendingUrlParams.price) : (srv ? parseFloat(srv.price) : 0),
          service_id: srv ? srv.id : null,
          staff_id: stf ? stf.id : null,
          stylist: stf ? stf.name : null,
          discount_percentage: 0
        }]);
      }
      
      setShowCreate(true);
      setPendingUrlParams(null);
    }
  }, [pendingUrlParams, dbServices, dbStaff]);

  // Suggestions dropdown close ref
  const suggestionRef = useRef(null);

  // Fetch all bills & initial data
  const loadBills = () => {
    setLoading(true);
    const params = {
      from_date: filters.date,
      to_date: filters.date,
      payment_method: filters.payment_method,
      page: filters.page,
      limit: 20
    };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    billingAPI.getAll(params)
      .then(r => { 
        setBills(r.data.data); 
        setSummary(r.data.summary || {}); 
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadBills, [filters]);

  const handleDeleteBill = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bill? This action cannot be undone.")) return;
    try {
      await billingAPI.delete(id);
      toast.success('Bill deleted successfully');
      loadBills();
      // If we had appointments loaded in this component, we'd reload them.
      // But since they are loaded elsewhere or in POS sidebar, we let the user know.
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  useEffect(() => {
    // Load services for searchable selector
    servicesAPI.getAll({ is_active: 1 }).then(r => setDbServices(r.data.data)).catch(() => {});
    staffAPI.getAll({ is_active: 1 }).then(r => setDbStaff(r.data.data || [])).catch(() => {});
    // Load membership plans for quick buy
    membershipsAPI.getAll().then(r => setDbMembershipPlans(r.data.data)).catch(() => {});

    // Load whatsapp automation settings
    whatsappAPI.getSettings()
      .then(res => {
        if (res.data?.success) {
          setWaSettings(res.data.data);
        }
      })
      .catch(() => {});

    // Suggestions click outside listener
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowServiceSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Customer search by 10-digit mobile number
  useEffect(() => {
    if (mobileSearch.length === 10) {
      setSearchLoading(true);
      customersAPI.getAll({ search: mobileSearch })
        .then(r => {
          const match = r.data.data.find(c => {
            if (!c.phone) return false;
            const cleanPhone = c.phone.replace(/\D/g, '');
            return cleanPhone.includes(mobileSearch) || mobileSearch.includes(cleanPhone);
          });
          if (match) {
            if (match.is_temp) {
              setSelectedCustomer(null);
              setQuickAddName(match.name || '');
              setQuickAddEmail(match.email && !match.email.includes('@luxesalon.local') ? match.email : '');
              setShowQuickAddCust(true);
              toast.success('Found details from database history! Click Save Profile & Link below.');
            } else {
              // Load full customer history (spend, visits, last visit, details)
              customersAPI.getById(match.id)
                .then(res => {
                  const customerData = res.data.data;
                  setSelectedCustomer(customerData);
                  setQuickAddName(customerData.name || '');
                  setQuickAddEmail(customerData.email && !customerData.email.includes('@luxesalon.local') ? customerData.email : '');
                  // Gender is NOT auto-fetched — admin selects manually during each bill
                  setSelectedGender('');
                  setShowQuickAddCust(false);
                  toast.success('Customer profile loaded!');
                })
                .catch(() => {
                  setSelectedCustomer(match);
                });
            }
          } else {
            setSelectedCustomer(null);
            setQuickAddName('');
            setQuickAddEmail('');
            setShowQuickAddCust(true);
            toast.error('No customer found. Add quick profile below.', { duration: 4000 });
          }
        })
        .catch(() => toast.error('Failed to search customer.'))
        .finally(() => setSearchLoading(false));
    } else {
      setSelectedCustomer(null);
      setShowQuickAddCust(false);
    }
  }, [mobileSearch]);

  // Auto-apply membership discount when a customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const disc = selectedCustomer.discount || selectedCustomer.membership_discount || 0;
      if (disc > 0) {
        setAddedItems(prev => prev.map(item => ({ 
          ...item, 
          discount_percentage: item.discount_percentage > 0 ? item.discount_percentage : disc 
        })));
      }
    }
  }, [selectedCustomer]);

  // Handle Quick Add Customer
  const handleQuickAddCustomer = async () => {
    if (!quickAddName) return toast.error('Customer name is required');
    if (mobileSearch.length !== 10) return toast.error('Mobile number must be exactly 10 digits');
    setSavingProfile(true);
    try {
      const email = quickAddEmail || `walkin_${mobileSearch}@luxesalon.local`;
      const reg = await authAPI.register({
        name: quickAddName,
        email,
        phone: mobileSearch,
        password: 'User@123456', // temporary password
        gender: selectedGender || undefined
      });
      
      toast.success('Customer Profile Saved & Linked!');
      // After registration, the customer is created. Fetch it:
      const fetchNew = await customersAPI.getAll({ search: mobileSearch });
      if (fetchNew.data.data.length > 0) {
        setSelectedCustomer(fetchNew.data.data[0]);
      }
      setShowQuickAddCust(false);
    } catch (err) {
      // Check if user already exists
      if (err.response?.data?.message?.includes('already registered')) {
        toast.error('Number already registered! Try searching again.');
      } else {
        toast.error('Failed to create customer profile');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Quick Membership Purchase
  const handlePurchaseMembership = async () => {
    if (!selectedCustomer) return toast.error('Please search and select a customer first');
    if (!purchasingMembershipId) return toast.error('Please select a membership plan');
    setBuyingMembership(true);
    try {
      await membershipsAPI.purchase({
        plan_id: purchasingMembershipId,
        customer_id: selectedCustomer.id,
        payment_method: 'cash',
        skip_invoice: true
      });
      toast.success('Membership activated successfully!');
      setShowMembershipModal(false);
      
      const plan = dbMembershipPlans.find(p => p.id === purchasingMembershipId);
      if (plan) {
        const newItem = {
          id: `membership-${Date.now()}`,
          type: 'membership',
          name: plan.name,
          description: `VIP Membership - ${plan.name}`,
          quantity: 1,
          price: parseFloat(plan.price),
          discount_percentage: 0,
          stylist: '-',
          service_id: null,
          staff_id: null
        };
        setAddedItems(p => [...p, newItem]);
      }

      // Reload customer details to reflect membership
      customersAPI.getById(selectedCustomer.id).then(res => {
        setSelectedCustomer(res.data.data);
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to purchase membership.');
    } finally {
      setBuyingMembership(false);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = ['all', ...new Set(dbServices.map(s => s.category).filter(Boolean))];

  useEffect(() => {
    const cleanVal = serviceSearchQuery;
    if (!cleanVal && selectedCategory === 'all') {
      setFilteredServiceSuggestions([]);
      setShowServiceSuggestions(false);
      return;
    }
    const matches = dbServices.filter(s => {
      const matchSearch = !cleanVal || s.name.toLowerCase().includes(cleanVal.toLowerCase()) || s.category.toLowerCase().includes(cleanVal.toLowerCase());
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const matchGender = !selectedGender || !s.gender || s.gender === 'Both' || s.gender === selectedGender;
      return matchSearch && matchCat && matchGender;
    });
    setFilteredServiceSuggestions(matches);
    setShowServiceSuggestions(true);
  }, [serviceSearchQuery, selectedCategory, dbServices, selectedGender]);

  // Search service input typing handler
  const handleServiceTyping = (val) => {
    const cleanVal = val.replace(/[0-9]/g, '');
    setServiceSearchQuery(cleanVal);
  };

  // Select service suggestion
  const handleSelectServiceSuggestion = (svc) => {
    setSelectedServiceInput(svc);
    setServiceSearchQuery(svc.name);
    setServicePrice(svc.price);
    setShowServiceSuggestions(false);
  };

  // Add service row to bill items list
  const handleAddServiceItem = () => {
    if (!serviceSearchQuery) return toast.error('Please select a service or type a description');
    if (!selectedStylistId) return toast.error('Please select a stylist for this service');
    if (!servicePrice || parseFloat(servicePrice) < 0) return toast.error('Please enter a valid price');
    
    const stylist = dbStaff.find(s => s.id === selectedStylistId);
    const newItem = {
      id: selectedServiceInput?.id || `manual-${Date.now()}`,
      description: serviceSearchQuery,
      quantity: parseInt(serviceQty) || 1,
      price: parseFloat(servicePrice),
      discount_percentage: selectedCustomer ? (selectedCustomer.discount || selectedCustomer.membership_discount || 0) : 0,
      stylist: stylist?.name || '',
      service_id: selectedServiceInput?.id || null,
      staff_id: selectedStylistId || null
    };

    setAddedItems(p => [...p, newItem]);
    
    // Clear selector values
    setSelectedServiceInput(null);
    setServiceSearchQuery('');
    setServicePrice('');
    setServiceQty(1);
    setSelectedStylistId('');
    toast.success('Service added to bill!');
  };

  // Remove row
  const handleRemoveServiceRow = (idx) => {
    setAddedItems(p => p.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = addedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const serviceDiscountTotal = addedItems.reduce((sum, item) => {
    const originalAmt = item.price * item.quantity;
    const itemDiscPct = parseFloat(item.discount_percentage) || 0;
    return sum + (originalAmt * itemDiscPct / 100);
  }, 0);

  const netAmount = Math.max(0, subtotal - serviceDiscountTotal);

  const taxableAmount = Math.max(0, netAmount);
  const gstAmount = taxableAmount * (parseFloat(gstPercent) || 0) / 100;
  const grandTotal = taxableAmount + gstAmount;

  // Split payment totals
  const totalSettleInput = parseFloat(splitCash || 0) + parseFloat(splitCard || 0) + parseFloat(splitUpi || 0) + parseFloat(splitWallet || 0);
  const remainingToSettle = Math.max(0, grandTotal - totalSettleInput);

  // Generate Bill creation submit handler
  const handleGenerateInvoice = async (triggerWhatsAppOverride = false) => {
    if (addedItems.length === 0) return toast.error('Add at least one service to create a bill');
    if (paymentMode === 'split' && remainingToSettle > 0.05) {
      return toast.error(`Split payments must cover the total bill. Unpaid: ₹${remainingToSettle.toFixed(2)}`);
    }

    setSaving(true);

    try {
      // payment method text representation
      let finalPaymentMethod = paymentMode;
      if (paymentMode === 'split') {
        const methods = [];
        if (parseFloat(splitCash) > 0) methods.push(`cash:${parseFloat(splitCash)}`);
        if (parseFloat(splitCard) > 0) methods.push(`card:${parseFloat(splitCard)}`);
        if (parseFloat(splitUpi) > 0) methods.push(`upi:${parseFloat(splitUpi)}`);
        if (parseFloat(splitWallet) > 0) methods.push(`wallet:${parseFloat(splitWallet)}`);
        finalPaymentMethod = methods.length > 0 ? methods.join(', ') : 'cash';
      }

      const billData = {
        appointment_id: appointmentId || null,
        customer_id: selectedCustomer?.id || null,
        customer_name: quickAddName || 'Walk-In Customer',
        customer_email: quickAddEmail || null,
        customer_phone: selectedCustomer?.phone || mobileSearch || null,
        customer_gender: selectedGender || null,
        items: addedItems.map(it => ({
          description: it.description,
          quantity: it.quantity,
          price: it.price,
          discount_percentage: it.discount_percentage || 0,
          final_amount: (it.price * it.quantity) - ((it.price * it.quantity) * (it.discount_percentage || 0) / 100),
          service_id: it.service_id,
          staff_id: it.staff_id,
          stylist: it.stylist
        })),
        subtotal: subtotal,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: parseFloat(gstPercent),
        tax_amount: gstAmount,
        total_amount: grandTotal,
        payment_method: finalPaymentMethod
      };

      const { data } = await billingAPI.create(billData);
      
      setLastGeneratedBillId(data.data.id);
      setLastGeneratedInvoiceNo(data.data.invoice_number);
      toast.success('Bill generated & saved!');
      
      // Auto open PDF preview inline modal!
      setShowPdfPreviewModal(true);

      // Open WhatsApp after bill is completely generated
      const waPhone = selectedCustomer?.phone || mobileSearch;
      if (waPhone) {
        const backendUrl = import.meta.env.VITE_API_URL;
        const publicPdfUrl = `${backendUrl}/billing/${data.data.id}/pdf`;
        const paymentMethodFormatted = (finalPaymentMethod || 'CASH').toUpperCase();
        
        const message = `Hello ${quickAddName || selectedCustomer?.name || 'Customer'}! ✨

Thank you for visiting *TONI & GUY Essensuals*! 💇‍♀️

Your invoice details:
🧾 *Invoice:* ${data.data.invoice_number}
💰 *Total:* ₹${grandTotal.toFixed(2)}
💳 *Payment:* ${paymentMethodFormatted}

📄 *View Invoice:* ${publicPdfUrl}
📅 *Book Next Appointment:* ${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : ''}/appointments

We hope to see you again soon! 💖
_TONI & GUY Essensuals Team_`;

        const cleanPhone = waPhone.replace(/\D/g, '').trim();
        const waUrl = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.location.href = waUrl;
      }

      setLastGeneratedCustomerPhone(waPhone || '');

      // Reset bill creator POS values
      setAddedItems([]);
      setGstPercent(5);
      setPaymentMode('cash');
      setAppointmentId(null);
      setMobileSearch('');
      setSelectedCustomer(null);
      setSplitCash(0);
      setSplitCard(0);
      setSplitUpi(0);
      setSplitWallet(0);

      // Reload admin billing history list
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setSaving(false);
    }
  };



  // Download Bill helper for table list
  const downloadBillFile = async (id, invoiceNo) => {
    try {
      const { data } = await billingAPI.downloadInvoice(id);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = `${invoiceNo}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed.'); }
  };

  return (
    <AdminLayout title="Premium Salon POS Billing">
      {/* Upper stats bar with black & gold headers */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.date} onChange={e => setFilters(p => ({ ...p, date: e.target.value, page: 1 }))} className="input-dark w-36 text-xs" />
          <select value={filters.payment_method} onChange={e => setFilters(p => ({ ...p, payment_method: e.target.value, page: 1 }))} className="input-dark w-36 text-xs">
            <option value="">All Payment Modes</option>
            {['cash', 'card', 'upi', 'online', 'wallet'].map(m => <option key={m} value={m} className="bg-salon-dark capitalize">{m}</option>)}
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-gold text-xs px-5 py-3 flex items-center gap-2 font-semibold shadow-lg shadow-gold-500/10">
          <Plus size={14} /> BILL CUSTOMER
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card border border-salon-border/50 bg-salon-card/50 backdrop-blur-md">
          <div className="text-salon-muted text-xs font-sans tracking-widest uppercase mb-1">Total Bills Generated</div>
          <div className="font-display text-4xl font-light text-salon-white">{summary.total || 0}</div>
        </div>
        <div className="stat-card border border-gold-500/10 bg-salon-card/50 backdrop-blur-md">
          <div className="text-salon-muted text-xs font-sans tracking-widest uppercase mb-1">Total POS Revenue</div>
          <div className="font-display text-4xl text-gold-500 font-semibold">₹{parseFloat(summary.totalRevenue || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card border border-salon-border/50 bg-salon-card/50 backdrop-blur-md">
          <div className="text-salon-muted text-xs font-sans tracking-widest uppercase mb-1">Database Active Staff</div>
          <div className="font-display text-4xl font-light text-salon-white">{dbStaff.length} Artisan{dbStaff.length !== 1 ? 's' : ''}</div>
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
          
          if (summary.paymentMethods && Array.isArray(summary.paymentMethods)) {
            summary.paymentMethods.forEach(pmStat => {
              if (!pmStat.payment_method) return;
              const pm = pmStat.payment_method.toLowerCase();
              if (pm.includes(m.key)) {
                count += parseInt(pmStat.count || 0, 10);
                if (pm.includes(':')) {
                   const parts = pm.split(',');
                   parts.forEach(part => {
                      const [k, v] = part.split(':');
                      if (k && k.trim() === m.key) amount += parseFloat(v || 0) * parseInt(pmStat.count || 1, 10);
                   });
                } else if (pm.includes(',')) {
                   const parts = pm.split(',');
                   if (parts.some(p => p.trim() === m.key)) {
                       amount += parseFloat(pmStat.amount || 0) / parts.length;
                   }
                } else {
                   amount += parseFloat(pmStat.amount || 0);
                }
              }
            });
          }
          
          return { ...m, amount, count };
        }).filter(m => m.count > 0);

        if (totals.length === 0) return null;
        return (
          <div className="mb-6">
            <div className="mb-3">
              <div className="text-salon-white text-xs font-sans tracking-widest uppercase font-semibold">Payment Methods</div>
              <div className="text-salon-muted text-[10px] font-body">Transactions & amounts by method</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {totals.map(m => (
                <div key={m.key} className="stat-card border border-salon-border/40 bg-salon-card/40 backdrop-blur-md flex flex-col items-center justify-center py-5 gap-2">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="font-display text-xl text-gold-500 font-semibold">₹{m.amount.toLocaleString('en-IN')}</div>
                  <div className="text-salon-white text-xs font-sans font-semibold">{m.label}</div>
                  <div className="text-salon-muted text-[10px] font-body">{m.count} transaction{m.count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Billing Invoices List */}
      <div className="admin-card overflow-x-auto mb-8 border border-salon-border bg-salon-card/30">
        <h3 className="p-6 font-display text-lg text-salon-white border-b border-salon-border">Invoice Billing Registry</h3>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-salon-border bg-salon-black/40">
              {['Invoice Number', 'Customer Name', 'Phone', 'Billing Date', 'Payment Mode', 'Final Amount', 'Action'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-[10px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => (
              <tr key={i} className="border-b border-salon-border/40">
                {[...Array(7)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 shimmer rounded w-20" /></td>)}
              </tr>
            )) : bills.map(b => (
              <tr key={b.id} className="border-b border-salon-border/20 hover:bg-salon-black/40 transition-colors">
                <td className="table-cell px-6 py-4 text-gold-500 text-xs font-sans font-bold">{b.invoice_number}</td>
                <td className="table-cell px-6 py-4 text-xs font-semibold text-salon-white">{b.customer_name || 'Walk-In Customer'}</td>
                <td className="table-cell px-6 py-4 text-xs text-salon-muted">{b.customer_phone || 'N/A'}</td>
                <td className="table-cell px-6 py-4 text-xs text-salon-muted">{(typeof b.created_at === 'string' && !b.created_at.includes('T') ? new Date(b.created_at.replace(' ', 'T') + 'Z') : new Date(b.created_at)).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td className="table-cell px-6 py-4 text-xs"><span className="badge badge-gray uppercase">{b.payment_method}</span></td>
                <td className="table-cell px-6 py-4 font-display text-base text-gold-500">₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</td>
                <td className="table-cell px-6 py-4 flex gap-2">
                  <button onClick={() => downloadBillFile(b.id, b.invoice_number)} className="text-salon-muted hover:text-gold-500 transition-colors" title="Download PDF"><Download size={15} /></button>
                  <button
                    onClick={() => {
                      const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';
                      window.open(`${backendOrigin}/invoices/${b.id}.pdf`, '_blank');
                    }}
                    className="text-salon-muted hover:text-gold-500 transition-colors" 
                    title="Preview invoice"
                  >
                    <Eye size={15} />
                  </button>
                  <button 
                    onClick={() => handleDeleteBill(b.id)} 
                    className="text-salon-muted hover:text-red-500 transition-colors" 
                    title="Delete invoice"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && bills.length === 0 && <div className="text-center py-12 text-salon-muted text-sm font-body">No invoices generated for selected dates.</div>}
      </div>

      {/* POS Billing Redesign Modal Panel (Luxury Dark Theme with Glassmorphism) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-salon-card border border-salon-border w-full max-w-7xl my-6 flex flex-col md:flex-row relative rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
            
            {/* Absolute close button at top-right of the entire modal */}
            <button 
              onClick={() => setShowCreate(false)} 
              className="absolute top-4 right-4 z-50 flex items-center justify-center rounded-sm bg-red-500/10 text-red-400 hover:text-white hover:bg-red-600 transition-all duration-300 border border-red-500/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] p-1.5"
              title="Close billing terminal"
            >
              <X size={18} />
            </button>

            {/* LEFT COLUMN: WORKSPACE (70%) */}
            <div className="w-full md:w-[70%] p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto border-r border-salon-border/60">
              
              <div className="flex justify-between items-center pb-4 border-b border-salon-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                    <Sparkles size={16} className="text-gold-500" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-salon-white">✦ TONI AND GUY ESSENSUALS POS</h3>
                    <p className="text-salon-muted text-[10px] tracking-widest font-sans uppercase">Checkout Billing Terminal</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-salon-muted hover:text-white transition-colors bg-salon-dark p-1.5 border border-salon-border"><X size={18} /></button>
              </div>

              {/* STEP 1: CUSTOMER DETAILS */}
              <div className="bg-salon-black/40 border border-salon-border/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-xs tracking-widest text-gold-500 uppercase">Step 1: Customer Identification</h4>
                  {selectedCustomer && (
                    <span className="text-[10px] font-sans tracking-wide text-green-400 flex items-center gap-1">
                      <CheckCircle size={10} /> Profile Linked
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-gold flex items-center gap-1.5">
                      <Phone size={11} /> Mobile Number (Required)
                    </label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        maxLength={10}
                        value={mobileSearch} 
                        onChange={e => setMobileSearch(e.target.value.replace(/\D/g, ''))} 
                        placeholder="Enter 10-digit mobile number..." 
                        className="input-dark pl-3 pr-10 tracking-widest font-sans text-sm font-semibold"
                        required 
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label-gold flex items-center gap-1.5">
                      <User size={11} /> Customer Name
                    </label>
                    <input 
                      type="text" 
                      value={selectedCustomer ? quickAddName : 'Walk-In Customer'} 
                      onChange={e => setQuickAddName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      disabled={!selectedCustomer}
                      className="input-dark font-semibold text-salon-white bg-salon-dark/30 border-dashed"
                      placeholder="Enter actual name"
                    />
                  </div>
                </div>
                {/* Additional row for email if customer is loaded */}
                {selectedCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="sm:col-start-2">
                      <label className="label-gold flex items-center gap-1.5">
                        <Mail size={11} /> Email Address <span className="text-salon-muted text-[10px] normal-case tracking-normal">(for Invoice)</span>
                      </label>
                      <input 
                        type="email" 
                        value={quickAddEmail} 
                        onChange={e => setQuickAddEmail(e.target.value)}
                        className="input-dark font-semibold text-salon-white bg-salon-dark/30 border-dashed"
                        placeholder="customer@email.com"
                      />
                    </div>
                  </div>
                )}

                {/* Gender Selector */}
                <div>
                  <label className="label-gold mb-2 block">Gender</label>
                  <div className="flex gap-3">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGenderChange(g)}
                        className={`px-4 py-2 text-xs font-sans font-semibold tracking-wider uppercase border transition-all ${
                          selectedGender === g
                            ? 'bg-gold-500 text-salon-black border-gold-500'
                            : 'bg-transparent text-salon-muted border-salon-border hover:border-gold-500/50 hover:text-salon-white'
                        }`}
                      >
                        {g === 'Male' ? '♂ Male' : g === 'Female' ? '♀ Female' : '⊕ Other'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline Quick Add form if customer not found */}
                {showQuickAddCust && (
                  <div className="bg-gold-500/5 border border-gold-500/20 p-4 space-y-3 mt-2 rounded-sm animate-fade-in">
                    <div className="text-xs text-gold-500 font-sans tracking-wider font-semibold">New Customer Registration</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        value={quickAddName} 
                        onChange={e => setQuickAddName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} 
                        placeholder="Full Name (Required)" 
                        className="input-dark text-xs" 
                      />
                      <input 
                        type="email" 
                        value={quickAddEmail} 
                        onChange={e => setQuickAddEmail(e.target.value)} 
                        placeholder="Email Address (Optional)" 
                        className="input-dark text-xs" 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleQuickAddCustomer}
                      disabled={savingProfile}
                      className="btn-gold text-[10px] font-sans font-bold tracking-widest uppercase px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {savingProfile ? (
                        <div className="w-3 h-3 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin"></div>
                      ) : (
                        'Save Profile & Link'
                      )}
                    </button>
                  </div>
                )}

                {/* Customer Details Elegant Cards */}
                {selectedCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 animate-fade-in">
                    <div className="bg-salon-dark/40 border border-salon-border/40 p-3 text-center">
                      <div className="text-salon-muted text-[9px] font-sans tracking-wider uppercase mb-1">Visits Count</div>
                      <div className="text-salon-white font-display text-lg font-semibold">{selectedCustomer.total_visits || 0}</div>
                    </div>
                    <div className="bg-salon-dark/40 border border-salon-border/40 p-3 text-center">
                      <div className="text-salon-muted text-[9px] font-sans tracking-wider uppercase mb-1">Total Spent</div>
                      <div className="text-gold-500 font-display text-lg font-semibold">₹{parseFloat(selectedCustomer.total_spent || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-salon-dark/40 border border-salon-border/40 p-3 text-center">
                      <div className="text-salon-muted text-[9px] font-sans tracking-wider uppercase mb-1">Last Visit Date</div>
                      <div className="text-salon-white font-body text-xs mt-1.5 font-semibold">
                        {selectedCustomer.last_visit 
                          ? new Date(selectedCustomer.last_visit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) 
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: MEMBERSHIP STATUS & BUY INLINE */}
              {selectedCustomer && (
                <div className="bg-salon-black/40 border border-salon-border/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-xs tracking-widest text-gold-500 uppercase">Step 4: Membership Status</h4>
                  </div>
                  
                  {selectedCustomer.membership_id ? (
                    <div className="bg-gold-500/5 border border-gold-500/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold-500/20 border border-gold-500/40 flex items-center justify-center rounded-full">
                          <Crown size={18} className="text-gold-500" />
                        </div>
                        <div>
                          <div className="text-salon-white font-display text-sm font-bold flex items-center gap-2">
                            {selectedCustomer.membership_name} Membership
                            <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] px-2 py-0.5 tracking-widest uppercase">Active</span>
                          </div>
                          <p className="text-salon-muted text-[10px] font-body mt-0.5">Save {selectedCustomer.discount || selectedCustomer.membership_discount || 0}% on all services · Expires: {new Date(selectedCustomer.membership_expiry).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-salon-border/80 bg-salon-card/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-red-400 font-display text-xs tracking-widest uppercase font-semibold">No Membership Found</div>
                        <p className="text-salon-muted text-[10px] font-body mt-1">Activate a plan now to automatically apply discount benefits to this bill.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowMembershipModal(true)}
                        className="btn-outline-gold text-[10px] font-sans font-bold tracking-widest uppercase px-4 py-2 hover:bg-gold-500 hover:text-salon-black shrink-0 transition-colors"
                      >
                        Add Membership
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SERVICE SELECTION */}
              <div className="bg-salon-black/40 border border-salon-border/60 p-5 space-y-4">
                <h4 className="font-display text-xs tracking-widest text-gold-500 uppercase">Step 2: Service Selection</h4>
                
                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowServiceSuggestions(true);
                      }}
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
                
                {/* Searchable input selector */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-5 relative" ref={suggestionRef}>
                    <label className="label-gold flex items-center gap-1.5"><Search size={11} /> Search Service Name</label>
                    <input 
                      type="text" 
                      value={serviceSearchQuery} 
                      onChange={e => handleServiceTyping(e.target.value)}
                      onFocus={() => { if(serviceSearchQuery) setShowServiceSuggestions(true); }}
                      placeholder="Type style, facial, massage, cleanup..." 
                      className="input-dark font-sans text-sm text-salon-white"
                    />
                    
                    {/* Suggestions dropdown list */}
                    {showServiceSuggestions && filteredServiceSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[105%] bg-salon-card border border-salon-border shadow-2xl z-50 max-h-52 overflow-y-auto">
                        {filteredServiceSuggestions.map(svc => (
                          <div 
                            key={svc.id} 
                            onClick={() => handleSelectServiceSuggestion(svc)}
                            className="px-4 py-2.5 hover:bg-salon-dark text-xs border-b border-salon-border/50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <div>
                              <div className="text-salon-white font-sans font-semibold">{svc.name}</div>
                              <div className="text-[10px] text-salon-muted mt-0.5">{svc.duration} min · {svc.category}</div>
                            </div>
                            <span className="text-gold-500 font-display font-semibold text-sm">₹{parseFloat(svc.price).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select Stylist */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="label-gold">Select Stylist</label>
                    <select
                      value={selectedStylistId}
                      onChange={e => setSelectedStylistId(e.target.value)}
                      className="input-dark font-sans text-sm w-full"
                    >
                      <option value="">Choose Stylist...</option>
                      {dbStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-4 sm:col-span-1">
                    <label className="label-gold text-center">Qty</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={serviceQty} 
                      onChange={e => setServiceQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-dark font-sans text-center text-sm font-semibold"
                    />
                  </div>

                  <div className="col-span-8 sm:col-span-2">
                    <label className="label-gold">Amount (₹)</label>
                    <input 
                      type="number" 
                      min={0}
                      value={servicePrice} 
                      onChange={e => setServicePrice(e.target.value)}
                      placeholder="Amount"
                      className="input-dark font-sans text-sm text-gold-500 font-bold"
                    />
                  </div>

                  <button 
                    type="button" 
                    onClick={handleAddServiceItem}
                    className="col-span-12 sm:col-span-1 btn-gold w-full py-3.5 flex items-center justify-center shrink-0"
                    style={{ paddingLeft: 0, paddingRight: 0 }}
                    title="Add service row"
                  >
                    <Plus size={18} className="text-[#0A0A0A] stroke-[3]" />
                  </button>
                </div>

                {/* Selected Services Premium Table */}
                <div className="border border-salon-border/50 rounded-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-salon-dark border-b border-salon-border/50">
                        {['Service Name', 'Stylist', 'Qty', 'Price', 'Discount (%)', 'Final Amount', 'Action'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[9px] font-sans tracking-widest uppercase text-salon-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {addedItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-salon-muted text-xs font-body">No services added to current POS session.</td>
                        </tr>
                      ) : addedItems.map((item, idx) => {
                        const originalAmt = item.price * item.quantity;
                        const discPct = item.discount_percentage || 0;
                        const finalAmt = originalAmt - (originalAmt * discPct / 100);
                        return (
                          <tr key={item.id} className="border-b border-salon-border/20 hover:bg-salon-black/20">
                            <td className="px-4 py-3 text-xs font-semibold text-salon-white">{item.description}</td>
                            <td className="px-4 py-3 text-xs text-salon-muted">
                              <select
                                value={item.staff_id || ''}
                                onChange={(e) => {
                                  const sid = e.target.value;
                                  const sName = dbStaff.find(s => s.id === sid)?.name || '';
                                  setAddedItems(prev => {
                                    const updated = [...prev];
                                    updated[idx] = { ...updated[idx], staff_id: sid, stylist: sName };
                                    return updated;
                                  });
                                }}
                                className="input-dark w-24 text-xs py-1 px-1 bg-salon-dark border border-salon-border/60 rounded"
                              >
                                <option value="">N/A</option>
                                {dbStaff.map(st => (
                                  <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-xs font-sans text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-xs font-sans">₹{item.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs font-sans">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={item.discount_percentage || 0}
                                onChange={e => {
                                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                  setAddedItems(prev => {
                                    const updated = [...prev];
                                    updated[idx] = { ...updated[idx], discount_percentage: val };
                                    return updated;
                                  });
                                }}
                                className="input-dark w-16 text-xs text-center font-sans py-1 px-1 bg-salon-dark border border-salon-border/60"
                              />
                            </td>
                            <td className="px-4 py-3 text-xs font-sans text-gold-500 font-bold">₹{finalAmt.toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-center">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveServiceRow(idx)}
                                className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 3 & STEP 5: CALCULATIONS & PAYMENTS */}
              <div className="bg-salon-black/40 border border-salon-border/60 p-5 space-y-5">
                <h4 className="font-display text-xs tracking-widest text-gold-500 uppercase">Step 3 & 5: Bill Settle & Payments</h4>
                
                {/* Real-time Calculation Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  

                  {/* GST Editable Input */}
                  <div>
                    <label className="label-gold">GST Tax Rate (%)</label>
                    <input 
                      type="number" 
                      min={0}
                      value={gstPercent} 
                      onChange={e => setGstPercent(parseFloat(e.target.value) || 0)}
                      className="input-dark font-sans text-sm font-semibold"
                    />
                  </div>

                  {/* Grand Total Visual Card */}
                  <div className="bg-gold-500/5 border border-gold-500/20 p-3 text-center flex flex-col justify-center rounded-sm">
                    <div className="text-gold-500 font-sans text-[10px] tracking-widest uppercase font-semibold">Grand Settle Amount</div>
                    <div className="font-display text-2xl font-bold text-gold-500">₹{grandTotal.toFixed(2)}</div>
                  </div>

                </div>

                {/* Settle modes grid */}
                <div>
                  <label className="label-gold">Select Payment Mode</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                    {[
                      { key: 'cash', label: 'Cash Only', Icon: Wallet },
                      { key: 'card', label: 'Card Swipe', Icon: CreditCard },
                      { key: 'upi', label: 'UPI / QR', Icon: Landmark },
                      { key: 'wallet', label: 'Wallet Pay', Icon: Wallet },
                      { key: 'split', label: 'Split payment', Icon: Plus },
                    ].map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPaymentMode(key)}
                        className={`py-3 px-3 text-[10px] font-sans tracking-widest uppercase border flex flex-col items-center gap-1.5 justify-center transition-all ${
                          paymentMode === key 
                            ? 'bg-gold-500 text-salon-black border-gold-500 font-bold shadow-md shadow-gold-500/20' 
                            : 'border-salon-border text-salon-muted hover:border-gold-500 hover:text-gold-500'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Payment inputs if selected */}
                {paymentMode === 'split' && (
                  <div className="bg-salon-dark/50 border border-salon-border/60 p-4 space-y-3 rounded-sm animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gold-500 font-sans tracking-wide uppercase font-semibold">Split Bill Amounts</span>
                      <span className="font-sans text-salon-muted">
                        Settled: <strong className="text-salon-white">₹{totalSettleInput.toFixed(2)}</strong> / ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] text-salon-muted uppercase block mb-1">Cash Split</label>
                        <input type="number" min={0} step="0.01" value={splitCash} onChange={e => setSplitCash(parseFloat(e.target.value) || 0)} className="input-dark text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-salon-muted uppercase block mb-1">Card Split</label>
                        <input type="number" min={0} step="0.01" value={splitCard} onChange={e => setSplitCard(parseFloat(e.target.value) || 0)} className="input-dark text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-salon-muted uppercase block mb-1">UPI Split</label>
                        <input type="number" min={0} step="0.01" value={splitUpi} onChange={e => setSplitUpi(parseFloat(e.target.value) || 0)} className="input-dark text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-salon-muted uppercase block mb-1">Wallet Split</label>
                        <input type="number" min={0} step="0.01" value={splitWallet} onChange={e => setSplitWallet(parseFloat(e.target.value) || 0)} className="input-dark text-xs" />
                      </div>
                    </div>

                    {remainingToSettle > 0 ? (
                      <div className="text-[10px] text-red-400 font-semibold font-sans tracking-wider text-right">
                        ⚠ Unpaid balance remaining: ₹{remainingToSettle.toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-green-400 font-semibold font-sans tracking-wider text-right flex items-center gap-1 justify-end">
                        <Check size={11} /> POS splits fully settled!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settle Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-dark py-3 text-xs uppercase font-bold tracking-widest px-4">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => handleGenerateInvoice(false)} 
                  disabled={saving || addedItems.length === 0} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1 py-3 text-xs uppercase font-bold tracking-widest disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg font-sans shadow-lg shadow-emerald-500/10 transition-all font-semibold"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Generate Invoice
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: REAL-TIME PREMIUM RECEIPT PREVIEW (30%) */}
            <div className="w-full md:w-[30%] bg-salon-black/80 p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              
              {/* Receipt Wrapper */}
              <div className="space-y-6">
                
                {/* Header branding */}
                <div className="text-center border-b border-salon-border pb-5">
                  <div className="font-display text-xl text-gold-500 font-bold tracking-wider">✦ TONI AND GUY ESSENSUALS</div>
                  <div className="text-[7px] text-salon-muted tracking-[0.25em] font-sans uppercase mt-1">Where Luxury Meets Artistry</div>
                  <div className="text-[8px] text-salon-muted font-sans mt-3">GSTIN: 27AAAAA0000A1Z5</div>
                </div>

                {/* Details Section */}
                <div className="space-y-3 text-xs font-sans border-b border-salon-border/50 pb-4">
                  <div className="flex justify-between">
                    <span className="text-salon-muted">POS Terminal:</span>
                    <span className="text-salon-white font-semibold">Admin Panel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-salon-muted">Billing Date:</span>
                    <span className="text-salon-white">{new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-salon-muted">Guest:</span>
                    <span className="text-salon-white font-semibold">{selectedCustomer ? selectedCustomer.name : 'Walk-In'}</span>
                  </div>
                  {selectedCustomer && (
                    <div className="flex justify-between">
                      <span className="text-salon-muted">Mobile:</span>
                      <span className="text-salon-white">{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer && selectedCustomer.membership_id && (
                    <div className="flex justify-between items-center bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 text-[9px]">
                      <span className="text-gold-500 font-semibold uppercase flex items-center gap-0.5"><Crown size={10} /> Member</span>
                      <span className="text-gold-500 font-bold">{selectedCustomer.membership_name}</span>
                    </div>
                  )}
                </div>

                 {/* Service row lists */}
                <div className="space-y-4 border-b border-salon-border/50 pb-4 max-h-48 overflow-y-auto">
                  <div className="text-[9px] text-salon-muted tracking-widest uppercase font-semibold font-sans">Settle Items</div>
                  {addedItems.length === 0 ? (
                    <div className="text-[10px] text-salon-muted italic font-body text-center py-4">No services selected.</div>
                  ) : addedItems.map((item, idx) => {
                    const originalAmt = item.price * item.quantity;
                    const discPct = item.discount_percentage || 0;
                    const finalAmt = originalAmt - (originalAmt * discPct / 100);
                    return (
                      <div key={item.id} className="flex justify-between items-start text-xs font-body">
                        <div className="flex-1 pr-4">
                          <div className="text-salon-white font-semibold">{item.description}</div>
                          <div className="text-[10px] text-salon-muted mt-0.5">
                            Qty: {item.quantity} · Price: ₹{item.price.toFixed(2)}
                            {discPct > 0 && ` · Disc: ${discPct}%`}
                          </div>
                        </div>
                        <span className="text-salon-white font-sans font-medium shrink-0">₹{finalAmt.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals Summary */}
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-salon-muted">Subtotal:</span>
                    <span className="text-salon-white">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span className="text-salon-muted">Total Discount:</span>
                    <span className="text-red-400">-₹{serviceDiscountTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-salon-muted">Net Amount:</span>
                    <span className="text-salon-white">₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-salon-muted">GST ({gstPercent}%):</span>
                    <span className="text-salon-white">₹{gstAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Applied Membership Benefits if any */}
                  {selectedCustomer?.membership_id && (
                    <div className="bg-gold-500/10 border border-gold-500/20 px-2.5 py-1 text-[9px] font-sans text-gold-500 tracking-wide rounded-sm mt-2">
                      ✦ Applied {selectedCustomer.discount || selectedCustomer.membership_discount || 0}% Membership Discount
                    </div>
                  )}

                  <div className="border-t border-salon-border/80 pt-3 flex justify-between items-end">
                    <span className="text-salon-white font-bold text-sm tracking-wide">GRAND TOTAL:</span>
                    <span className="text-gold-500 font-display text-xl font-bold">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Footer Payment Mode Receipt preview */}
              <div className="border-t border-salon-border pt-4 mt-6">
                <div className="text-[8px] text-salon-muted tracking-wider uppercase font-semibold font-sans mb-1">POS Payment Settle</div>
                {paymentMode === 'split' ? (
                  <div className="space-y-1 text-[10px] font-sans text-salon-muted">
                    {parseFloat(splitCash) > 0 && <div className="flex justify-between"><span>Cash:</span><span className="text-salon-white">₹{splitCash}</span></div>}
                    {parseFloat(splitCard) > 0 && <div className="flex justify-between"><span>Card:</span><span className="text-salon-white">₹{splitCard}</span></div>}
                    {parseFloat(splitUpi) > 0 && <div className="flex justify-between"><span>UPI:</span><span className="text-salon-white">₹{splitUpi}</span></div>}
                    {parseFloat(splitWallet) > 0 && <div className="flex justify-between"><span>Wallet:</span><span className="text-salon-white">₹{splitWallet}</span></div>}
                  </div>
                ) : (
                  <span className="text-[10px] font-sans font-bold text-salon-white uppercase border border-salon-border px-2 py-0.5 bg-salon-dark">{paymentMode} ONLY</span>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* STEP 4 modal: Buy/Purchase Membership Plan Directly */}
      {showMembershipModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-salon-card border border-salon-border w-full max-w-md p-6 animate-slide-up rounded-sm">
            <div className="flex justify-between items-center border-b border-salon-border pb-3 mb-4">
              <h3 className="font-display text-base text-gold-500 uppercase flex items-center gap-1.5"><Crown size={15} /> Buy Membership</h3>
              <button onClick={() => setShowMembershipModal(false)} className="text-salon-muted hover:text-white"><X size={16} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label-gold">Select Plan</label>
                <select 
                  value={purchasingMembershipId} 
                  onChange={e => {
                    const planId = e.target.value;
                    setPurchasingMembershipId(planId);
                    const plan = dbMembershipPlans.find(p => p.id === planId);
                    if (plan) {
                      setAddedItems(prev => prev.map(item => ({ 
                        ...item, 
                        discount_percentage: plan.discount 
                      })));
                    }
                  }} 
                  className="input-dark font-sans text-xs"
                >
                  <option value="">Select a plan...</option>
                  {dbMembershipPlans.map(plan => (
                    <option key={plan.id} value={plan.id} className="bg-salon-dark">{plan.name} - ₹{plan.price} ({plan.discount}% off)</option>
                  ))}
                </select>
              </div>

              {purchasingMembershipId && (
                <div className="bg-salon-dark/40 border border-salon-border/50 p-4 space-y-2 rounded-sm animate-fade-in">
                  {(() => {
                    const plan = dbMembershipPlans.find(p => p.id === purchasingMembershipId);
                    if (!plan) return null;
                    const benefits = typeof plan.benefits === 'string' ? JSON.parse(plan.benefits) : (plan.benefits || []);
                    return (
                      <>
                        <div className="flex justify-between text-xs"><span className="text-salon-muted">Validity:</span><span className="text-salon-white font-semibold">{plan.validity_days} Days</span></div>
                        <div className="flex justify-between text-xs"><span className="text-salon-muted">Discount Rate:</span><span className="text-gold-500 font-bold">{plan.discount}% Off every service</span></div>
                        <div className="flex justify-between text-xs"><span className="text-salon-muted">Price Amount:</span><span className="text-salon-white font-semibold">₹{parseFloat(plan.price).toLocaleString('en-IN')}</span></div>
                        <div className="pt-2 border-t border-salon-border/50">
                          <div className="text-[9px] text-salon-muted uppercase font-sans tracking-wide mb-1.5">Plan Benefits:</div>
                          <ul className="text-[10px] text-salon-white/80 space-y-1 font-body">
                            {benefits.map((b, i) => <li key={i} className="flex items-start gap-1"><span className="text-gold-500">✓</span> {b}</li>)}
                          </ul>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMembershipModal(false)} className="btn-dark flex-1 py-2 text-xs">Close</button>
                <button 
                  type="button" 
                  onClick={handlePurchaseMembership}
                  disabled={buyingMembership || !purchasingMembershipId} 
                  className="btn-gold flex-1 py-2 text-xs font-bold uppercase disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {buyingMembership ? <div className="w-3.5 h-3.5 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  {buyingMembership ? 'Activating...' : 'Purchase Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7 & 8: PDF INVOICE INLINE PREVIEW & WHATSAPP GENERATOR MODAL */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-salon-card border border-salon-border w-full max-w-4xl p-6 animate-slide-up rounded-sm flex flex-col justify-between max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-salon-border pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-gold-500" size={18} />
                <h3 className="font-display text-base text-salon-white font-bold">INVOICE PREVIEW - {lastGeneratedInvoiceNo}</h3>
              </div>
              <button onClick={() => setShowPdfPreviewModal(false)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>

            {/* Inline Iframe streaming the PDF view directly! */}
            <div className="flex-1 min-h-[50vh] bg-salon-black border border-salon-border overflow-hidden rounded-sm relative">
              <iframe 
                src={`${import.meta.env.VITE_API_URL || '/api'}/billing/${lastGeneratedBillId}/pdf`}
                width="100%" 
                height="100%" 
                style={{ border: 'none' }}
                title="Luxe Salon Invoice PDF"
              />
            </div>

            {/* Bottom Actions: Download */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-salon-border/50 mt-4 shrink-0">
              <button 
                onClick={() => downloadBillFile(lastGeneratedBillId, lastGeneratedInvoiceNo)}
                className="btn-dark flex-1 py-3 text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download PDF Attachment
              </button>
              <button 
                onClick={() => setShowPdfPreviewModal(false)}
                className="btn-dark py-3 px-6 text-xs uppercase font-bold tracking-widest"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
}
