import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Plus,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Hotel,
  AlertCircle,
  Send,
  Building,
  Star,
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
  Check
} from 'lucide-react';
import { eventService } from '@/services/apiServices';
import { hotelProposalService } from '@/services/hotelProposalService';
import toast from 'react-hot-toast';

export const PlannerProposalsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [selectedProposalForDetails, setSelectedProposalForDetails] = useState(null);
  const [showProposalDetailsModal, setShowProposalDetailsModal] = useState(false);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['planner-proposals'],
    queryFn: () => eventService.getAll(),
  });

  // Filter proposals (pending-approval, rfp-published, reviewing-proposals, active, rejected)
  const proposals = (eventsData?.data || []).filter(e => 
    ['pending-approval', 'rfp-published', 'reviewing-proposals', 'active', 'rejected'].includes(e.status)
  );

  // Stats
  const stats = {
    total: proposals.length,
    pending: proposals.filter(p => p.status === 'pending-approval').length,
    rfpPublished: proposals.filter(p => p.status === 'rfp-published').length,
    reviewingProposals: proposals.filter(p => p.status === 'reviewing-proposals').length,
    active: proposals.filter(p => p.status === 'active').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  // Filter proposals
  let filteredProposals = proposals;
  if (statusFilter === 'pending') {
    filteredProposals = proposals.filter(p => p.status === 'pending-approval');
  } else if (statusFilter === 'awaiting-hotels') {
    filteredProposals = proposals.filter(p => p.status === 'rfp-published');
  } else if (statusFilter === 'reviewing') {
    filteredProposals = proposals.filter(p => p.status === 'reviewing-proposals');
  } else if (statusFilter === 'active') {
    filteredProposals = proposals.filter(p => p.status === 'active');
  } else if (statusFilter === 'rejected') {
    filteredProposals = proposals.filter(p => p.status === 'rejected');
  }

  const getStatusConfig = (status) => {
    const configs = {
      'pending-approval': { 
        color: 'yellow', 
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-800',
        icon: Clock, 
        label: 'Pending Admin Approval' 
      },
      'rfp-published': { 
        color: 'blue', 
        bgColor: 'bg-blue-100', 
        textColor: 'text-blue-800',
        icon: Send, 
        label: 'Awaiting Hotel Proposals' 
      },
      'reviewing-proposals': { 
        color: 'purple', 
        bgColor: 'bg-purple-100', 
        textColor: 'text-purple-800',
        icon: Eye, 
        label: 'Review Hotel Proposals' 
      },
      'active': { 
        color: 'green', 
        bgColor: 'bg-green-100', 
        textColor: 'text-green-800',
        icon: CheckCircle, 
        label: 'Active - Microsite Published' 
      },
      'rejected': { 
        color: 'red', 
        bgColor: 'bg-red-100', 
        textColor: 'text-red-800',
        icon: XCircle, 
        label: 'Rejected' 
      }
    };
    return configs[status] || configs['pending-approval'];
  };

  const viewHotelProposals = async (event) => {
    setSelectedEvent(event);
    setShowProposalsModal(true);
  };

  const viewProposalDetails = (proposal) => {
    setSelectedProposalForDetails(proposal);
    setShowProposalDetailsModal(true);
  };

  const selectProposalMutation = useMutation({
    mutationFn: (proposalId) => hotelProposalService.selectProposal(proposalId),
    onSuccess: () => {
      toast.success('Hotel selected successfully!');
      queryClient.invalidateQueries(['planner-proposals']);
      queryClient.invalidateQueries(['event-proposals']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to select hotel');
    },
  });

  const publishMicrositeMutation = useMutation({
    mutationFn: (eventId) => hotelProposalService.publishMicrosite(eventId),
    onSuccess: () => {
      toast.success('Microsite published successfully! Event is now active.');
      queryClient.invalidateQueries(['planner-proposals']);
      setShowProposalsModal(false);
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to publish microsite');
    },
  });

  const handleSelectHotel = (proposalId) => {
    selectProposalMutation.mutate(proposalId);
  };

  const handlePublishMicrosite = () => {
    if (selectedEvent?.selectedHotels?.length === 0) {
      toast.error('Please select at least one hotel before publishing');
      return;
    }
    publishMicrositeMutation.mutate(selectedEvent._id);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Proposals</h1>
          <p className="text-gray-600 mt-2">
            Track your event proposals from submission to activation
          </p>
        </div>
        <Link to="/planner/proposals/create" className="btn btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Proposal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Admin</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Awaiting Hotels</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.rfpPublished}</p>
            </div>
            <Send className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Review Proposals</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.reviewingProposals}</p>
            </div>
            <Eye className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Admin ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('awaiting-hotels')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'awaiting-hotels'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Awaiting Hotels ({stats.rfpPublished})
          </button>
          <button
            onClick={() => setStatusFilter('reviewing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'reviewing'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Review Proposals ({stats.reviewingProposals})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.active})
          </button>
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Proposals Found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? "You haven't submitted any proposals yet." 
              : `No ${statusFilter} proposals found.`}
          </p>
          {statusFilter === 'all' && (
            <Link to="/planner/proposals/create" className="btn btn-primary inline-flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Your First Proposal
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => {
            const statusConfig = getStatusConfig(proposal.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={proposal._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{proposal.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{proposal.description}</p>
                    
                    {/* Submission Date */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Submitted: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                      {proposal.approvedAt && (
                        <span>Approved: {new Date(proposal.approvedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proposal Details Grid */}
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Event Dates</p>
                      <p className="text-sm font-medium">
                        {new Date(proposal.startDate).toLocaleDateString()} - {new Date(proposal.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium">
                        {typeof proposal.location === 'string' 
                          ? proposal.location 
                          : `${proposal.location?.city || 'N/A'}, ${proposal.location?.country || ''}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Expected Guests</p>
                      <p className="text-sm font-medium">{proposal.expectedGuests || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="text-sm font-medium">${proposal.budget?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {proposal.status === 'rejected' && proposal.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">Rejection Reason</h4>
                        <p className="text-sm text-red-800">{proposal.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Hotels */}
                {proposal.selectedHotels && proposal.selectedHotels.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hotel className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-900">Selected Hotels ({proposal.selectedHotels.length})</h4>
                    </div>
                    <p className="text-sm text-green-800">
                      Hotels have been selected for this event
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  {proposal.status === 'pending-approval' && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-4 py-2 rounded-lg">
                      <Clock className="h-5 w-5" />
                      <span>Waiting for admin approval</span>
                    </div>
                  )}

                  {proposal.status === 'rfp-published' && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
                      <Send className="h-5 w-5" />
                      <span>RFP sent to all hotels - waiting for proposals</span>
                    </div>
                  )}

                  {(proposal.status === 'reviewing-proposals' || (proposal.status === 'active' && proposal.selectedHotels?.length > 0)) && (
                    <button
                      onClick={() => viewHotelProposals(proposal)}
                      className="btn bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                    >
                      <Eye className="h-5 w-5" />
                      {proposal.status === 'active' ? 'View Selected Hotels' : 'Review Hotel Proposals'}
                    </button>
                  )}

                  {proposal.status === 'active' && proposal.micrositeConfig?.customSlug && (
                    <Link
                      to={`/microsite/${proposal.micrositeConfig.customSlug}/dashboard`}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Calendar className="h-5 w-5" />
                      Manage Event
                    </Link>
                  )}

                  {proposal.status === 'rejected' && (
                    <button
                      onClick={() => navigate('/planner/proposals/create', { state: { editProposal: proposal } })}
                      className="btn bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2"
                    >
                      Revise & Resubmit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hotel Proposals Modal */}
      {showProposalsModal && selectedEvent && (
        <HotelProposalsModal
          event={selectedEvent}
          onClose={() => {
            setShowProposalsModal(false);
            setSelectedEvent(null);
          }}
          onSelectHotel={handleSelectHotel}
          onPublishMicrosite={handlePublishMicrosite}
          onViewDetails={viewProposalDetails}
          isPublishing={publishMicrositeMutation.isPending}
          isSelecting={selectProposalMutation.isPending}
        />
      )}

      {/* Proposal Details Modal */}
      {showProposalDetailsModal && selectedProposalForDetails && (
        <ProposalDetailsModal
          proposal={selectedProposalForDetails}
          onClose={() => {
            setShowProposalDetailsModal(false);
            setSelectedProposalForDetails(null);
          }}
          facilityIcons={facilityIcons}
        />
      )}
    </div>
  );
};

// Hotel Proposals Modal Component
const HotelProposalsModal = ({ event, onClose, onSelectHotel, onPublishMicrosite, onViewDetails, isPublishing, isSelecting }) => {
  const { data: proposalsData, isLoading } = useQuery({
    queryKey: ['event-proposals', event._id],
    queryFn: () => hotelProposalService.getEventProposals(event._id),
  });

  const proposals = proposalsData?.data || [];
  const selectedCount = proposals.filter(p => p.selectedByPlanner).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hotel Proposals for {event.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {proposals.length} proposals received • {selectedCount} selected
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12">
              <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Proposals Yet</h3>
              <p className="text-gray-600">Hotels haven't submitted proposals for this event yet.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {proposals.map((proposal) => (
                  <div
                    key={proposal._id}
                    className={`border rounded-lg p-6 transition-all ${
                      proposal.selectedByPlanner
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{proposal.hotelName}</h3>
                          {proposal.selectedByPlanner && (
                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(proposal.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Pricing</h4>
                      <div className="space-y-2 text-sm">
                        {proposal.pricing.singleRoom?.availableRooms > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Single Room ({proposal.pricing.singleRoom.availableRooms} available):</span>
                            <span className="font-medium">${proposal.pricing.singleRoom.pricePerNight}/night</span>
                          </div>
                        )}
                        {proposal.pricing.doubleRoom?.availableRooms > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Double Room ({proposal.pricing.doubleRoom.availableRooms} available):</span>
                            <span className="font-medium">${proposal.pricing.doubleRoom.pricePerNight}/night</span>
                          </div>
                        )}
                        {proposal.pricing.suite?.availableRooms > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Suite ({proposal.pricing.suite.availableRooms} available):</span>
                            <span className="font-medium">${proposal.pricing.suite.pricePerNight}/night</span>
                          </div>
                        )}
                      </div>
                      <div className="pt-3 mt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total Rooms:</span>
                          <span className="text-lg font-bold text-primary-600">{proposal.totalRoomsOffered}</span>
                        </div>
                        {proposal.totalEstimatedCost && (
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-semibold text-gray-900">Package Cost:</span>
                            <span className="text-lg font-bold text-primary-600">${proposal.totalEstimatedCost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
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
                        onClick={() => onViewDetails(proposal)}
                        className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 flex-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      {!proposal.selectedByPlanner && event.status !== 'active' && (
                        <button
                          onClick={() => onSelectHotel(proposal._id)}
                          disabled={isSelecting}
                          className="btn btn-sm btn-primary flex items-center gap-2 flex-1"
                        >
                          <Check className="h-4 w-4" />
                          Select Hotel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Publish Microsite Button */}
              {selectedCount > 0 && event.status !== 'active' && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      You have selected {selectedCount} hotel{selectedCount > 1 ? 's' : ''}. 
                      Click "Publish Microsite" to finalize your selection and activate the event.
                    </p>
                  </div>
                  <button
                    onClick={onPublishMicrosite}
                    disabled={isPublishing}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
                  >
                    {isPublishing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-6 w-6" />
                        Publish Microsite & Activate Event
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Proposal Details Modal Component
const ProposalDetailsModal = ({ proposal, onClose, facilityIcons }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{proposal.hotelName}</h2>
            <p className="text-sm text-gray-600 mt-1">Detailed Proposal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pricing Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Availability</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {['singleRoom', 'doubleRoom', 'suite'].map((roomType) => {
                const room = proposal.pricing[roomType];
                if (!room || room.availableRooms === 0) return null;
                
                return (
                  <div key={roomType} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 capitalize">
                      {roomType.replace('Room', ' Room')}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price/Night:</span>
                        <span className="font-medium">${room.pricePerNight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium">{room.availableRooms} rooms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-primary-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Rooms Offered:</span>
                <span className="text-2xl font-bold text-primary-600">{proposal.totalRoomsOffered}</span>
              </div>
              {proposal.totalEstimatedCost && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold text-gray-900">Total Package Cost:</span>
                  <span className="text-2xl font-bold text-primary-600">${proposal.totalEstimatedCost.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Facilities</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries(proposal.facilities).map(([key, value]) => {
                if (!value) return null;
                const Icon = facilityIcons[key] || Hotel;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    <Icon className="h-5 w-5 text-primary-600" />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Offer */}
          {proposal.specialOffer && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Offer</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-800">{proposal.specialOffer}</p>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {proposal.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800">{proposal.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
