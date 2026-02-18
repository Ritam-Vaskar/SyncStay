import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Users, 
  Hotel,
  CheckCircle,
  DollarSign,
  Clock,
  Send,
  X
} from 'lucide-react';
import { hotelProposalService } from '@/services/hotelProposalService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const HotelRfpsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  
  const [proposalData, setProposalData] = useState({
    hotelName: user?.name || '',
    pricing: {
      singleRoom: { pricePerNight: '', availableRooms: '' },
      doubleRoom: { pricePerNight: '', availableRooms: '' },
      suite: { pricePerNight: '', availableRooms: '' },
    },
    totalRoomsOffered: '',
    facilities: {
      wifi: false,
      parking: false,
      breakfast: false,
      gym: false,
      pool: false,
      spa: false,
      restaurant: false,
      conferenceRoom: false,
      airportShuttle: false,
      laundry: false,
    },
    additionalServices: {
      transportation: { available: false, cost: '', description: '' },
      catering: { available: false, costPerPerson: '', description: '' },
      avEquipment: { available: false, cost: '', description: '' },
      other: '',
    },
    specialOffer: '',
    notes: '',
    totalEstimatedCost: '',
  });

  // Fetch RFPs (events with status 'rfp-published')
  const { data: rfpsData, isLoading } = useQuery({
    queryKey: ['hotel-rfps'],
    queryFn: () => hotelProposalService.getRFPs(),
  });

  // Fetch hotel's submitted proposals
  const { data: myProposalsData } = useQuery({
    queryKey: ['my-hotel-proposals'],
    queryFn: () => hotelProposalService.getMyProposals(),
  });

  const rfps = rfpsData?.data || [];
  const myProposals = myProposalsData?.data || [];
  
  // Check if hotel has already submitted proposal for an event
  const hasSubmittedProposal = (eventId) => {
    return myProposals.some(p => p.event && (p.event._id === eventId || p.event === eventId));
  };

  const submitProposalMutation = useMutation({
    mutationFn: (data) => hotelProposalService.submitProposal(data),
    onSuccess: () => {
      toast.success('Proposal submitted successfully!');
      queryClient.invalidateQueries(['hotel-rfps']);
      queryClient.invalidateQueries(['my-hotel-proposals']);
      setShowProposalModal(false);
      setSelectedRfp(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit proposal');
    },
  });

  const resetForm = () => {
    setProposalData({
      hotelName: user?.name || '',
      pricing: {
        singleRoom: { pricePerNight: '', availableRooms: '' },
        doubleRoom: { pricePerNight: '', availableRooms: '' },
        suite: { pricePerNight: '', availableRooms: '' },
      },
      totalRoomsOffered: '',
      facilities: {
        wifi: false,
        parking: false,
        breakfast: false,
        gym: false,
        pool: false,
        spa: false,
        restaurant: false,
        conferenceRoom: false,
        airportShuttle: false,
        laundry: false,
      },
      additionalServices: {
        transportation: { available: false, cost: '', description: '' },
        catering: { available: false, costPerPerson: '', description: '' },
        avEquipment: { available: false, cost: '', description: '' },
        other: '',
      },
      specialOffer: '',
      notes: '',
      totalEstimatedCost: '',
    });
  };

  const handleSubmitProposal = (e) => {
    e.preventDefault();
    
    // Calculate total rooms
    const totalRooms = 
      parseInt(proposalData.pricing.singleRoom.availableRooms || 0) +
      parseInt(proposalData.pricing.doubleRoom.availableRooms || 0) +
      parseInt(proposalData.pricing.suite.availableRooms || 0);

    if (totalRooms === 0) {
      toast.error('Please provide at least one room type with availability');
      return;
    }

    submitProposalMutation.mutate({
      eventId: selectedRfp._id,
      ...proposalData,
      totalRoomsOffered: totalRooms,
    });
  };

  const handleOpenProposal = (rfp) => {
    if (hasSubmittedProposal(rfp._id)) {
      toast.info('You have already submitted a proposal for this event');
      return;
    }
    setSelectedRfp(rfp);
    setShowProposalModal(true);
  };

  // Stats
  const stats = {
    total: rfps.length,
    submitted: myProposals.length,
    pending: myProposals.filter(p => p.status === 'submitted' || p.status === 'under-review').length,
    selected: myProposals.filter(p => p.status === 'selected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Event RFPs</h1>
        <p className="text-gray-600 mt-2">
          Review event requirements and submit your proposals
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available RFPs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">My Proposals</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.submitted}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Send className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Under Review</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selected</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.selected}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* RFPs List */}
      {rfps.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No RFPs Available</h3>
          <p className="text-gray-600">
            There are currently no open RFPs. Check back later for new opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rfps.map((rfp) => {
            const alreadySubmitted = hasSubmittedProposal(rfp._id);
            
            return (
              <div key={rfp._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{rfp.name}</h3>
                      {alreadySubmitted && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          ✓ Proposal Submitted
                        </span>
                      )}
                      {rfp.proposalCount > 0 && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {rfp.proposalCount} Proposal{rfp.proposalCount > 1 ? 's' : ''} Received
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{rfp.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Posted: {new Date(rfp.approvedAt || rfp.createdAt).toLocaleDateString()}</span>
                      {rfp.proposalCount > 0 && !alreadySubmitted && (
                        <span className="text-orange-600 font-medium">• Open for more proposals</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Event Dates</p>
                      <p className="text-sm font-medium">
                        {new Date(rfp.startDate).toLocaleDateString()} - {new Date(rfp.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Expected Guests</p>
                      <p className="text-sm font-medium">{rfp.expectedGuests || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="text-sm font-medium">${rfp.budget?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Accommodation Requirements */}
                {rfp.accommodationNeeds && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Hotel className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Accommodation Requirements</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Rooms Needed: </span>
                        <span className="font-medium text-gray-900">
                          {rfp.accommodationNeeds.totalRooms || 0}
                        </span>
                      </div>
                      {rfp.accommodationNeeds.roomTypes && (
                        <div>
                          <span className="text-gray-600">Room Types: </span>
                          <span className="font-medium text-gray-900">
                            {Object.entries(rfp.accommodationNeeds.roomTypes)
                              .filter(([_, count]) => count > 0)
                              .map(([type, count]) => `${count} ${type}`)
                              .join(', ') || 'N/A'}
                          </span>
                        </div>
                      )}
                      {rfp.accommodationNeeds.amenitiesRequired?.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="text-gray-600">Required Amenities: </span>
                          <span className="font-medium text-gray-900">
                            {rfp.accommodationNeeds.amenitiesRequired.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenProposal(rfp)}
                    disabled={alreadySubmitted}
                    className={`btn flex items-center gap-2 ${
                      alreadySubmitted
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
                  >
                    <Send className="h-5 w-5" />
                    {alreadySubmitted ? 'Proposal Submitted' : 'Submit Proposal'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Proposal Modal */}
      {showProposalModal && selectedRfp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Submit Proposal for {selectedRfp.name}
              </h2>
              <button
                onClick={() => {
                  setShowProposalModal(false);
                  setSelectedRfp(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="p-6 space-y-6">
              {/* Hotel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Name
                </label>
                <input
                  type="text"
                  value={proposalData.hotelName}
                  onChange={(e) => setProposalData(prev => ({ ...prev, hotelName: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Availability</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {['singleRoom', 'doubleRoom', 'suite'].map((roomType) => (
                    <div key={roomType} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3 capitalize">
                        {roomType.replace('Room', ' Room')}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Price per Night ($)</label>
                          <input
                            type="number"
                            value={proposalData.pricing[roomType].pricePerNight}
                            onChange={(e) => setProposalData(prev => ({
                              ...prev,
                              pricing: {
                                ...prev.pricing,
                                [roomType]: {
                                  ...prev.pricing[roomType],
                                  pricePerNight: e.target.value
                                }
                              }
                            }))}
                            className="input"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Available Rooms</label>
                          <input
                            type="number"
                            value={proposalData.pricing[roomType].availableRooms}
                            onChange={(e) => setProposalData(prev => ({
                              ...prev,
                              pricing: {
                                ...prev.pricing,
                                [roomType]: {
                                  ...prev.pricing[roomType],
                                  availableRooms: e.target.value
                                }
                              }
                            }))}
                            className="input"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Facilities</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {Object.keys(proposalData.facilities).map((facility) => (
                    <label key={facility} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proposalData.facilities[facility]}
                        onChange={(e) => setProposalData(prev => ({
                          ...prev,
                          facilities: {
                            ...prev.facilities,
                            [facility]: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {facility.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Offer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Offer (Optional)
                </label>
                <textarea
                  value={proposalData.specialOffer}
                  onChange={(e) => setProposalData(prev => ({ ...prev, specialOffer: e.target.value }))}
                  className="input"
                  rows="2"
                  placeholder="e.g., 10% discount for early booking, free breakfast for groups over 50..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={proposalData.notes}
                  onChange={(e) => setProposalData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  rows="3"
                  placeholder="Any additional information about your proposal..."
                />
              </div>

              {/* Total Estimated Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Estimated Package Cost ($)
                </label>
                <input
                  type="number"
                  value={proposalData.totalEstimatedCost}
                  onChange={(e) => setProposalData(prev => ({ ...prev, totalEstimatedCost: e.target.value }))}
                  className="input"
                  placeholder="Total cost for the entire event"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitProposalMutation.isPending}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {submitProposalMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Submit Proposal
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalModal(false);
                    setSelectedRfp(null);
                    resetForm();
                  }}
                  className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
