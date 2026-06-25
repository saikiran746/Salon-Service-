import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('salon_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('salon_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
          localStorage.setItem('salon_token', data.data.token);
          localStorage.setItem('salon_refresh_token', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.token}`;
          return api(original);
        } catch {
          localStorage.removeItem('salon_token');
          localStorage.removeItem('salon_refresh_token');
          localStorage.removeItem('salon_user');
          window.location.href = '/login';
        }
      }
    }
    
    if (error.response?.status === 403) {
      localStorage.removeItem('salon_token');
      localStorage.removeItem('salon_refresh_token');
      localStorage.removeItem('salon_user');
      window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (data) => api.post('/auth/google', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  setPassword: (data) => api.put('/auth/set-password', data),
  getAdminActivity: () => api.get('/auth/admin/activity'),
  // One-time magic login from security alert email
  adminMagicLogin: (token) => api.get(`/auth/admin/magic-login?token=${token}`),
};

// ==================== APPOINTMENTS ====================
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  getMyAppointments: (params) => api.get('/appointments/my', { params }),
  getToday: () => api.get('/appointments/today'),
  getAvailableSlots: (params) => api.get('/appointments/available-slots', { params }),
  getSmartRecommendations: (params) => api.get('/appointments/smart-recommendations', { params }),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
};

// ==================== SERVICES ====================
export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  getStaff: (id) => api.get(`/services/${id}/staff`),
  create: (data) => api.post('/services', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/services/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBulkCategory: (data) => api.put('/services/bulk-category', data),
  delete: (id) => api.delete(`/services/${id}`),
};

// ==================== STAFF ====================
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
  getAnalytics: (id, params) => api.get(`/staff/${id}/analytics`, { params }),
  create: (data) => api.post('/staff', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/staff/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/staff/${id}`),
  addReview: (data) => api.post('/staff/reviews', data),
};

// ==================== CUSTOMERS ====================
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  getStats: () => api.get('/customers/stats'),
  getNewVsOldChart: () => api.get('/customers/new-vs-old-chart'),
  getBookingSourcesChart: () => api.get('/customers/booking-sources-chart'),
  getMembershipGrowthChart: () => api.get('/customers/membership-growth-chart'),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getMyProfile: () => api.get('/customers/me'),
  updateMyProfile: (data) => api.put('/customers/me', data),
};

// ==================== BILLING ====================
export const billingAPI = {
  getAll: (params) => api.get('/billing', { params }),
  getById: (id) => api.get(`/billing/${id}`),
  getMyBills: () => api.get('/billing/my'),
  create: (data) => api.post('/billing', data),
  downloadInvoice: (id) => api.get(`/billing/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/billing/${id}`),
};


// ==================== ANALYTICS ====================
export const analyticsAPI = {
  getStaffPerformance: () => api.get('/reports/analytics/staff'),
  getStaffDetail: (id) => api.get(`/reports/analytics/staff/${id}`),
  getServiceAnalytics: () => api.get('/reports/analytics/services'),
  getAppointmentAnalytics: () => api.get('/reports/analytics/appointments'),
  getBillingAnalytics: () => api.get('/reports/analytics/billing'),
  getMembershipAnalytics: () => api.get('/reports/analytics/memberships'),
  getMarketingAnalytics: () => api.get('/reports/analytics/marketing'),
};

// ==================== MEMBERSHIPS ====================
export const membershipsAPI = {
  getAll: () => api.get('/memberships'),
  getAllAdmin: () => api.get('/memberships/admin/all'),
  getMembers: () => api.get('/memberships/admin/members'),
  purchase: (data) => api.post('/memberships/purchase', data),
  create: (data) => api.post('/memberships', data),
  update: (id, data) => api.put(`/memberships/${id}`, data),
  delete: (id) => api.delete(`/memberships/${id}`),
};

// ==================== GALLERY ====================
export const galleryAPI = {
  getAll: (params) => api.get('/gallery', { params }),
  getAllAdmin: () => api.get('/gallery/admin/all'),
  create: (data) => api.post('/gallery', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/gallery/${id}`, data),
  delete: (id) => api.delete(`/gallery/${id}`),
};

// ==================== LEADS ====================
export const leadsAPI = {
  capture: (data) => api.post('/leads/capture', data),
  getAll: (params) => api.get('/leads', { params }),
  updateStatus: (id, data) => api.patch(`/leads/${id}`, data),
};

// ==================== REPORTS ====================
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getDaily: (params) => api.get('/reports/daily', { params }),
  exportData: (params) => api.get('/reports/export', { params }),
};

// ==================== EMAIL MARKETING ====================
export const emailAPI = {
  getTemplates: () => api.get('/email-marketing/templates'),
  updateTemplate: (id, data) => api.put(`/email-marketing/templates/${id}`, data),
  getCampaigns: () => api.get('/email-marketing/campaigns'),
  createCampaign: (data) => api.post('/email-marketing/campaigns', data),
  getLogs: () => api.get('/email-marketing/logs'),
};

// ==================== SCHEDULE ====================
export const scheduleAPI = {
  getShifts: (params) => api.get('/schedule/shifts', { params }),
  assignShift: (data) => api.post('/schedule/shifts', data),
  deleteShift: (id) => api.delete(`/schedule/shifts/${id}`),
  getLeaves: () => api.get('/schedule/leaves'),
  requestLeave: (data) => api.post('/schedule/leaves', data),
  updateLeaveStatus: (id, status) => api.put(`/schedule/leaves/${id}/status`, { status }),
  getAttendance: (params) => api.get('/schedule/attendance', { params }),
  getAnalytics: (params) => api.get('/schedule/analytics', { params }),
  getAvailableStaff: (date) => api.get('/schedule/available-staff', { params: { date } }),
};

// ==================== NOTIFICATIONS ====================
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  clearAll: () => api.delete('/notifications/clear-all'),
  restoreAll: () => api.patch('/notifications/restore-all'),
};

// ==================== SITE SETTINGS ====================
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  // Change admin login credentials (email/password) — triggers notification + security alert email
  changeAdminCredentials: (data) => api.post('/settings/change-credentials', data),
  requestEmailOtp: (data) => api.post('/settings/request-email-otp', data),
  verifyEmailOtp: (data) => api.post('/settings/verify-email-otp', data),
  requestCredChangeOtp: (data) => api.post('/settings/request-cred-otp', data),
};

// ==================== WHATSAPP AUTOMATION ====================
export const whatsappAPI = {
  getSettings: () => api.get('/whatsapp/settings'),
  updateSettings: (data) => api.put('/whatsapp/settings', data),
};

export default api;

