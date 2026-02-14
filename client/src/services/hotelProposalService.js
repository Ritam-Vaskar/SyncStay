import api from './api';

export const hotelProposalService = {
  // Get all RFPs (for hotels)
  getRFPs: () => api.get('/hotel-proposals/rfps'),

  // Submit hotel proposal
  submitProposal: (data) => api.post('/hotel-proposals', data),

  // Get hotel's own proposals
  getMyProposals: () => api.get('/hotel-proposals/my-proposals'),

  // Update hotel proposal
  updateProposal: (proposalId, data) => api.put(`/hotel-proposals/${proposalId}/update`, data),

  // Get all proposals for an event (for planner)
  getEventProposals: (eventId) => api.get(`/hotel-proposals/event/${eventId}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }),

  // Select a hotel proposal (planner)
  selectProposal: (proposalId) => api.put(`/hotel-proposals/${proposalId}/select`),

  // Publish microsite after selecting hotels (planner)
  publishMicrosite: (eventId) => api.put(`/hotel-proposals/event/${eventId}/publish-microsite`),

  // Get selected hotel proposals for microsite (public)
  getSelectedForMicrosite: (slug) => api.get(`/hotel-proposals/microsite/${slug}/selected`),
};
