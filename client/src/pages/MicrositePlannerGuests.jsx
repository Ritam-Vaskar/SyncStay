import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { guestInvitationService } from '@/services/guestInvitationService';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { 
  Users, Mail, Phone, Lock, Unlock, Plus, Upload, 
  Download, Trash2, CheckCircle, XCircle, UserPlus, FileUp, Hotel
} from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export const MicrositePlannerGuests = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newGuests, setNewGuests] = useState([{ name: '', email: '', phone: '' }]);
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
      setShowAddModal(false);
      setNewGuests([{ name: '', email: '', phone: '' }]);
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
    setNewGuests([...newGuests, { name: '', email: '', phone: '' }]);
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
    const template = 'Name,Email,Phone\nJohn Doe,john@example.com,+1234567890\nJane Smith,jane@example.com,+0987654321';
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
      <div className="space-y-6">
        {/* Header with Privacy Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Guest Management</h2>
            <p className="text-gray-600 mt-1">Manage invitations and view registered guests</p>
          </div>
          <button
            onClick={handleTogglePrivacy}
            disabled={togglePrivacyMutation.isPending}
            className={`btn ${isPrivate ? 'btn-error' : 'btn-success'}`}
          >
            {isPrivate ? <Unlock className="h-5 w-5 mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
            {isPrivate ? 'Make Public' : 'Make Private'}
          </button>
        </div>

        {/* Privacy Status Banner */}
        <div className={`card ${isPrivate ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-3">
            {isPrivate ? (
              <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
            ) : (
              <Unlock className="h-5 w-5 text-green-600 mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold ${isPrivate ? 'text-yellow-900' : 'text-green-900'}`}>
                {isPrivate ? 'PRIVATE EVENT' : 'PUBLIC EVENT'}
              </h3>
              <p className={`text-sm ${isPrivate ? 'text-yellow-700' : 'text-green-700'}`}>
                {isPrivate 
                  ? 'This event is PRIVATE - only invited guests can access the microsite' 
                  : 'This event is PUBLIC - anyone can access the microsite and book accommodations'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invited')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'invited'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invited Guests ({invitedGuests.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'registered'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Guests ({registeredGuests.length})
            </div>
          </button>
        </div>

        {/* Invited Guests Tab */}
        {activeTab === 'invited' && (
          <div className="space-y-6">
            {/* Stats */}
            {isPrivate && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-sm text-gray-600">Total Invited</p>
                  <p className="text-3xl font-bold">{invitedGuests.length}</p>
                </div>
                <div className="card bg-green-50 border-green-200">
                  <p className="text-sm text-green-700">Accessed Microsite</p>
                  <p className="text-3xl font-bold text-green-900">
                    {invitedGuests.filter((g) => g.hasAccessed).length}
                  </p>
                </div>
                <div className="card bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">Not Accessed</p>
                  <p className="text-3xl font-bold">
                    {invitedGuests.filter((g) => !g.hasAccessed).length}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            {isPrivate && (
              <div className="flex gap-4">
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
                <button
                  onClick={downloadTemplate}
                  className="btn btn-outline"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Template
                </button>
              </div>
            )}

            {/* Guest List */}
            {isPrivate ? (
              invitedGuests.length > 0 ? (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Added</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitedGuests.map((guest) => (
                          <tr key={guest._id}>
                            <td>{guest.name}</td>
                            <td className="text-gray-600">{guest.email}</td>
                            <td className="text-gray-600">{guest.phone || '-'}</td>
                            <td>
                              {guest.hasAccessed ? (
                                <span className="badge badge-success">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accessed
                                </span>
                              ) : (
                                <span className="badge badge-secondary">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Not Accessed
                                </span>
                              )}
                            </td>
                            <td className="text-gray-600 text-sm">
                              {formatDate(guest.addedAt)}
                            </td>
                            <td>
                              <button
                                onClick={() => handleRemoveGuest(guest._id)}
                                className="text-red-600 hover:text-red-700"
                                disabled={removeGuestMutation.isPending}
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
                  <h3 className="text-xl font-semibold mb-2">No Guests Added Yet</h3>
                  <p className="text-gray-600 mb-6">
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
            ) : (
              <div className="card text-center py-12">
                <Unlock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Public Event</h3>
                <p className="text-gray-600">
                  This event is public. Anyone can access the microsite and book accommodations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Registered Guests Tab */}
        {activeTab === 'registered' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Registered</p>
                    <p className="text-2xl font-bold">{registeredGuests.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Confirmed Bookings</p>
                    <p className="text-2xl font-bold">
                      {registeredGuests.filter((g) => g.status === 'confirmed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Hotel className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Rooms</p>
                    <p className="text-2xl font-bold">
                      {registeredGuests.reduce((sum, g) => sum + g.totalRooms, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Guests List */}
            {registeredGuests.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Bookings</th>
                        <th>Total Rooms</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredGuests.map((guest, idx) => (
                        <tr key={idx}>
                          <td>{guest.name}</td>
                          <td className="text-gray-600">{guest.email}</td>
                          <td className="text-gray-600">{guest.phone || '-'}</td>
                          <td>{guest.bookings.length}</td>
                          <td>{guest.totalRooms}</td>
                          <td>
                            {guest.status === 'confirmed' ? (
                              <span className="badge badge-success">Confirmed</span>
                            ) : (
                              <span className="badge badge-secondary">Pending</span>
                            )}
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
                <h3 className="text-xl font-semibold mb-2">No Registered Guests Yet</h3>
                <p className="text-gray-600">
                  Guests who book rooms will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Guests Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Add Guests Manually</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {newGuests.map((guest, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={guest.name}
                    onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                    className="input flex-1"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={guest.email}
                    onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                    className="input flex-1"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={guest.phone}
                    onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                    className="input flex-1"
                  />
                  {newGuests.length > 1 && (
                    <button
                      onClick={() => handleRemoveNewGuest(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddGuest}
              className="btn btn-outline w-full mb-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Guest
            </button>

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGuests}
                disabled={addGuestsMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {addGuestsMutation.isPending ? 'Adding...' : 'Add Guests'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Upload Guest List</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Upload an Excel (.xlsx) or CSV file with columns: Name, Email, Phone
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <Download className="h-4 w-4 inline mr-1" />
                  Download Template
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <label className="btn btn-primary cursor-pointer">
                  <Upload className="h-5 w-5 mr-2" />
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {excelFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ File selected
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={!excelFile || uploadGuestsMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {uploadGuestsMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MicrositeDashboardLayout>
  );
};
