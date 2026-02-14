import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, DollarSign, Hotel, FileText, Lock, Unlock, Mail, Plus, X } from 'lucide-react';
import { eventService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const CreateProposalPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'conference',
    startDate: '',
    endDate: '',
    location: '',
    expectedGuests: '',
    bookingDeadline: '',
    budget: '',
    specialRequirements: '',
    isPrivate: false,
    invitedGuests: [], // For private events
    accommodationNeeds: {
      totalRooms: '',
      roomTypes: {
        single: '',
        double: '',
        suite: ''
      },
      preferredHotels: '',
      amenitiesRequired: []
    },
    additionalServices: {
      transportation: false,
      catering: false,
      avEquipment: false,
      other: ''
    }
  });

  const [guestInput, setGuestInput] = useState({ name: '', email: '', phone: '' });

  const amenitiesOptions = [
    'Free WiFi',
    'Breakfast Included',
    'Conference Rooms',
    'Parking',
    'Gym/Fitness Center',
    'Swimming Pool',
    'Business Center',
    'Airport Shuttle'
  ];

  const createProposalMutation = useMutation({
    mutationFn: (data) => eventService.create(data),
    onSuccess: () => {
      toast.success('Event proposal submitted successfully! Waiting for admin approval.');
      queryClient.invalidateQueries(['planner-events']);
      navigate('/planner/events');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit proposal');
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('roomTypes.')) {
      const roomType = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accommodationNeeds: {
          ...prev.accommodationNeeds,
          roomTypes: {
            ...prev.accommodationNeeds.roomTypes,
            [roomType]: value
          }
        }
      }));
    } else if (name.startsWith('accommodationNeeds.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accommodationNeeds: {
          ...prev.accommodationNeeds,
          [field]: value
        }
      }));
    } else if (name.startsWith('additionalServices.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        additionalServices: {
          ...prev.additionalServices,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      accommodationNeeds: {
        ...prev.accommodationNeeds,
        amenitiesRequired: prev.accommodationNeeds.amenitiesRequired.includes(amenity)
          ? prev.accommodationNeeds.amenitiesRequired.filter(a => a !== amenity)
          : [...prev.accommodationNeeds.amenitiesRequired, amenity]
      }
    }));
  };

  const handleAddGuest = () => {
    if (!guestInput.name || !guestInput.email) {
      toast.error('Please provide guest name and email');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInput.email)) {
      toast.error('Please provide a valid email address');
      return;
    }

    // Check for duplicate emails
    if (formData.invitedGuests.some(g => g.email === guestInput.email)) {
      toast.error('This email is already in the guest list');
      return;
    }

    setFormData(prev => ({
      ...prev,
      invitedGuests: [...prev.invitedGuests, { ...guestInput }]
    }));
    
    setGuestInput({ name: '', email: '', phone: '' });
    toast.success('Guest added to invitation list');
  };

  const handleRemoveGuest = (email) => {
    setFormData(prev => ({
      ...prev,
      invitedGuests: prev.invitedGuests.filter(g => g.email !== email)
    }));
    toast.success('Guest removed from invitation list');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate private events
    if (formData.isPrivate && formData.invitedGuests.length === 0) {
      toast.error('Private events require at least one invited guest');
      return;
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      expectedGuests: parseInt(formData.expectedGuests),
      budget: parseFloat(formData.budget),
      accommodationNeeds: {
        ...formData.accommodationNeeds,
        totalRooms: parseInt(formData.accommodationNeeds.totalRooms),
        roomTypes: {
          single: parseInt(formData.accommodationNeeds.roomTypes.single) || 0,
          double: parseInt(formData.accommodationNeeds.roomTypes.double) || 0,
          suite: parseInt(formData.accommodationNeeds.roomTypes.suite) || 0
        }
      }
    };

    // Remove invitedGuests if not private event
    if (!submitData.isPrivate) {
      delete submitData.invitedGuests;
    }

    createProposalMutation.mutate(submitData);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Event Proposal</h1>
        <p className="text-gray-600 mt-1">Submit your event details for admin approval</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g., Annual Tech Summit 2026"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="input"
                placeholder="Provide a detailed description of your event..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type *
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="conference">Conference</option>
                <option value="wedding">Wedding</option>
                <option value="corporate">Corporate Event</option>
                <option value="seminar">Seminar</option>
                <option value="exhibition">Exhibition</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Privacy
              </label>
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.isPrivate
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-300'
                  }`}
                >
                  {formData.isPrivate ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                  {formData.isPrivate ? 'Private Event' : 'Public Event'}
                </button>
                <p className="text-sm text-gray-600">
                  {formData.isPrivate
                    ? 'Only invited guests can access and book. Add guest emails below.'
                    : 'Anyone can access the microsite and book accommodations.'}
                </p>
              </div>
            </div>

            {/* Invited Guests Section - Only show for private events */}
            {formData.isPrivate && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invited Guests * (Private Event)
                </label>
                <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                  {/* Add Guest Form */}
                  <div className="grid md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Guest Name"
                      value={guestInput.name}
                      onChange={(e) => setGuestInput(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={guestInput.email}
                      onChange={(e) => setGuestInput(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={guestInput.phone}
                      onChange={(e) => setGuestInput(prev => ({ ...prev, phone: e.target.value }))}
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={handleAddGuest}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add
                    </button>
                  </div>

                  {/* Guest List */}
                  {formData.invitedGuests.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Invited Guests ({formData.invitedGuests.length})
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {formData.invitedGuests.map((guest, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{guest.name}</p>
                                <p className="text-sm text-gray-600">{guest.email}</p>
                                {guest.phone && (
                                  <p className="text-xs text-gray-500">{guest.phone}</p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest(guest.email)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No guests added yet. Add at least one guest for private events.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="input pl-10"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Guests *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="expectedGuests"
                  value={formData.expectedGuests}
                  onChange={handleChange}
                  required
                  min="1"
                  className="input pl-10"
                  placeholder="e.g., 150"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Deadline *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="bookingDeadline"
                  value={formData.bookingDeadline}
                  onChange={handleChange}
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget (USD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input pl-10"
                  placeholder="e.g., 50000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Accommodation Needs */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Hotel className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Accommodation Requirements</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Rooms Needed *
              </label>
              <input
                type="number"
                name="accommodationNeeds.totalRooms"
                value={formData.accommodationNeeds.totalRooms}
                onChange={handleChange}
                required
                min="1"
                className="input"
                placeholder="e.g., 75"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Hotels (Optional)
              </label>
              <input
                type="text"
                name="accommodationNeeds.preferredHotels"
                value={formData.accommodationNeeds.preferredHotels}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Hilton, Marriott"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Single Rooms
              </label>
              <input
                type="number"
                name="roomTypes.single"
                value={formData.accommodationNeeds.roomTypes.single}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="Number of single rooms"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Double Rooms
              </label>
              <input
                type="number"
                name="roomTypes.double"
                value={formData.accommodationNeeds.roomTypes.double}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="Number of double rooms"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suite Rooms
              </label>
              <input
                type="number"
                name="roomTypes.suite"
                value={formData.accommodationNeeds.roomTypes.suite}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="Number of suites"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Required Amenities
              </label>
              <div className="grid md:grid-cols-4 gap-3">
                {amenitiesOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.accommodationNeeds.amenitiesRequired.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Services */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Additional Services</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="additionalServices.transportation"
                checked={formData.additionalServices.transportation}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
              <div>
                <p className="font-medium text-gray-900">Transportation Services</p>
                <p className="text-sm text-gray-600">Airport shuttle, group transfers</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="additionalServices.catering"
                checked={formData.additionalServices.catering}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
              <div>
                <p className="font-medium text-gray-900">Catering Services</p>
                <p className="text-sm text-gray-600">Meals, refreshments, banquets</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="additionalServices.avEquipment"
                checked={formData.additionalServices.avEquipment}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
              <div>
                <p className="font-medium text-gray-900">AV Equipment</p>
                <p className="text-sm text-gray-600">Projectors, sound systems, screens</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Services (Optional)
              </label>
              <textarea
                name="additionalServices.other"
                value={formData.additionalServices.other}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Describe any other services you need..."
              />
            </div>
          </div>
        </div>

        {/* Special Requirements */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Special Requirements</h2>
          <textarea
            name="specialRequirements"
            value={formData.specialRequirements}
            onChange={handleChange}
            rows={5}
            className="input"
            placeholder="Any special requirements, dietary restrictions, accessibility needs, or other important details..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/planner/events')}
            className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProposalMutation.isPending}
            className="btn btn-primary"
          >
            {createProposalMutation.isPending ? 'Submitting...' : 'Submit Proposal for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
};
