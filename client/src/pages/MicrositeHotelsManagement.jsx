import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { hotelProposalService } from '@/services/hotelProposalService';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  Hotel, 
  Star, 
  MapPin, 
  IndianRupee, 
  Users, 
  CheckCircle,
  Eye,
  TrendingUp,
  Building,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Waves,
  Sparkles,
  UtensilsCrossed,
  Users as UsersIcon,
  Plane,
  ShirtIcon,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const facilityIcons = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  gym: Dumbbell,
  pool: Waves,
  spa: Sparkles,
  restaurant: UtensilsCrossed,
  conferenceRoom: UsersIcon,
  airportShuttle: Plane,
  laundry: ShirtIcon,
};

export const MicrositeHotelsManagement = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recommended');
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Fetch event data
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  // Fetch hotel data (recommendations + proposals)
  const { data: hotelsData, isLoading: hotelsLoading } = useQuery({
    queryKey: ['microsite-hotels', eventData?.data?._id],
    queryFn: async () => {
      const result = await eventService.getMicrositeProposals(eventData.data._id);
      console.log('🏨 Hotels data received:', result);
      console.log('🎯 Recommendations:', result?.data?.recommendations);
      return result;
    },
    enabled: !!eventData?.data?._id,
  });

  // Select recommended hotel mutation
  const selectHotelMutation = useMutation({
    mutationFn: ({ eventId, hotelId }) => {
      console.log('🎯 Selecting recommended hotel - Event ID:', eventId, 'Hotel ID:', hotelId);
      return eventService.selectRecommendedHotel(eventId, hotelId);
    },
    onSuccess: (data) => {
      console.log('✅ Hotel selection successful:', data);
      toast.success('Hotel selected successfully!');
      queryClient.invalidateQueries(['microsite-hotels']);
      queryClient.invalidateQueries(['microsite-event']);
    },
    onError: (error) => {
      console.error('❌ Hotel selection failed:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to select hotel');
    },
  });

  // Select RFP proposal mutation
  const selectProposalMutation = useMutation({
    mutationFn: (proposalId) => hotelProposalService.selectProposal(proposalId),
    onSuccess: () => {
      toast.success('Proposal selected successfully!');
      queryClient.invalidateQueries(['microsite-hotels']);
      queryClient.invalidateQueries(['microsite-event']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to select proposal');
    },
  });

  if (eventLoading || hotelsLoading) {
    return (
      <MicrositeDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </MicrositeDashboardLayout>
    );
  }

  const event = eventData?.data;
  const recommendations = hotelsData?.data?.recommendations || [];
  const rfpProposals = hotelsData?.data?.rfpProposals || [];
  const selectedHotels = hotelsData?.data?.selectedHotels || [];

  const handleSelectRecommended = (hotelId) => {
    if (window.confirm('Select this hotel for your event?')) {
      selectHotelMutation.mutate({ eventId: event._id, hotelId });
    }
  };

  const handleSelectProposal = (proposalId) => {
    if (window.confirm('Select this hotel proposal for your event?')) {
      selectProposalMutation.mutate(proposalId);
    }
  };

  return (
    <MicrositeDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hotel Selection</h1>
            <p className="text-gray-600 mt-2">Choose hotels for your event</p>
          </div>
          
          {selectedHotels.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <p className="text-sm font-semibold text-green-900">
                {selectedHotels.length} Hotel{selectedHotels.length !== 1 ? 's' : ''} Selected
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'recommended'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recommended Hotels ({recommendations.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'proposals'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Selected Hotels ({rfpProposals.length})
            </div>
          </button>
        </div>

        {/* Recommended Hotels Tab */}
        {activeTab === 'recommended' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 AI-Matched Hotels</h3>
              <p className="text-sm text-blue-800">
                These hotels are recommended based on your event location, budget, type, and capacity requirements.
              </p>
            </div>

            {recommendations.length === 0 ? (
              <div className="card text-center py-12">
                <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
                <p className="text-gray-600">We're generating hotel recommendations for your event...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {recommendations.map((rec) => (
                  <RecommendedHotelCard
                    key={rec._id}
                    recommendation={rec}
                    onSelect={handleSelectRecommended}
                    isSelecting={selectHotelMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Hotels Tab */}
        {activeTab === 'proposals' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">✅ Selected Hotels</h3>
              <p className="text-sm text-purple-800">
                These are the hotels you have selected for your event.
              </p>
            </div>

            {rfpProposals.length === 0 ? (
              <div className="card text-center py-12">
                <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Hotels Selected</h3>
                <p className="text-gray-600">You haven't selected any hotels yet. Choose from the recommended hotels to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rfpProposals.map((proposal) => (
                  <RFPProposalCard
                    key={proposal._id}
                    proposal={proposal}
                    onSelect={handleSelectProposal}
                    onViewDetails={() => setSelectedProposal(proposal)}
                    isSelecting={selectProposalMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedProposal.hotelName}</h2>
                <p className="text-sm text-gray-600">by {selectedProposal.hotel?.name || selectedProposal.hotel?.organization}</p>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status and Cost */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProposal.status === 'selected' ? 'bg-green-100 text-green-800' :
                    selectedProposal.status === 'under-review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedProposal.status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Rooms Offered</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProposal.totalRoomsOffered}</p>
                </div>
                {selectedProposal.totalEstimatedCost && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Package Cost</p>
                    <p className="text-2xl font-bold text-gray-900">₹{selectedProposal.totalEstimatedCost.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>

              {/* Room Pricing */}
              {selectedProposal.pricing && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Room Pricing & Availability</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {selectedProposal.pricing.singleRoom && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Single Room</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">Price: <span className="font-semibold text-gray-900">₹{selectedProposal.pricing.singleRoom.pricePerNight}/night</span></p>
                          <p className="text-gray-600">Available: <span className="font-semibold text-gray-900">{selectedProposal.pricing.singleRoom.availableRooms} rooms</span></p>
                        </div>
                      </div>
                    )}
                    {selectedProposal.pricing.doubleRoom && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Double Room</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">Price: <span className="font-semibold text-gray-900">₹{selectedProposal.pricing.doubleRoom.pricePerNight}/night</span></p>
                          <p className="text-gray-600">Available: <span className="font-semibold text-gray-900">{selectedProposal.pricing.doubleRoom.availableRooms} rooms</span></p>
                        </div>
                      </div>
                    )}
                    {selectedProposal.pricing.suite && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Suite</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">Price: <span className="font-semibold text-gray-900">₹{selectedProposal.pricing.suite.pricePerNight}/night</span></p>
                          <p className="text-gray-600">Available: <span className="font-semibold text-gray-900">{selectedProposal.pricing.suite.availableRooms} rooms</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Facilities */}
              {selectedProposal.facilities && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Facilities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(selectedProposal.facilities).map(([key, value]) => {
                      if (!value) return null;
                      const Icon = facilityIcons[key];
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                          {Icon && <Icon className="h-4 w-4 text-green-600" />}
                          <span className="text-sm text-green-900">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amenities */}
              {selectedProposal.amenities && selectedProposal.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.amenities.map((amenity, i) => (
                      <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Services */}
              {selectedProposal.additionalServices && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Services</h3>
                  <div className="space-y-3">
                    {selectedProposal.additionalServices.transportation?.available && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Transportation
                        </h4>
                        <p className="text-sm text-gray-600">{selectedProposal.additionalServices.transportation.description}</p>
                        {selectedProposal.additionalServices.transportation.cost && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">Cost: ₹{selectedProposal.additionalServices.transportation.cost}</p>
                        )}
                      </div>
                    )}
                    {selectedProposal.additionalServices.catering?.available && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4" />
                          Catering
                        </h4>
                        <p className="text-sm text-gray-600">{selectedProposal.additionalServices.catering.description}</p>
                        {selectedProposal.additionalServices.catering.costPerPerson && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">Cost per person: ₹{selectedProposal.additionalServices.catering.costPerPerson}</p>
                        )}
                      </div>
                    )}
                    {selectedProposal.additionalServices.avEquipment?.available && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          AV Equipment
                        </h4>
                        <p className="text-sm text-gray-600">{selectedProposal.additionalServices.avEquipment.description}</p>
                        {selectedProposal.additionalServices.avEquipment.cost && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">Cost: ₹{selectedProposal.additionalServices.avEquipment.cost}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Special Offer */}
              {selectedProposal.specialOffer && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Special Offer
                  </h3>
                  <p className="text-gray-700">{selectedProposal.specialOffer}</p>
                </div>
              )}

              {/* Notes */}
              {selectedProposal.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedProposal.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="btn bg-gray-200 text-gray-700 hover:bg-gray-300 flex-1"
                >
                  Close
                </button>
                {!selectedProposal.selectedByPlanner && (
                  <button
                    onClick={() => {
                      handleSelectProposal(selectedProposal._id);
                      setSelectedProposal(null);
                    }}
                    className="btn btn-primary flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select This Hotel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </MicrositeDashboardLayout>
  );
};

// Recommended Hotel Card Component
const RecommendedHotelCard = ({ recommendation, onSelect, isSelecting }) => {
  const hotel = recommendation.hotel;
  const isSelected = recommendation.isSelectedByPlanner;
  const matchScore = Math.round(recommendation.score || 0);

  return (
    <div className={`card border-2 transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-primary-200 hover:border-primary-400'}`}>
      {/* Match Score Badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{hotel?.name || hotel?.organization || 'Hotel'}</h3>
        <div className="bg-gradient-to-r from-green-100 to-blue-100 px-3 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-green-600" />
          <span className="text-green-800 font-bold">{matchScore}% Match</span>
        </div>
      </div>

      {/* Hotel Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">
            {hotel.location?.city ? `${hotel.location.city}, ${hotel.location.country || ''}` : 'Location not specified'}
          </span>
        </div>
        
        {hotel.totalRooms && (
          <div className="flex items-center gap-2 text-gray-600">
            <Hotel className="h-4 w-4" />
            <span className="text-sm">{hotel.totalRooms} rooms available</span>
          </div>
        )}
        
        {hotel.priceRange && (hotel.priceRange.min || hotel.priceRange.max) && (
          <div className="flex items-center gap-2 text-gray-600">
            <IndianRupee className="h-4 w-4" />
            <span className="text-sm">
              ₹{hotel.priceRange.min || 0} - ₹{hotel.priceRange.max || 0} per night
            </span>
          </div>
        )}
      </div>

      {/* Reasons */}
      {recommendation.reasons && recommendation.reasons.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Why Recommended:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            {recommendation.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Score Breakdown */}
      {recommendation.breakdown && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            AI Match Breakdown:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {recommendation.breakdown.vector && (
              <div className="flex justify-between">
                <span className="text-purple-700">AI Similarity:</span>
                <span className="font-semibold text-purple-900">{Math.round(recommendation.breakdown.vector)}%</span>
              </div>
            )}
            {recommendation.breakdown.location !== undefined && (
              <div className="flex justify-between">
                <span className="text-purple-700">Location:</span>
                <span className="font-semibold text-purple-900">{Math.round(recommendation.breakdown.location)}%</span>
              </div>
            )}
            {recommendation.breakdown.budget !== undefined && (
              <div className="flex justify-between">
                <span className="text-purple-700">Budget:</span>
                <span className="font-semibold text-purple-900">{Math.round(recommendation.breakdown.budget)}%</span>
              </div>
            )}
            {recommendation.breakdown.capacity !== undefined && (
              <div className="flex justify-between">
                <span className="text-purple-700">Capacity:</span>
                <span className="font-semibold text-purple-900">{Math.round(recommendation.breakdown.capacity)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Specialization Tags */}
      {hotel.specialization && hotel.specialization.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {hotel.specialization.map((spec, i) => (
            <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {spec}
            </span>
          ))}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onSelect(hotel._id)}
        disabled={isSelected || isSelecting}
        className={`w-full ${
          isSelected
            ? 'btn bg-green-600 text-white cursor-not-allowed'
            : 'btn btn-primary hover:bg-primary-700'
        }`}
      >
        {isSelected ? (
          <>
            <CheckCircle className="h-5 w-5 mr-2" />
            Selected
          </>
        ) : (
          <>
            <Star className="h-5 w-5 mr-2" />
            Select Hotel
          </>
        )}
      </button>
    </div>
  );
};

// RFP Proposal Card Component
const RFPProposalCard = ({ proposal, onSelect, onViewDetails, isSelecting }) => {
  const isSelected = proposal.selectedByPlanner;

  return (
    <div className={`card border-2 transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-400'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{proposal.hotelName}</h3>
          <p className="text-sm text-gray-600">by {proposal.hotel?.name || proposal.hotel?.organization}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isSelected && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Selected
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            proposal.status === 'selected' ? 'bg-green-100 text-green-800' :
            proposal.status === 'under-review' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {proposal.status}
          </span>
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Hotel className="h-5 w-5" />
          <div>
            <p className="text-xs text-gray-500">Total Rooms</p>
            <p className="font-semibold">{proposal.totalRoomsOffered}</p>
          </div>
        </div>
        
        {proposal.totalEstimatedCost && (
          <div className="flex items-center gap-2 text-gray-600">
            <IndianRupee className="h-5 w-5" />
            <div>
              <p className="text-xs text-gray-500">Package Cost</p>
              <p className="font-semibold">₹{proposal.totalEstimatedCost.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Special Offer */}
      {proposal.specialOffer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-yellow-900">Special Offer</h5>
              <p className="text-xs text-yellow-800 mt-1">{proposal.specialOffer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onViewDetails}
          className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 flex-1"
        >
          <Eye className="h-4 w-4" />
          View Details
        </button>
        
        {!isSelected && (
          <button
            onClick={() => onSelect(proposal._id)}
            disabled={isSelecting}
            className="btn btn-primary flex items-center gap-2 flex-1"
          >
            <CheckCircle className="h-4 w-4" />
            Select Proposal
          </button>
        )}
      </div>
    </div>
  );
};
