import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { guestInvitationService } from '@/services/guestInvitationService';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { 
  Users, Mail, Phone, Lock, Unlock, Plus, Upload, 
  Download, Trash2, CheckCircle, XCircle, UserPlus, FileUp, Hotel, Clock
} from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export const MicrositePlannerGuests = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newGuests, setNewGuests] = useState([{ name: '', email: '', phone: '', group: '', location: '' }]);

  const INDIAN_CITIES = [
    'Mumbai (BOM)',
    'Delhi (DEL)',
    'Kolkata (CCU)',
    'Chennai (MAA)',
    'Bengaluru (BLR)',
    'Hyderabad (HYD)',
    'Ahmedabad (AMD)',
    'Pune (PNQ)',
    'Jaipur (JAI)',
    'Lucknow (LKO)',
    'Goa (GOI)',
    'Kochi (COK)',
    'Chandigarh (IXC)',
    'Guwahati (GAU)',
    'Bhubaneswar (BBI)',
    'Patna (PAT)',
    'Indore (IDR)',
    'Nagpur (NAG)',
    'Varanasi (VNS)',
    'Coimbatore (CJB)',
  ];
  const [excelFile, setExcelFile] = useState(null);
  const [activeTab, setActiveTab] = useState('invited'); // 'invited' or 'registered'

  // Fetch event details
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  // Fetch guest invitation list (for private events)
  const { data: guestData, isLoading: guestsLoading } = useQuery({
    queryKey: ['guests', eventData?.data?._id],
    queryFn: () => guestInvitationService.getGuestList(eventData.data._id),
    enabled: !!eventData?.data?._id,
  });

  // Fetch bookings to get registered guests
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['planner-event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  // Toggle privacy mutation
  const togglePrivacyMutation = useMutation({
    mutationFn: (isPrivate) => guestInvitationService.toggleEventPrivacy(eventData.data._id, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries(['microsite-event', slug]);
      queryClient.invalidateQueries(['guests']);
      toast.success('Event privacy updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update privacy');
    },
  });

  // Add guests mutation
  const addGuestsMutation = useMutation({
    mutationFn: (guests) => guestInvitationService.addGuests(eventData.data._id, guests),
    onSuccess: () => {
      queryClient.invalidateQueries(['guests']);
      queryClient.invalidateQueries(['inventory-groups', eventData.data._id]);
      setShowAddModal(false);
      setNewGuests([{ name: '', email: '', phone: '', group: '', location: '' }]);
      toast.success('Guests added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add guests');
    },
  });

  // Upload guest list mutation
  const uploadGuestsMutation = useMutation({
    mutationFn: (fileData) => guestInvitationService.uploadGuestList(eventData.data._id, fileData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['guests']);
      queryClient.invalidateQueries(['inventory-groups', eventData.data._id]);
      setShowUploadModal(false);
      setExcelFile(null);
      toast.success(`Successfully uploaded ${data.data.added} guests!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload guest list');
    },
  });

  // Remove guest mutation
  const removeGuestMutation = useMutation({
    mutationFn: (guestId) => guestInvitationService.removeGuest(eventData.data._id, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries(['guests']);
      toast.success('Guest removed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove guest');
    },
  });

  if (eventLoading || guestsLoading || bookingsLoading) return <LoadingPage />;

  const event = eventData?.data;
  const invitedGuests = guestData?.data?.guests || [];
  const isPrivate = event?.isPrivate;

  console.log('DEBUG - guestData:', guestData);
  console.log('DEBUG - invitedGuests:', invitedGuests);
  console.log('DEBUG - invitedGuests length:', invitedGuests.length);

  // Get unique registered guests with their booking details
  const allBookings = bookingsData?.data || [];
  const guestMap = new Map();
  allBookings.forEach((booking) => {
    const email = booking.guestDetails?.email;
    if (!email) return;

    if (!guestMap.has(email)) {
      guestMap.set(email, {
        name: booking.guestDetails.name,
        email: booking.guestDetails.email,
        phone: booking.guestDetails.phone,
        bookings: [],
        totalRooms: 0,
        status: 'registered',
      });
    }

    const guest = guestMap.get(email);
    guest.bookings.push(booking);
    guest.totalRooms += booking.roomDetails?.numberOfRooms || 0;
    
    if (booking.status === 'confirmed') {
      guest.status = 'confirmed';
    }
  });

  const registeredGuests = Array.from(guestMap.values());

  const handleTogglePrivacy = () => {
    if (window.confirm(`Make this event ${isPrivate ? 'PUBLIC' : 'PRIVATE'}?`)) {
      togglePrivacyMutation.mutate(!isPrivate);
    }
  };

  const handleAddGuest = () => {
    setNewGuests([...newGuests, { name: '', email: '', phone: '', group: '', location: '' }]);
  };

  const handleRemoveNewGuest = (index) => {
    setNewGuests(newGuests.filter((_, i) => i !== index));
  };

  const handleGuestChange = (index, field, value) => {
    const updated = [...newGuests];
    updated[index][field] = value;
    setNewGuests(updated);
  };

  const handleSubmitGuests = () => {
    const validGuests = newGuests.filter(g => g.name && g.email);
    if (validGuests.length === 0) {
      toast.error('Please add at least one guest with name and email');
      return;
    }
    addGuestsMutation.mutate(validGuests);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setExcelFile(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = () => {
    if (!excelFile) {
      toast.error('Please select a file');
      return;
    }
    uploadGuestsMutation.mutate(excelFile);
  };

  const handleRemoveGuest = (guestId) => {
    if (window.confirm('Remove this guest from the invitation list?')) {
      removeGuestMutation.mutate(guestId);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Email,Phone,Group,Location\nJohn Doe,john@example.com,+1234567890,VIP,Mumbai (BOM)\nJane Smith,jane@example.com,+0987654321,Family,Kolkata (CCU)';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest-list-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };



  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header with Privacy Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Guest Management</h1>
            <p className="text-sm text-gray-600 mt-2">Manage event invitations and track registered attendees</p>
          </div>
          <button
            onClick={handleTogglePrivacy}
            disabled={togglePrivacyMutation.isPending}
            className={`btn ${isPrivate ? 'btn-error' : 'btn-success'} min-w-[140px] shadow-md`}
          >
            {isPrivate ? <Unlock className="h-5 w-5 mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
            {isPrivate ? 'Make Public' : 'Make Private'}
          </button>
        </div>

        {/* Privacy Status Banner */}
        <div className={`rounded-xl border-2 p-5 ${isPrivate ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'} shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isPrivate ? 'bg-yellow-100' : 'bg-green-100'}`}>
              {isPrivate ? (
                <Lock className="h-6 w-6 text-yellow-700" />
              ) : (
                <Unlock className="h-6 w-6 text-green-700" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-base font-bold uppercase tracking-wide ${isPrivate ? 'text-yellow-900' : 'text-green-900'}`}>
                {isPrivate ? 'Private Event' : 'Public Event'}
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isPrivate ? 'text-yellow-800' : 'text-green-800'}`}>
                {isPrivate 
                  ? 'Access restricted to invited guests only. Only pre-approved attendees can view the event microsite.' 
                  : 'Open to all attendees. Anyone with the link can access the microsite and book accommodations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b-2 border-gray-200 bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('invited')}
            className={`pb-4 pt-3 px-6 font-semibold transition-all relative ${
              activeTab === 'invited'
                ? 'text-primary-600 border-b-4 border-primary-600 -mb-[2px]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <span>Invited Guests</span>
              <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'invited' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'
              }`}>
                {invitedGuests.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`pb-4 pt-3 px-6 font-semibold transition-all relative ${
              activeTab === 'registered'
                ? 'text-primary-600 border-b-4 border-primary-600 -mb-[2px]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Registered Guests</span>
              <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'registered' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'
              }`}>
                {registeredGuests.length}
              </span>
            </div>
          </button>
        </div>

        {/* Invited Guests Tab */}
        {activeTab === 'invited' && (
          <div className="space-y-6">
            {/* Helper text for public events */}
            {/* {!isPrivate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Unlock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Public Event - Pre-Invited Guests</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      These are VIP/special guests you've pre-invited. Public events allow anyone to book, but invited guests can be assigned to specific groups for better accommodation management.
                    </p>
                  </div>
                </div>
              </div>
            )} */}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Invited</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{invitedGuests.length}</p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-xl">
                      <UserPlus className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Accessed</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">
                        {invitedGuests.filter((g) => g.hasAccessed).length}
                      </p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-xl">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Not Accessed</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {invitedGuests.filter((g) => !g.hasAccessed).length}
                      </p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-xl">
                      <XCircle className="h-8 w-8 text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary shadow-md hover:shadow-lg transition-all px-6 py-3 font-semibold"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Guests
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn btn-outline border-2 hover:border-primary-600 hover:bg-primary-50 px-6 py-3 font-semibold transition-all"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Excel
                </button>
                <button
                  onClick={downloadTemplate}
                  className="btn btn-outline border-2 hover:border-gray-400 hover:bg-gray-50 px-6 py-3 font-semibold transition-all"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Template
                </button>
              </div>

            {/* Guest List */}
            {invitedGuests.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-base font-bold text-gray-900">Guest List</h3>
                    <p className="text-xs text-gray-600 mt-1">All invited guests for this event</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Group</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date Added</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {invitedGuests.map((guest) => (
                          <tr key={guest._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">{guest.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{guest.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{guest.phone || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {guest.group ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
                                  {guest.group}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {guest.location ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                                  ✈️ {guest.location}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {guest.hasAccessed ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Accessed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(guest.addedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleRemoveGuest(guest._id)}
                                className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                disabled={removeGuestMutation.isPending}
                                title="Remove guest"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Guests Added Yet</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Start by adding guests manually or uploading an Excel file
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn btn-primary"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Guests
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn btn-outline"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Excel
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* Registered Guests Tab */}
        {activeTab === 'registered' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-4 rounded-xl">
                    <Users className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Registered</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{registeredGuests.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-4 rounded-xl">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Confirmed</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {registeredGuests.filter((g) => g.status === 'confirmed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-4 rounded-xl">
                    <Hotel className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Rooms</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {registeredGuests.reduce((sum, g) => sum + g.totalRooms, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Guests List */}
            {registeredGuests.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5" /> Registered Guests ({registeredGuests.length})
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">Guests who have completed bookings</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Phone</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700">Bookings</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700">Total Rooms</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {registeredGuests.map((guest, idx) => (
                        <tr 
                          key={idx}
                          className="hover:bg-blue-50 transition-colors duration-150 group"
                        >
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{guest.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="text-gray-600">{guest.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="text-gray-600">{guest.phone || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                              {guest.bookings.length}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                              {guest.totalRooms}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {guest.status === 'confirmed' ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium text-sm">
                                <CheckCircle className="h-4 w-4" /> Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium text-sm">
                                <Clock className="h-4 w-4" /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white text-center py-20 border-2 border-dashed border-gray-300 rounded-xl">
                <Users className="h-20 w-20 text-gray-300 mx-auto mb-5" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Registered Guests Yet</h3>
                <p className="text-sm text-gray-600">
                  Guests who complete their bookings will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Guests Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Add Guests Manually</h3>
                <p className="text-sm text-gray-600 mt-2">Add one or multiple guests to your event invitation list</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <hr className="my-5 border-gray-200" />

            <div className="space-y-5 max-h-[550px] overflow-y-auto mb-6 pr-2">
              {newGuests.map((guest, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200 relative hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Guest {index + 1}
                    </span>
                    {newGuests.length > 1 && (
                      <button
                        onClick={() => handleRemoveNewGuest(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                        title="Remove guest"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., John Doe"
                        value={guest.name}
                        onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g., john@example.com"
                        value={guest.email}
                        onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g., +1234567890"
                        value={guest.phone}
                        onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-2">
                        Group Assignment
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., VIP, Family, Friends"
                        value={guest.group}
                        onChange={(e) => handleGuestChange(index, 'group', e.target.value)}
                        className="input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-2">
                        Departure City ✈️
                      </label>
                      <select
                        value={guest.location}
                        onChange={(e) => handleGuestChange(index, 'location', e.target.value)}
                        className="input w-full"
                      >
                        <option value="">Select departure city</option>
                        {INDIAN_CITIES.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddGuest}
              className="btn btn-outline w-full mb-6 flex items-center justify-center gap-2 hover:bg-primary-50 border-2 py-3 font-semibold transition-all"
            >
              <Plus className="h-5 w-5" />
              Add Another Guest
            </button>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-900 leading-relaxed">
                <span className="font-bold">💡 Pro Tip:</span> Group names help organize guests for accommodation assignments. Use common categories like VIP, Family, Friends, or Colleagues for better organization.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-outline flex-1 hover:bg-gray-50 border-2 py-3 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGuests}
                disabled={addGuestsMutation.isPending}
                className="btn btn-primary flex-1 shadow-lg hover:shadow-xl transition-all py-3 font-bold"
              >
                {addGuestsMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add {newGuests.filter(g => g.name && g.email).length || ''} Guest{newGuests.filter(g => g.name && g.email).length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Upload Guest List</h3>
                <p className="text-sm text-gray-600 mt-2">Import multiple guests from a CSV or Excel file</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <hr className="my-5 border-gray-200" />

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-200 rounded-xl p-3">
                    <FileUp className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-2 text-base">File Requirements</h4>
                    <p className="text-xs text-blue-800 mb-3 leading-relaxed">
                      Upload a CSV or Excel file with columns: <strong>Name, Email, Phone, Group</strong>
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download Template File
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-xl p-10 text-center transition-all bg-gradient-to-b from-gray-50 to-white">
                {excelFile ? (
                  <div className="space-y-5">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">File Selected</p>
                      <p className="text-sm text-gray-600 mt-2">Ready to upload</p>
                    </div>
                    <label className="btn btn-outline cursor-pointer border-2 px-6 py-3 font-semibold">
                      <Upload className="h-5 w-5 mr-2" />
                      Choose Different File
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <FileUp className="h-20 w-20 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-bold text-gray-800 mb-2">Upload Your Guest List</p>
                      <p className="text-sm text-gray-500 whitespace-nowrap">CSV or Excel file (max 10MB)</p>
                    </div>
                    <label className="btn btn-primary cursor-pointer shadow-lg px-6 py-3 font-bold inline-flex items-center whitespace-nowrap">
                      <Upload className="h-5 w-5 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-outline flex-1 hover:bg-gray-50 border-2 py-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={!excelFile || uploadGuestsMutation.isPending}
                  className="btn btn-primary flex-1 shadow-lg hover:shadow-xl transition-all py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadGuestsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Guest List
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MicrositeDashboardLayout>
  );
};
