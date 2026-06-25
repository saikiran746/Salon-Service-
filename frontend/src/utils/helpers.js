/**
 * Format currency in Indian Rupees
 */
export const formatINR = (amount) =>
  `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Format date to Indian locale
 */
export const formatDate = (date, opts = {}) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', ...opts,
  });
};

/**
 * Format time from HH:MM:SS to HH:MM AM/PM
 */
export const formatTime = (time) => {
  if (!time) return '—';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

/**
 * Truncate text to N characters
 */
export const truncate = (str, n = 60) =>
  str && str.length > n ? `${str.substring(0, n)}...` : str;

/**
 * Get initials from full name
 */
export const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Days since a given date
 */
export const daysSince = (date) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if membership is expiring soon (within 7 days)
 */
export const isExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false;
  const days = Math.ceil((new Date(expiryDate) - Date.now()) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 7;
};

/**
 * Appointment status label mapping
 */
export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

/**
 * Payment method label mapping
 */
export const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Credit/Debit Card',
  upi: 'UPI',
  online: 'Online',
  wallet: 'Wallet',
};

/**
 * Generate a random avatar color based on name
 */
export const getAvatarColor = (name = '') => {
  const colors = ['#C9A84C', '#E8A838', '#D4956A', '#8B7355', '#A89060'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

/**
 * Download a blob as a file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Parse JSON safely, returns fallback on error
 */
export const safeJSON = (str, fallback = null) => {
  try { return JSON.parse(str); } catch { return fallback; }
};

/**
 * Generate time slots with a specific interval (in minutes)
 */
export const generateTimeSlots = (intervalMinutes = 30, openTime = '09:00', closeTime = '20:00') => {
  const slots = [];
  
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
  };

  let currentMins = parseTime(openTime);
  const endMins = parseTime(closeTime);
  
  while (currentMins < endMins) {
    const h = Math.floor(currentMins / 60);
    const m = currentMins % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMins += parseInt(intervalMinutes, 10) || 30;
  }
  
  return slots;
};
