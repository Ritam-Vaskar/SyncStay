import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, formatRelative } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '—';
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '—';
    return format(dateObj, formatStr);
  } catch (error) {
    return '—';
  }
};

export const formatRelativeDate = (date) => {
  return formatRelative(new Date(date), new Date());
};

export const formatDistanceDate = (date) => {
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-600',
    planning: 'bg-purple-100 text-purple-800',
    locked: 'bg-blue-100 text-blue-800',
    available: 'bg-green-100 text-green-800',
    'sold-out': 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const truncate = (str, length) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
