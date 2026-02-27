import React, { useState, useEffect } from 'react';
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
  IndianRupee,
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
  Check,
  CreditCard,
  Lock,
  MessageSquare,
  Edit
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['planner-proposals'],
    queryFn: () => eventService.getAll(),
  });

  // Filter proposals (rfp-published, reviewing-proposals, active, rejected)
  const proposals = (eventsData?.data || []).filter(e => 
    ['rfp-published', 'reviewing-proposals', 'active', 'rejected'].includes(e.status)
  );

  // Stats
  const stats = {
    total: proposals.length,
    rfpPublished: proposals.filter(p => p.status === 'rfp-published').length,
    reviewingProposals: proposals.filter(p => p.status === 'reviewing-proposals').length,
    active: proposals.filter(p => p.status === 'active').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  // Filter proposals
  let filteredProposals = proposals;
  if (statusFilter === 'awaiting-hotels') {
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
      'rfp-published': { 
        color: 'green', 
        bgColor: 'bg-green-100', 
        textColor: 'text-green-800',
        icon: CheckCircle, 
        label: 'Active' 
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
    return configs[status] || configs['rfp-published'];
  };

  const viewHotelProposals = (event) => {
    setSelectedEvent(event);
    setShowProposalsModal(true);
  };

  const viewProposalDetails = (proposal) => {
    setSelectedProposalForDetails(proposal);
    setShowProposalDetailsModal(true);
  };

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

  const handlePaymentSuccess = async (paymentDetails) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${API_BASE_URL}/events/${selectedEvent._id}/planner-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentDetails)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment successful! Microsite is now published.');
        setShowPaymentModal(false);
        queryClient.invalidateQueries(['planner-proposals']);
        setShowProposalsModal(false);
        setSelectedEvent(null);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    }
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

        {/* <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Admin</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div> */}

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.rfpPublished}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
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

        {/* <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div> */}
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
          {/* <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Admin ({stats.pending})
          </button> */}
          <button
            onClick={() => setStatusFilter('awaiting-hotels')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'awaiting-hotels'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.rfpPublished})
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
          {/* <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({stats.active})
          </button> */}
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
                    <IndianRupee className="h-5 w-5 text-primary-600" />
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
                  {proposal.status === 'rfp-published' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span>Active - Microsite is live</span>
                      </div>
                      
                      {/* NEW: Direct link to microsite for hotel management */}
                      {proposal.micrositeConfig?.customSlug && (
                        <Link
                          to={`/microsite/${proposal.micrositeConfig.customSlug}/dashboard`}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Calendar className="h-5 w-5" />
                          Manage Event & Select Hotels
                        </Link>
                      )}
                    </>
                  )}

                  {(proposal.status === 'reviewing-proposals' || (proposal.status === 'active' && proposal.selectedHotels?.length > 0)) && (
                    <>
                      {proposal.micrositeConfig?.customSlug && (
                        <Link
                          to={`/microsite/${proposal.micrositeConfig.customSlug}/dashboard`}
                          className="btn bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                        >
                          <Eye className="h-5 w-5" />
                          {proposal.status === 'active' ? 'Manage Event' : 'Review Proposals in Microsite'}
                        </Link>
                      )}
                    </>
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
          onConfirmed={(result) => {
            // result = { selectedHotels, totalAmount, isPrivate }
            queryClient.invalidateQueries(['planner-proposals']);

            if (result.isPrivate) {
              // Private → trigger payment
              setPaymentAmount(result.totalAmount);
              setShowPaymentModal(true);
            } else {
              // Public → publish microsite immediately
              publishMicrositeMutation.mutate(selectedEvent._id);
            }
          }}
          onViewDetails={viewProposalDetails}
          isPublishing={publishMicrositeMutation.isPending}
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

      {/* Payment Modal for Private Events */}
      {showPaymentModal && selectedEvent && (
        <PaymentModal
          event={selectedEvent}
          amount={paymentAmount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

// Hotel Proposals Modal Component
const HotelProposalsModal = ({ event, onClose, onConfirmed, onViewDetails, isPublishing }) => {
  const [localSelected, setLocalSelected] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();

  const { data: proposalsData, isLoading } = useQuery({
    queryKey: ['event-proposals', event._id],
    queryFn: () => hotelProposalService.getEventProposals(event._id),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const proposals = proposalsData?.data || [];
  const isActive = event.status === 'active';

  // Initialize local selections from already-selected proposals (only once when data loads)
  useEffect(() => {
    if (proposals.length > 0) {
      const alreadySelected = proposals
        .filter(p => p.selectedByPlanner)
        .map(p => p._id);
      setLocalSelected(alreadySelected);
    }
  }, [proposals]);

  const toggleSelection = (proposalId) => {
    if (isActive) return; // Can't change after active
    setLocalSelected(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  const totalCost = proposals
    .filter(p => localSelected.includes(p._id))
    .reduce((sum, p) => sum + (p.totalEstimatedCost || 0), 0);

  const handleConfirm = async () => {
    if (localSelected.length === 0) {
      toast.error('Please select at least one hotel');
      return;
    }

    setIsConfirming(true);
    try {
      const result = await hotelProposalService.confirmSelection(event._id, localSelected);
      const data = result?.data || result;

      toast.success(`${localSelected.length} hotel(s) confirmed!`);
      queryClient.invalidateQueries(['event-proposals', event._id]);

      onConfirmed({
        selectedHotels: data.selectedHotels || [],
        totalAmount: data.totalAmount || totalCost,
        isPrivate: event.isPrivate,
      });
    } catch (error) {
      console.error('Error confirming selection:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm hotel selection');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isActive ? 'Selected Hotels' : 'Review Hotel Proposals'} — {event.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received
              {!isActive && ` • ${localSelected.length} selected`}
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
              {/* Proposals Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {proposals.map((proposal) => {
                  const isSelected = localSelected.includes(proposal._id);
                  return (
                    <div
                      key={proposal._id}
                      onClick={() => toggleSelection(proposal._id)}
                      className={`border rounded-lg p-6 transition-all ${
                        isActive ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                          : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {!isActive && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(proposal._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                            )}
                            <h3 className="text-lg font-bold text-gray-900">{proposal.hotelName}</h3>
                            {isSelected && (
                              <span className="px-2 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
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
                              <span className="text-gray-600">
                                Single Room ({proposal.pricing.singleRoom.availableRooms} available):
                              </span>
                              <span className="font-medium">₹{proposal.pricing.singleRoom.pricePerNight}/night</span>
                            </div>
                          )}
                          {proposal.pricing.doubleRoom?.availableRooms > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Double Room ({proposal.pricing.doubleRoom.availableRooms} available):
                              </span>
                              <span className="font-medium">₹{proposal.pricing.doubleRoom.pricePerNight}/night</span>
                            </div>
                          )}
                          {proposal.pricing.suite?.availableRooms > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Suite ({proposal.pricing.suite.availableRooms} available):
                              </span>
                              <span className="font-medium">₹{proposal.pricing.suite.pricePerNight}/night</span>
                            </div>
                          )}
                        </div>
                        <div className="pt-3 mt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Total Rooms:</span>
                            <span className="text-lg font-bold text-primary-600">{proposal.totalRoomsOffered}</span>
                          </div>
                          {proposal.totalEstimatedCost > 0 && (
                            <div className="flex justify-between items-center mt-2">
                              <span className="font-semibold text-gray-900">Package Cost:</span>
                              <span className="text-lg font-bold text-primary-600">
                                ₹{proposal.totalEstimatedCost.toLocaleString('en-IN')}
                              </span>
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

                      {/* View Details */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(proposal);
                        }}
                        className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 w-full"
                      >
                        <Eye className="h-4 w-4" />
                        View Full Details
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Bar (only when not already active) */}
              {!isActive && localSelected.length > 0 && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6">
                  <div
                    className={`${
                      event.isPrivate ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                    } border rounded-lg p-4 mb-4`}
                  >
                    <div className="flex items-start gap-3">
                      {event.isPrivate && <Lock className="h-5 w-5 text-blue-600 mt-0.5" />}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            event.isPrivate ? 'text-blue-900' : 'text-green-900'
                          } mb-1`}
                        >
                          {localSelected.length} hotel{localSelected.length > 1 ? 's' : ''} selected
                          {totalCost > 0 && ` • Total: ₹${totalCost.toLocaleString('en-IN')}`}
                        </p>
                        <p
                          className={`text-xs ${event.isPrivate ? 'text-blue-700' : 'text-green-700'}`}
                        >
                          {event.isPrivate
                            ? '💳 Private Event: After payment your microsite will be published and invited guests can book for free.'
                            : '✅ Public Event: Microsite will be published immediately. Guests pay individually.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={isConfirming || isPublishing}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
                  >
                    {isConfirming || isPublishing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : event.isPrivate ? (
                      <>
                        <CreditCard className="h-6 w-6" />
                        Confirm & Proceed to Payment
                        {totalCost > 0 && ` (₹${totalCost.toLocaleString('en-IN')})`}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-6 w-6" />
                        Confirm & Publish Microsite
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
                        <span className="font-medium">₹{room.pricePerNight}</span>
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

// Payment Modal Component for Private Events
const PaymentModal = ({ event, amount, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('✅ Razorpay script loaded');
    script.onerror = () => console.error('❌ Failed to load Razorpay script');
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error('Payment system not loaded. Please refresh the page.');
      return;
    }

    try {
      setIsProcessing(true);
      // toast.info('Initiating payment...');

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      // 1. Create Razorpay order
      const orderResponse = await fetch(`${API_BASE_URL}/payments/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'INR',
          notes: {
            eventId: event._id,
            eventName: event.name,
            type: 'planner_payment'
          }
        })
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Payment order creation failed: ${errorText}`);
      }

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // 2. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        order_id: orderData.data.id,
        name: 'SyncStay',
        description: `Payment for ${event.name}`,
        config: {
          display: {
            blocks: {
              banks: {
                name: 'All payment methods',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                ],
              },
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function(response) {
          try {
            // toast.info('Verifying payment...');
            // 3. Verify and process payment
            await onSuccess({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          } catch (error) {
            console.error('Payment handler error:', error);
            toast.error('Payment processing failed');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: event.planner?.name || '',
          email: event.planner?.email || '',
          contact: event.planner?.phone || ''
        },
        notify: {
          email: true,
          sms: false,
        },
        reminder_enable: true,
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Lock className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
              <p className="text-sm text-gray-600">Private Event Payment</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📅 {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>
              <p>📍 {event.location?.city || 'Location TBD'}</p>
              <p>👥 {event.expectedGuests} expected guests</p>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="border-2 border-primary-500 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Total Amount</p>
            <p className="text-4xl font-bold text-primary-600">₹{amount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-500 mt-2">Includes all selected hotel costs</p>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Private Event Payment</p>
                <p>You're paying upfront for all accommodations. After payment, your microsite will be published and invited guests can book without additional charges.</p>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-6 w-6" />
                Pay ₹{amount.toLocaleString('en-IN')}
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
};
