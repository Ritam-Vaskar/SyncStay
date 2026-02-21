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
  DollarSign, 
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
    mutationFn: ({ eventId, hotelId }) => eventService.selectRecommendedHotel(eventId, hotelId),
    onSuccess: () => {
      toast.success('Hotel selected successfully!');
      queryClient.invalidateQueries(['microsite-hotels']);
      queryClient.invalidateQueries(['microsite-event']);
    },
    onError: (error) => {
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
              RFP Proposals ({rfpProposals.length})
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

        {/* RFP Proposals Tab */}
        {activeTab === 'proposals' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">📨 Hotels Responding to Your RFP</h3>
              <p className="text-sm text-purple-800">
                These hotels have submitted proposals in response to your Request for Proposal.
              </p>
            </div>

            {rfpProposals.length === 0 ? (
              <div className="card text-center py-12">
                <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Proposals Yet</h3>
                <p className="text-gray-600">Hotels haven't submitted proposals yet. You can select from recommended hotels in the meantime.</p>
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
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">
              ${hotel.priceRange.min || 0} - ${hotel.priceRange.max || 0} per night
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
            <DollarSign className="h-5 w-5" />
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
