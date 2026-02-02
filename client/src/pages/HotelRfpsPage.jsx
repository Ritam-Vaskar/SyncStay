import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Users, 
  Hotel,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock
} from 'lucide-react';
import { eventService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const HotelRfpsPage = () => {
  const queryClient = useQueryClient();
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseData, setResponseData] = useState({
    pricePerRoom: '',
    availableRooms: '',
    proposedAmenities: [],
    additionalNotes: ''
  });

  const { data: rfpsData, isLoading } = useQuery({
    queryKey: ['hotel-rfps'],
    queryFn: () => eventService.getAll(),
  });

  // Filter only pending approval or active events (RFPs)
  const rfps = (rfpsData?.data || []).filter(e => 
    e.status === 'pending-approval' || e.status === 'active'
  );

  const respondToRfpMutation = useMutation({
    mutationFn: async ({ eventId, response }) => {
      // In a real app, this would be a separate API endpoint
      toast.success('RFP response submitted successfully!');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-rfps']);
      setShowResponseModal(false);
      setSelectedRfp(null);
      resetResponseForm();
    },
    onError: (error) => {
      toast.error('Failed to submit RFP response');
    },
  });

  const resetResponseForm = () => {
    setResponseData({
      pricePerRoom: '',
      availableRooms: '',
      proposedAmenities: [],
      additionalNotes: ''
    });
  };

  const handleRespondToRfp = (rfp) => {
    setSelectedRfp(rfp);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = (e) => {
    e.preventDefault();
    respondToRfpMutation.mutate({
      eventId: selectedRfp._id,
      response: responseData
    });
  };

  const handleAmenityToggle = (amenity) => {
    setResponseData(prev => ({
      ...prev,
      proposedAmenities: prev.proposedAmenities.includes(amenity)
        ? prev.proposedAmenities.filter(a => a !== amenity)
        : [...prev.proposedAmenities, amenity]
    }));
  };

  const amenitiesOptions = [
    'Free WiFi',
    'Breakfast Included',
    'Conference Rooms',
    'Parking',
    'Gym/Fitness Center',
    'Swimming Pool',
    'Business Center',
    'Airport Shuttle',
    'Room Service',
    '24/7 Concierge'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">RFP Management</h1>
        <p className="text-gray-600 mt-1">Review and respond to event accommodation requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total RFPs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{rfps.length}</p>
            </div>
            <FileText className="h-12 w-12 text-primary-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {rfps.filter(r => r.status === 'pending-approval').length}
              </p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Events</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {rfps.filter(r => r.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* RFPs List */}
      {rfps.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No RFPs Available</h3>
          <p className="text-gray-600">There are currently no event accommodation requests to review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rfps.map((rfp) => (
            <div key={rfp._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{rfp.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      rfp.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rfp.status === 'active' ? 'Active' : 'Under Review'}
                    </span>
                  </div>
                  <p className="text-gray-600">{rfp.description}</p>
                </div>
              </div>

              {/* Event Details */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Event Dates</p>
                    <p className="text-sm font-medium">
                      {new Date(rfp.startDate).toLocaleDateString()} - {new Date(rfp.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium">
                      {typeof rfp.location === 'string' 
                        ? rfp.location 
                        : `${rfp.location?.city || 'N/A'}, ${rfp.location?.country || ''}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Expected Guests</p>
                    <p className="text-sm font-medium">{rfp.expectedGuests || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-sm font-medium">${rfp.budget?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Accommodation Requirements */}
              {rfp.accommodationNeeds && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-primary-600" />
                    Accommodation Requirements
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Total Rooms:</strong> {rfp.accommodationNeeds.totalRooms || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Room Types:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 ml-4 mt-1">
                        {rfp.accommodationNeeds.roomTypes?.single > 0 && (
                          <li>Single: {rfp.accommodationNeeds.roomTypes.single}</li>
                        )}
                        {rfp.accommodationNeeds.roomTypes?.double > 0 && (
                          <li>Double: {rfp.accommodationNeeds.roomTypes.double}</li>
                        )}
                        {rfp.accommodationNeeds.roomTypes?.suite > 0 && (
                          <li>Suite: {rfp.accommodationNeeds.roomTypes.suite}</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      {rfp.accommodationNeeds.preferredHotels && (
                        <p className="text-sm text-gray-600">
                          <strong>Preferred Hotels:</strong> {rfp.accommodationNeeds.preferredHotels}
                        </p>
                      )}
                      {rfp.accommodationNeeds.amenitiesRequired?.length > 0 && (
                        <>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Required Amenities:</strong>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rfp.accommodationNeeds.amenitiesRequired.map((amenity, idx) => (
                              <span key={idx} className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Services */}
              {rfp.additionalServices && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Additional Services Requested</h4>
                  <div className="flex flex-wrap gap-2">
                    {rfp.additionalServices.transportation && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-3 py-1 rounded-full">Transportation</span>
                    )}
                    {rfp.additionalServices.catering && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-3 py-1 rounded-full">Catering</span>
                    )}
                    {rfp.additionalServices.avEquipment && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-3 py-1 rounded-full">AV Equipment</span>
                    )}
                  </div>
                  {rfp.additionalServices.other && (
                    <p className="text-sm text-gray-600 mt-2">{rfp.additionalServices.other}</p>
                  )}
                </div>
              )}

              {/* Special Requirements */}
              {rfp.specialRequirements && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Special Requirements</h4>
                  <p className="text-sm text-gray-700">{rfp.specialRequirements}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleRespondToRfp(rfp)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Submit Proposal
                </button>
                <button className="btn bg-gray-100 text-gray-700 hover:bg-gray-200">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRfp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Submit Proposal for {selectedRfp.name}</h2>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedRfp(null);
                    resetResponseForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitResponse} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Per Room/Night (USD) *
                    </label>
                    <input
                      type="number"
                      value={responseData.pricePerRoom}
                      onChange={(e) => setResponseData({ ...responseData, pricePerRoom: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="input"
                      placeholder="e.g., 150.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Rooms *
                    </label>
                    <input
                      type="number"
                      value={responseData.availableRooms}
                      onChange={(e) => setResponseData({ ...responseData, availableRooms: e.target.value })}
                      required
                      min="1"
                      className="input"
                      placeholder="e.g., 50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Amenities You Can Provide
                  </label>
                  <div className="grid md:grid-cols-3 gap-3">
                    {amenitiesOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={responseData.proposedAmenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={responseData.additionalNotes}
                    onChange={(e) => setResponseData({ ...responseData, additionalNotes: e.target.value })}
                    rows={4}
                    className="input"
                    placeholder="Any additional information about your proposal, special offers, or terms..."
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setSelectedRfp(null);
                      resetResponseForm();
                    }}
                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={respondToRfpMutation.isPending}
                    className="btn btn-primary"
                  >
                    {respondToRfpMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
