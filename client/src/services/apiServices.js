import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const eventService = {
  getAll: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  getBySlug: (slug) => api.get(`/events/microsite/${slug}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  approve: (id) => api.put(`/events/${id}/approve`),
  reject: (id, reason) => api.put(`/events/${id}/reject`, { reason }),
  addComment: (id, comment) => api.post(`/events/${id}/comment`, { comment }),
  replyToComment: (id, commentId, reply) => api.post(`/events/${id}/comment/${commentId}/reply`, { reply }),
};

export const inventoryService = {
  getAll: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  getAvailable: (eventId) => api.get(`/inventory/event/${eventId}/available`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  lock: (id) => api.put(`/inventory/${id}/lock`),
  release: (id) => api.put(`/inventory/${id}/release`),
  delete: (id) => api.delete(`/inventory/${id}`),
};

export const proposalService = {
  getAll: (params) => api.get('/proposals', { params }),
  getById: (id) => api.get(`/proposals/${id}`),
  create: (data) => api.post('/proposals', data),
  update: (id, data) => api.put(`/proposals/${id}`, data),
  review: (id, data) => api.put(`/proposals/${id}/review`, data),
  delete: (id) => api.delete(`/proposals/${id}`),
};

export const bookingService = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  confirm: (id) => api.put(`/bookings/${id}/confirm`),
  approve: (id) => api.put(`/bookings/${id}/approve`),
  reject: (id, reason) => api.put(`/bookings/${id}/reject`, { reason }),
  cancel: (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),
};

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  process: (data) => api.post('/payments', data),
  refund: (id) => api.post(`/payments/${id}/refund`),
};

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getEventAnalytics: (eventId) => api.get(`/analytics/event/${eventId}`),
  getRevenueAnalytics: (params) => api.get('/analytics/revenue', { params }),
  getAuditLogs: (params) => api.get('/analytics/audit-logs', { params }),
};
