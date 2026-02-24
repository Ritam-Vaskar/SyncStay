import api from './api';

export const guestInvitationService = {
  // Add guests manually
  addGuests: (eventId, guests) => {
    return api.post(`/guest-invitations/${eventId}/guests`, { guests });
  },

  // Upload Excel file with guest list
  uploadGuestList: (eventId, fileData) => {
    return api.post(`/guest-invitations/${eventId}/guests/upload`, { fileData });
  },

  // Get guest list for event
  getGuestList: (eventId) => {
    return api.get(`/guest-invitations/${eventId}/guests`);
  },

  // Remove guest
  removeGuest: (eventId, guestId) => {
    return api.delete(`/guest-invitations/${eventId}/guests/${guestId}`);
  },

  // Update guest group assignment
  updateGuestGroup: (eventId, guestId, group) => {
    return api.patch(`/guest-invitations/${eventId}/guests/${guestId}/group`, { group });
  },

  // Toggle event privacy
  toggleEventPrivacy: (eventId, isPrivate) => {
    return api.patch(`/guest-invitations/${eventId}/privacy`, { isPrivate });
  },

  // Verify guest access to microsite
  verifyGuestAccess: (eventSlug, email) => {
    return api.post('/guest-invitations/verify-access', { eventSlug, email });
  },

  // Get planner billing for private event
  getPlannerBilling: (eventId) => {
    return api.get(`/bookings/planner/${eventId}/billing`);
  },
};
