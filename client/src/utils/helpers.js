import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, formatRelative } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
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

/**
 * Format activity log action into human-readable message
 * @param {Object} log - Audit log object with action, details, user
 * @returns {string} - Formatted message
 */
export const formatActivityMessage = (log) => {
  const { action, details = {}, user } = log;
  const userName = user?.name || 'Someone';

  const messages = {
    // Event actions
    event_create: `${userName} created the event`,
    event_update: `${userName} updated event details`,
    event_delete: `${userName} deleted the event`,
    event_approve: `${userName} approved the event`,
    event_reject: `${userName} rejected the event${details.reason ? ': ' + details.reason : ''}`,
    event_comment: `${userName} added a comment${details.comment ? ': "' + details.comment.substring(0, 50) + (details.comment.length > 50 ? '..."' : '"') : ''}`,
    event_comment_reply: `${userName} replied to a comment`,
    event_privacy_toggle: `${userName} toggled event privacy settings${details.isPublic !== undefined ? ' to ' + (details.isPublic ? 'Public' : 'Private') : ''}`,
    event_microsite_publish: `${userName} published the event microsite`,
    // Hotel/Proposal actions
    hotel_proposal_select: `${userName} selected ${details.hotelName || details.hotel?.name || 'a hotel'}${details.hotelLocation ? ' (' + details.hotelLocation + ')' : ''}`,
    hotel_proposal_deselect: `${userName} deselected ${details.hotelName || details.hotel?.name || 'a hotel'}`,
    hotel_proposal_submit: `${details.hotelName || details.hotel?.name || 'A hotel'} submitted a proposal${details.roomsOffered ? ' with ' + details.roomsOffered + ' rooms' : ''}`,
    hotel_selection_confirmed: `${userName} confirmed selection of ${details.count || details.selectedHotels?.length || ''} hotel(s)${details.hotelNames ? ': ' + details.hotelNames.join(', ') : ''}`,
    hotel_select_recommended: `${userName} selected ${details.count || ''} recommended hotel(s)${details.hotelNames ? ': ' + details.hotelNames.join(', ') : ''}`,
    proposal_submit: `${userName} submitted a proposal for ${details.hotelName || 'a hotel'}`,
    proposal_review: `${userName} reviewed proposal from ${details.hotelName || 'a hotel'}`,
    // Booking actions
    booking_create: `${details.guestName || details.guestDetails?.name || details.guest?.name || 'A guest'} booked ${details.numberOfRooms || details.roomDetails?.numberOfRooms || details.rooms || '1'} room(s)${details.hotelName || details.hotel?.name ? ' at ' + (details.hotelName || details.hotel?.name) : ''}${details.roomType ? ' (' + details.roomType + ')' : ''}`,
    booking_approve: `${userName} approved booking for ${details.guestName || details.guest?.name || 'a guest'}${details.hotelName ? ' at ' + details.hotelName : ''}`,
    booking_cancel: `${userName} cancelled booking for ${details.guestName || details.guest?.name || 'a guest'}${details.hotelName ? ' at ' + details.hotelName : ''}${details.reason ? ' - Reason: ' + details.reason : ''}`,
    booking_reject: `${userName} rejected booking${details.guestName ? ' for ' + details.guestName : ''}${details.reason ? ' - Reason: ' + details.reason : ''}`,
    // Payment actions
    planner_payment: `${userName} initiated payment${details.amount ? ' of ' + formatCurrency(details.amount) : ''}${details.purpose ? ' for ' + details.purpose : ''}${details.hotelName ? ' to ' + details.hotelName : ''}`,
    planner_payment_complete: `${userName} completed payment of ${details.amount ? formatCurrency(details.amount) : ''}${details.hotelName ? ' to ' + details.hotelName : ''}${details.paymentMethod ? ' via ' + details.paymentMethod : ''}`,
    payment_process: `${userName} processed payment${details.amount ? ' of ' + formatCurrency(details.amount) : ''}${details.guestName ? ' from ' + details.guestName : ''}${details.hotelName ? ' for ' + details.hotelName : ''}`,
    payment_refund: `${userName} processed refund${details.amount ? ' of ' + formatCurrency(details.amount) : ''}${details.guestName ? ' to ' + details.guestName : ''}${details.reason ? ' - ' + details.reason : ''}`,
    // Guest actions
    guest_add: `${userName} added ${details.guestName || details.name || details.guest?.name || 'a guest'}${details.groupName ? ' to group "' + details.groupName + '"' : ''}${details.email ? ' (' + details.email + ')' : ''}`,
    guest_upload: `${userName} uploaded ${details.count || 'multiple'} guest(s)${details.groupName ? ' to group "' + details.groupName + '"' : ''}`,
    guest_remove: `${userName} removed ${details.guestName || details.guest?.name || 'a guest'}${details.groupName ? ' from group "' + details.groupName + '"' : ''}`,
    guest_update: `${userName} updated ${details.guestName || details.guest?.name || 'a guest'}'s information${details.updatedFields ? ' (' + details.updatedFields.join(', ') + ')' : ''}`,
    guest_auto_register: `${details.guestName || details.guest?.name || 'A guest'} was auto-registered${details.email ? ' (' + details.email + ')' : ''}`,
    guest_invite_login: `${details.guestName || details.guest?.name || 'A guest'} logged in via invitation`,
    // Inventory actions
    inventory_create: `${userName} added inventory for ${details.hotelName || details.hotel?.name || 'a hotel'}${details.groupName ? ' - Group: "' + details.groupName + '"' : ''}${details.roomType ? ' (' + details.roomType + ')' : ''}${details.quantity ? ' - ' + details.quantity + ' rooms' : ''}`,
    inventory_update: `${userName} updated inventory${details.hotelName ? ' for ' + details.hotelName : ''}${details.groupName ? ' - Group: "' + details.groupName + '"' : ''}${details.newQuantity !== undefined ? ' to ' + details.newQuantity + ' rooms' : ''}`,
    inventory_lock: `${userName} locked ${details.quantity || ''} room(s)${details.hotelName ? ' at ' + details.hotelName : ''}${details.groupName ? ' for group "' + details.groupName + '"' : ''}${details.guestCount ? ' (' + details.guestCount + ' guests)' : ''}`,
    inventory_release: `${userName} released ${details.quantity || ''} room(s)${details.hotelName ? ' at ' + details.hotelName : ''}${details.groupName ? ' from group "' + details.groupName + '"' : ''}`,
    // Communication
    chat_message_send: `${userName} sent a message${details.message ? ': "' + details.message.substring(0, 100) + (details.message.length > 100 ? '..."' : '"') : ''}`,
  };

  return messages[action] || `${userName} performed ${action.replace(/_/g, ' ')}`;
};

