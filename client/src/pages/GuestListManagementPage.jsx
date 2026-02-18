import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestInvitationService } from '../services/guestInvitationService';
import { eventService } from '../services/apiServices';
import toast from 'react-hot-toast';
import { 
  Users, 
  Upload, 
  UserPlus, 
  Trash2, 
  Download, 
  Lock, 
  Unlock,
  Mail,
  Phone,
  Calendar,
  X,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

export const GuestListManagementPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newGuests, setNewGuests] = useState([{ name: '', email: '', phone: '' }]);
  const [excelFile, setExcelFile] = useState(null);

  // Fetch event details
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventService.getById(eventId),
  });

  // Fetch guest list
  const { data: guestData, isLoading: guestsLoading, isError: guestsError, error: guestsErrorData } = useQuery({
    queryKey: ['guests', eventId],
    queryFn: () => guestInvitationService.getGuestList(eventId),
  });

  // Toggle privacy mutation
  const togglePrivacyMutation = useMutation({
    mutationFn: (isPrivate) => guestInvitationService.toggleEventPrivacy(eventId, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries(['event', eventId]);
      toast.success(`Event is now ${eventData?.data?.isPrivate ? 'public' : 'private'}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update event privacy');
    },
  });

  // Add guests mutation
  const addGuestsMutation = useMutation({
    mutationFn: (guests) => guestInvitationService.addGuests(eventId, guests),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['guests', eventId]);
      toast.success(response.data.message);
      setShowAddModal(false);
      setNewGuests([{ name: '', email: '', phone: '' }]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add guests');
    },
  });

  // Upload guest list mutation
  const uploadGuestsMutation = useMutation({
    mutationFn: (fileData) => guestInvitationService.uploadGuestList(eventId, fileData),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['guests', eventId]);
      toast.success(response.data.message);
      setShowUploadModal(false);
      setExcelFile(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload guest list');
    },
  });

  // Remove guest mutation
  const removeGuestMutation = useMutation({
    mutationFn: (guestId) => guestInvitationService.removeGuest(eventId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries(['guests', eventId]);
      toast.success('Guest removed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove guest');
    },
  });

  const handleAddGuest = () => {
    setNewGuests([...newGuests, { name: '', email: '', phone: '' }]);
  };

  const handleRemoveGuestField = (index) => {
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result.split(',')[1];
      setExcelFile({ name: file.name, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = () => {
    if (!excelFile) {
      toast.error('Please select an Excel file');
      return;
    }
    uploadGuestsMutation.mutate(excelFile.data);
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Email,Phone\nJohn Doe,john@example.com,+1234567890\nJane Smith,jane@example.com,+0987654321";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_list_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (eventLoading || guestsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guest list...</p>
        </div>
      </div>
    );
  }

  const event = eventData?.data;
  const guests = guestData?.data?.guests || [];
  const isPrivate = eventData?.data?.isPrivate;
  console.log('DEBUG - guestsError:', guestsError);
  console.log('DEBUG - guestsErrorData:', guestsErrorData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/planner/events')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{event?.name}</h1>
          <p className="text-gray-600 mt-1">Manage guest list and event privacy</p>
        </div>
      </div>

      {/* Privacy Toggle Card */}
      <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isPrivate ? 'bg-primary-600' : 'bg-gray-400'}`}>
              {isPrivate ? <Lock className="h-6 w-6 text-white" /> : <Unlock className="h-6 w-6 text-white" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Event Privacy</h3>
              <p className="text-sm text-gray-600">
                {isPrivate 
                  ? 'This event is PRIVATE - only invited guests can access the microsite' 
                  : 'This event is PUBLIC - anyone can access and book'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => togglePrivacyMutation.mutate(!isPrivate)}
            disabled={togglePrivacyMutation.isLoading}
            className={`btn ${isPrivate ? 'btn-secondary' : 'btn-primary'}`}
          >
            {togglePrivacyMutation.isLoading ? 'Updating...' : isPrivate ? 'Make Public' : 'Make Private'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Invited Guests</p>
              <p className="text-2xl font-bold">{guests.length}</p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Accessed Microsite</p>
              <p className="text-2xl font-bold">{guests.filter(g => g.hasAccessed).length}</p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-gray-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Not Accessed Yet</p>
              <p className="text-2xl font-bold">{guests.filter(g => !g.hasAccessed).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isPrivate && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Manage Guest List</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Add Guests Manually
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Upload Excel File
            </button>

            <button
              onClick={downloadTemplate}
              className="btn bg-white border-2 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download Template
            </button>
          </div>
        </div>
      )}

      {/* Guest List */}
      {isPrivate && guests.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Invited Guests ({guests.length})</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Added On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => (
                  <tr key={guest._id}>
                    <td className="font-medium">{guest.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {guest.email}
                      </div>
                    </td>
                    <td>
                      {guest.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {guest.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      {guest.hasAccessed ? (
                        <span className="badge badge-success">Accessed</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(guest.addedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          if (window.confirm('Remove this guest from the invite list?')) {
                            removeGuestMutation.mutate(guest._id);
                          }
                        }}
                        className="btn btn-sm bg-red-100 text-red-600 hover:bg-red-200"
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
      )}

      {isPrivate && guests.length === 0 && (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Guests Added Yet</h3>
          <p className="text-gray-600 mb-6">
            Start building your guest list by adding guests manually or uploading an Excel file.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <UserPlus className="h-5 w-5 mr-2" />
              Add Guests
            </button>
            <button onClick={() => setShowUploadModal(true)} className="btn btn-secondary">
              <Upload className="h-5 w-5 mr-2" />
              Upload Excel
            </button>
          </div>
        </div>
      )}

      {!isPrivate && (
        <div className="card text-center py-12 bg-gray-50">
          <Unlock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Public Event</h3>
          <p className="text-gray-600 mb-4">
            This event is public. Anyone can access the microsite and book accommodations.
            <br />
            To restrict access, make this event private.
          </p>
        </div>
      )}

      {/* Add Guests Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add Guests</h2>
              <button onClick={() => setShowAddModal(false)} className="btn btn-sm">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {newGuests.map((guest, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Guest {index + 1}</h4>
                    {newGuests.length > 1 && (
                      <button
                        onClick={() => handleRemoveGuestField(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                      className="input"
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={guest.email}
                      onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                      className="input"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={guest.phone}
                      onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddGuest}
              className="btn bg-gray-200 hover:bg-gray-300 mt-4 w-full"
            >
              + Add Another Guest
            </button>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGuests}
                disabled={addGuestsMutation.isLoading}
                className="btn btn-primary flex-1"
              >
                {addGuestsMutation.isLoading ? 'Adding...' : `Add ${newGuests.filter(g => g.name && g.email).length} Guest(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Upload Guest List</h2>
              <button onClick={() => setShowUploadModal(false)} className="btn btn-sm">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">File Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Excel file (.xlsx, .xls) or CSV</li>
                  <li>• Required columns: <strong>Name</strong>, <strong>Email</strong></li>
                  <li>• Optional column: <strong>Phone</strong></li>
                  <li>• First row should be column headers</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Download Template File
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="btn btn-secondary cursor-pointer inline-block"
                >
                  Choose File
                </label>
                {excelFile && (
                  <p className="mt-3 text-sm text-gray-600">
                    Selected: <strong>{excelFile.name}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setExcelFile(null);
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!excelFile || uploadGuestsMutation.isLoading}
                className="btn btn-primary flex-1"
              >
                {uploadGuestsMutation.isLoading ? 'Uploading...' : 'Upload & Add Guests'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