/**
 * Get icon name for activity type
 * @param {string} action - Action type
 * @returns {string} - Icon component name from lucide-react
 */
export const getActivityIcon = (action) => {
  const iconMap = {
    // Event actions
    event_create: 'Calendar',
    event_update: 'Edit',
    event_delete: 'XCircle',
    event_approve: 'CheckCircle',
    event_reject: 'XCircle',
    event_comment: 'FileText',
    event_comment_reply: 'FileText',
    event_privacy_toggle: 'Lock',
    event_microsite_publish: 'Globe',
    // Hotel/Proposal actions
    hotel_proposal_select: 'Hotel',
    hotel_proposal_deselect: 'Hotel',
    hotel_proposal_submit: 'FileText',
    hotel_selection_confirmed: 'CheckCircle',
    hotel_select_recommended: 'Hotel',
    proposal_submit: 'FileText',
    proposal_review: 'Edit',
    // Booking actions
    booking_create: 'Calendar',
    booking_approve: 'CheckCircle',
    booking_cancel: 'XCircle',
    booking_reject: 'XCircle',
    // Payment actions
    planner_payment: 'CreditCard',
    planner_payment_complete: 'CheckCircle',
    payment_process: 'CreditCard',
    payment_refund: 'CreditCard',
    // Guest actions
    guest_add: 'UserPlus',
    guest_upload: 'Upload',
    guest_remove: 'UserMinus',
    guest_update: 'Edit',
    guest_auto_register: 'UserCheck',
    guest_invite_login: 'UserCheck',
    // Inventory actions
    inventory_create: 'Package',
    inventory_update: 'Edit',
    inventory_lock: 'Lock',
    inventory_release: 'Unlock',
    // Communication
    chat_message_send: 'FileText',
  };

  return iconMap[action] || 'Activity';
};

/**
 * Get color class for activity type
 * @param {string} action - Action type
 * @returns {string} - Tailwind color classes
 */
export const getActivityColor = (action) => {
  if (action.includes('approve') || action.includes('complete') || action.includes('confirm') || action.includes('add')) {
    return 'text-green-600 bg-green-100';
  }
  if (action.includes('reject') || action.includes('cancel') || action.includes('remove')) {
    return 'text-red-600 bg-red-100';
  }
  if (action.includes('payment') || action.includes('booking')) {
    return 'text-blue-600 bg-blue-100';
  }
  if (action.includes('hotel') || action.includes('select')) {
    return 'text-purple-600 bg-purple-100';
  }
  if (action.includes('guest') || action.includes('upload')) {
    return 'text-indigo-600 bg-indigo-100';
  }
  if (action.includes('inventory') || action.includes('lock')) {
    return 'text-amber-600 bg-amber-100';
  }
  return 'text-gray-600 bg-gray-100';
};
