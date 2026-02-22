import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  ChevronRight,
  Hotel,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Star,
  MapPin,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

export const MicrositeInventoryManagement = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1); // 1: Hotels, 2: Groups, 3: Recommendations, 4: Confirm
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupNumber, setNewGroupNumber] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupForGuests, setSelectedGroupForGuests] = useState(null);
  const [selectedGuestsForGroup, setSelectedGuestsForGroup] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [populatedHotels, setPopulatedHotels] = useState([]);
  const [expandedGroupRecs, setExpandedGroupRecs] = useState({});

  // Fetch event
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const event = eventData?.data;
  const selectedHotels = event?.selectedHotels || [];
  const invitedGuests = event?.invitedGuests || [];

  // Fetch full hotel details for selected hotels
  const { data: hotelsData } = useQuery({
    queryKey: ['microsite-hotels', event?._id],
    queryFn: async () => {
      if (!event?._id) return null;
      const res = await eventService.getMicrositeProposals(event._id);
      return res.data;
    },
    enabled: !!event?._id,
  });

  // Populate hotel details when data is available
  useEffect(() => {
    if (hotelsData?.recommendations && selectedHotels.length > 0) {
      const populated = selectedHotels.map((sh) => {
        const hotelRec = hotelsData.recommendations.find(
          (h) => h.hotel?._id === (sh.hotel?._id || sh.hotel)
        );
        return {
          ...sh,
          hotel: hotelRec?.hotel || sh.hotel,
        };
      });
      setPopulatedHotels(populated);
    } else if (selectedHotels.length > 0) {
      setPopulatedHotels(selectedHotels);
    }
  }, [hotelsData, selectedHotels]);

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ['inventory-groups', event?._id],
    queryFn: async () => {
      if (!event?._id) return null;
      try {
        const res = await api.get(`/inventory/${event._id}/groups`);
        console.log('Groups API Response:', res);
        // res is already unwrapped by API interceptor: { success, data: [...groups], message }
        // Extract and return the groups array
        return res?.data || [];
      } catch (error) {
        console.error('Error fetching groups:', error.response?.data || error.message);
        throw error;
      }
    },
    enabled: !!event?._id,
  });

  useEffect(() => {
    console.log('groupsData updated:', groupsData);
    // groupsData is the groups array from the query (API wrapper unwraps response.data)
    if (Array.isArray(groupsData)) {
      console.log('Setting groups array:', groupsData);
      setGroups(groupsData);
    } else if (groupsData?.data && Array.isArray(groupsData.data)) {
      // Fallback if response structure is different
      console.log('Setting groups from data property:', groupsData.data);
      setGroups(groupsData.data);
    }
  }, [groupsData]);

  // Auto-generate groups mutation (public events)
  const autoGenerateGroupsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/inventory/${event._id}/groups/auto-generate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Groups auto-generated!');
      refetchGroups();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to auto-generate groups');
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const res = await api.post(`/inventory/${event._id}/groups`, groupData);
      return res.data;
    },
    onSuccess: (response) => {
      toast.success('Group created!');
      setNewGroupName('');
      setNewGroupNumber('');
      setNewGroupDescription('');
      
      // Extract the group data from response
      const newGroup = response?.data;
      if (newGroup && newGroup._id) {
        // Ensure members array exists
        if (!newGroup.members) {
          newGroup.members = [];
        }
        // Add directly to state
        setGroups(prevGroups => [...prevGroups, newGroup]);
      }
      
      // Refetch to ensure sync with server
      setTimeout(() => refetchGroups(), 300);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create group');
    },
  });

  // Assign guests to group mutation
  const assignGuestsMutation = useMutation({
    mutationFn: async (groupId) => {
      const res = await api.put(`/inventory/${groupId}/guests/assign`, {
        guestEmails: selectedGuestsForGroup,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Guests assigned!');
      setSelectedGuestsForGroup([]);
      setSelectedGroupForGuests(null);
      refetchGroups();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign guests');
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const res = await api.delete(`/inventory/${groupId}`);
      return res.data;
    },
    onSuccess: (data, groupId) => {
      toast.success('Group deleted!');
      // Remove the group from state immediately
      setGroups(groups.filter(g => g._id !== groupId));
      // Also refetch to ensure sync
      refetchGroups();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete group');
    },
  });

  // Fetch recommendations
  const fetchRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true);
      const res = await api.get(`/inventory/${event._id}/recommendations`);
      console.log('Recommendations response:', res);
      // res is already unwrapped by API interceptor: { success, data: {...}, message }
      setRecommendations(res?.data);
      setIsLoadingRecommendations(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setIsLoadingRecommendations(false);
      toast.error('Failed to fetch recommendations');
      throw error;
    }
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (!newGroupNumber.trim()) {
      toast.error('Number of people is required');
      return;
    }
    const groupData = {
      name: newGroupName,
      number: parseInt(newGroupNumber),
      description: newGroupDescription.trim() || undefined,
    };
    console.log('Creating group with data:', groupData);
    createGroupMutation.mutate(groupData);
  };

  const handleAssignGuests = (groupId) => {
    if (selectedGuestsForGroup.length === 0) {
      toast.error('Please select at least one guest');
      return;
    }
    assignGuestsMutation.mutate(groupId);
  };

  if (eventLoading || groupsLoading) {
    return (
      <MicrositeDashboardLayout event={event}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </MicrositeDashboardLayout>
    );
  }

  if (!event) {
    return (
      <MicrositeDashboardLayout>
        <div className="card bg-red-50 border border-red-200">
          <p className="text-red-900">Event not found</p>
        </div>
      </MicrositeDashboardLayout>
    );
  }

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Inventory</h1>
          <p className="text-gray-600 mt-2">Configure guest groups and get hotel recommendations</p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Hotels', icon: Hotel },
              { num: 2, label: 'Groups', icon: Users },
              { num: 3, label: 'Recommendations', icon: Sparkles },
              { num: 4, label: 'Confirm', icon: CheckCircle2 },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all cursor-pointer ${
                    step >= s.num
                      ? 'bg-primary-100 text-primary-600 font-semibold'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <s.icon className="h-6 w-6" />
                  <span className="text-sm">{s.label}</span>
                </button>
                {idx < 3 && (
                  <ChevronRight className={`h-5 w-5 ${step > s.num ? 'text-primary-600' : 'text-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Hotels Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Selected Hotels</h2>
              {selectedHotels.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hotels selected yet</p>
                  <button
                    onClick={() => navigate(`/microsite/${slug}/hotels`)}
                    className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Go to Hotel Selection
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {populatedHotels.map((selectedHotel) => (
                    <div
                      key={selectedHotel.hotel?._id || selectedHotel.hotel}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {selectedHotel.hotel?.name || selectedHotel.hotel?.organization || 'Hotel'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedHotel.hotel?.description || 'Premium accommodation'}
                          </p>
                        </div>
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                      </div>

                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        {selectedHotel.hotel?.location?.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {selectedHotel.hotel.location.city}
                              {selectedHotel.hotel.location.country ? `, ${selectedHotel.hotel.location.country}` : ''}
                            </span>
                          </div>
                        )}

                        {selectedHotel.hotel?.priceRange?.min && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700 font-medium">
                              ${selectedHotel.hotel.priceRange.min} - ${selectedHotel.hotel.priceRange.max || selectedHotel.hotel.priceRange.min}
                            </span>
                          </div>
                        )}

                        {selectedHotel.hotel?.totalRooms && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {selectedHotel.hotel.totalRooms} rooms available
                            </span>
                          </div>
                        )}

                        {selectedHotel.hotel?.specialization && selectedHotel.hotel.specialization.length > 0 && (
                          <div className="flex items-start gap-2 mt-2">
                            <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-700">
                              <p className="font-medium">Specializes in:</p>
                              <p className="text-gray-600">{selectedHotel.hotel.specialization.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {selectedHotel.hotel?.facilities && selectedHotel.hotel.facilities.length > 0 && (
                          <div className="text-sm mt-2">
                            <p className="font-medium text-gray-700 mb-1">Facilities:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedHotel.hotel.facilities.slice(0, 4).map((facility, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                  {facility}
                                </span>
                              ))}
                              {selectedHotel.hotel.facilities.length > 4 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{selectedHotel.hotel.facilities.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                disabled={selectedHotels.length === 0}
              >
                Next: Create Groups
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Group Management */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Auto-generate option for public events */}
            {!event.isPrivate && groups.length === 0 && (
              <div className="card bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">🎯 Auto-Generate Groups</h3>
                <p className="text-sm text-blue-800 mb-4">
                  For public events, groups are automatically generated based on guest relationship types.
                </p>
                <button
                  onClick={() => autoGenerateGroupsMutation.mutate()}
                  disabled={autoGenerateGroupsMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {autoGenerateGroupsMutation.isPending ? 'Generating...' : 'Auto-Generate Groups'}
                </button>
              </div>
            )}

            {/* Create manual group (for private events or custom groups) */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {event.isPrivate ? 'Create Guest Groups' : 'Create Custom Groups'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., VIP Guests, Family, Friends"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number</label>
                  <input
                    type="number"
                    value={newGroupNumber}
                    onChange={(e) => setNewGroupNumber(e.target.value)}
                    placeholder="e.g., 10, 25, 50"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="e.g., VIP members who require premium accommodations"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={handleAddGroup}
                  disabled={createGroupMutation.isPending}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>

            {/* Display groups */}
            {groupsLoading ? (
              <div className="card text-center py-8">
                <p className="text-gray-600">Loading groups...</p>
              </div>
            ) : groups.length > 0 ? (
              <div className="card">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Groups ({groups.length})</h3>
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">{group.name}</h4>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Expected Capacity:</span> {group.number} {group.number === 1 ? 'person' : 'people'}
                            </p>
                            {group.description && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Description:</span> {group.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
                              deleteGroupMutation.mutate(group._id);
                            }
                          }}
                          disabled={deleteGroupMutation.isPending}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Delete group"
                        >
                          <Trash2 className="h-5 w-5 text-red-600" />
                        </button>
                      </div>

                      {/* Members */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 font-medium">
                          Members ({group.members.length})
                        </p>
                        <div className="mt-2 space-y-1">
                          {group.members.length > 0 ? (
                            group.members.map((member) => (
                              <div key={member.guestEmail} className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                                <span className="text-gray-700">
                                  {member.guestName} ({member.guestEmail})
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">No members added yet</p>
                          )}
                        </div>
                      </div>

                      {/* Guest assignment (for private events) */}
                      {event.isPrivate && selectedGroupForGuests !== group._id && (
                        <button
                          onClick={() => {
                            setSelectedGroupForGuests(group._id);
                            setSelectedGuestsForGroup([]);
                          }}
                          className="text-sm text-primary-600 hover:underline font-medium"
                        >
                          + Assign Guests
                        </button>
                      )}

                      {/* Guest selector */}
                      {selectedGroupForGuests === group._id && (
                        <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Select guests for this group:</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                            {invitedGuests.map((guest) => (
                              <label key={guest.email} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedGuestsForGroup.includes(guest.email)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedGuestsForGroup([...selectedGuestsForGroup, guest.email]);
                                    } else {
                                      setSelectedGuestsForGroup(
                                        selectedGuestsForGroup.filter((g) => g !== guest.email)
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">
                                  {guest.name} ({guest.email})
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAssignGuests(group._id)}
                              disabled={assignGuestsMutation.isPending}
                              className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                              {assignGuestsMutation.isPending ? 'Assigning...' : 'Assign Selected'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGroupForGuests(null);
                                setSelectedGuestsForGroup([]);
                              }}
                              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card bg-blue-50 border border-blue-200">
                <p className="text-blue-900 text-center py-8">No groups created yet. Create a group above to get started.</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={groups.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Next: Get Recommendations
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Recommendations */}
        {step === 3 && (
          <div className="space-y-6">
            {!recommendations && (
              <div className="card text-center">
                <p className="text-gray-600 mb-4">
                  Click the button below to generate AI-powered hotel recommendations based on guest groups
                  and booking history.
                </p>
                <button
                  onClick={() => {
                    toast.promise(fetchRecommendations(), {
                      loading: 'Computing recommendations...',
                      success: 'Recommendations ready!',
                      error: 'Failed to compute recommendations',
                    });
                  }}
                  disabled={isLoadingRecommendations}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingRecommendations ? 'Computing...' : '🎯 Generate Recommendations'}
                </button>
              </div>
            )}

            {recommendations && (
              <div className="space-y-6">
                {/* Group Recommendations */}
                {recommendations.groupRecommendations?.length > 0 && (
                  <div className="card">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Group Recommendations</h3>
                    <div className="space-y-8">
                      {recommendations.groupRecommendations.map((groupRec) => (
                        <div key={groupRec.groupId} className="border-l-4 border-green-600 pl-6 pb-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-green-600 text-lg">{groupRec.groupName} Group</h4>
                            {groupRec.hotels && groupRec.hotels.length > 1 && (
                              <button
                                onClick={() => setExpandedGroupRecs({ ...expandedGroupRecs, [groupRec.groupId]: !expandedGroupRecs[groupRec.groupId] })}
                                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                {expandedGroupRecs[groupRec.groupId] ? '↑ Collapse Alternatives' : '↓ View Alternatives'}
                              </button>
                            )}
                          </div>
                          <div className="grid md:grid-cols-1 gap-4">
                            {/* Top Recommended Hotel */}
                            {groupRec.hotels && groupRec.hotels[0] && (
                              <div>
                                {(() => {
                                  const topHotel = groupRec.hotels[0];
                                  const fullHotel = populatedHotels.find(
                                    h => h.hotel?._id === topHotel.hotelId || h.hotel === topHotel.hotelId
                                  )?.hotel;
                                  
                                  return (
                                    <div className="border-2 rounded-lg p-5 ring-2 ring-green-300 bg-green-50 border-green-500">
                                      {/* AI Recommended Badge */}
                                      <div className="mb-4">
                                        <span className="inline-block bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">
                                          🏆 AI RECOMMENDED
                                        </span>
                                      </div>

                                      {/* Hotel Name */}
                                      <div className="mb-4">
                                        <h5 className="font-bold text-gray-900 text-xl">{topHotel.hotelName}</h5>
                                        {fullHotel?.description && (
                                          <p className="text-sm text-gray-600 mt-1">{fullHotel.description}</p>
                                        )}
                                      </div>

                                      {/* Score - Large and Prominent */}
                                      <div className="mb-4 p-3 bg-gradient-to-r from-green-200 to-green-100 rounded-lg border-2 border-green-400">
                                        <div className="flex justify-between items-center">
                                          <span className="font-bold text-2xl text-green-900">
                                            {topHotel.groupScore ? (topHotel.groupScore / 10).toFixed(1) : '10'}/10
                                          </span>
                                          <div className="w-32 h-3 bg-green-300 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                                              style={{ width: `${(topHotel.groupScore || 100) / 100 * 100}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        <p className="text-xs text-green-800 font-bold mt-1">Perfect Match Score</p>
                                      </div>

                                      {/* Hotel Details */}
                                      <div className="space-y-2 border-t border-green-300 pt-3 mb-3">
                                        {fullHotel?.location?.city && (
                                          <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-700">
                                              {fullHotel.location.city}
                                              {fullHotel.location.country ? `, ${fullHotel.location.country}` : ''}
                                            </span>
                                          </div>
                                        )}

                                        {fullHotel?.priceRange?.min && (
                                          <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-700 font-medium">
                                              ${fullHotel.priceRange.min} - ${fullHotel.priceRange.max || fullHotel.priceRange.min} per night
                                            </span>
                                          </div>
                                        )}

                                        {fullHotel?.totalRooms && (
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>📊 {fullHotel.totalRooms} rooms available</span>
                                          </div>
                                        )}

                                        {fullHotel?.specializations?.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {fullHotel.specializations.slice(0, 3).map((spec) => (
                                              <span key={spec} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                {spec}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Recommendation Reasons */}
                                      {topHotel.reasons && topHotel.reasons.length > 0 && (
                                        <div className="bg-green-100 rounded p-3 border border-green-300">
                                          <p className="text-xs font-bold text-green-900 mb-2">Why this hotel:</p>
                                          <ul className="space-y-1">
                                            {topHotel.reasons.slice(0, 3).map((reason, i) => (
                                              <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-green-600 font-bold mt-0.5">✓</span>
                                                <span className="text-green-900">{reason}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Alternative Hotels (collapsed by default) */}
                            {expandedGroupRecs[groupRec.groupId] && groupRec.hotels && groupRec.hotels.slice(1, 3).map((hotel, idx) => {
                              const fullHotel = populatedHotels.find(
                                h => h.hotel?._id === hotel.hotelId || h.hotel === hotel.hotelId
                              )?.hotel;
                              
                              return (
                                <div
                                  key={hotel.hotelId}
                                  className="border border-gray-200 bg-white rounded-lg p-4 opacity-75 hover:opacity-100 transition-opacity"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                                        <span className="text-sm font-bold text-blue-600">{idx + 2}</span>
                                      </div>
                                      <h5 className="font-semibold text-gray-900">{hotel.hotelName}</h5>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                      <span className="font-bold text-gray-900">
                                        {hotel.groupScore ? (hotel.groupScore / 10).toFixed(1) : '10'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Hotel Details */}
                                  <div className="space-y-2 border-t pt-3 text-sm">
                                    {fullHotel?.location?.city && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700">
                                          {fullHotel.location.city}
                                          {fullHotel.location.country ? `, ${fullHotel.location.country}` : ''}
                                        </span>
                                      </div>
                                    )}

                                    {fullHotel?.priceRange?.min && (
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700 font-medium">
                                          ${fullHotel.priceRange.min} - ${fullHotel.priceRange.max || fullHotel.priceRange.min}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Why This Hotel */}
                                  {hotel.reasons && hotel.reasons.length > 0 && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                      <p className="text-blue-700 font-medium mb-1">Why:</p>
                                      <p className="text-blue-600">{hotel.reasons[0]}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Recommendations */}
                {Object.keys(recommendations.individualRecommendations || {}).length > 0 && (
                  <div className="card">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Personalized Recommendations</h3>
                    <div className="space-y-4">
                      {Object.entries(recommendations.individualRecommendations).map(
                        ([guestEmail, personalRec]) => (
                          <div key={guestEmail} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-900 text-lg">👤 {personalRec.guestName}</h4>
                              <p className="text-sm text-gray-600 mt-1">Group: {personalRec.groupName}</p>
                            </div>
                            <div className="space-y-3">
                              {personalRec.hotels.map((hotel, idx) => {
                                // Find full hotel details from selected hotels
                                const fullHotel = populatedHotels.find(
                                  h => h.hotel?._id === hotel.hotelId || h.hotel === hotel.hotelId
                                )?.hotel;
                                
                                return (
                                  <div
                                    key={hotel.hotelId}
                                    className="border border-green-200 bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
                                          <span className="text-sm font-bold text-green-600">{idx + 1}</span>
                                        </div>
                                        <div>
                                          <h5 className="font-semibold text-gray-900 text-lg">{hotel.hotelName}</h5>
                                          {fullHotel?.description && (
                                            <p className="text-sm text-gray-600 mt-1">{fullHotel.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1">
                                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                          <span className="font-bold text-lg text-gray-900">
                                            {(hotel.personalScore / 10).toFixed(1)}
                                          </span>
                                          <span className="text-gray-600">/10</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Hotel Details */}
                                    <div className="space-y-2 border-t pt-3">
                                      {fullHotel?.location?.city && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-gray-500" />
                                          <span className="text-sm text-gray-700">
                                            {fullHotel.location.city}
                                            {fullHotel.location.country ? `, ${fullHotel.location.country}` : ''}
                                          </span>
                                        </div>
                                      )}

                                      {fullHotel?.priceRange?.min && (
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="h-4 w-4 text-gray-500" />
                                          <span className="text-sm text-gray-700 font-medium">
                                            ${fullHotel.priceRange.min} - ${fullHotel.priceRange.max || fullHotel.priceRange.min} per night
                                          </span>
                                        </div>
                                      )}

                                      {fullHotel?.facilities?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {fullHotel.facilities.slice(0, 3).map((facility) => (
                                            <span key={facility} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                              {facility}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Recommendation Reasons */}
                                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                      <p className="text-xs font-medium text-green-900 mb-2">Perfect for you because:</p>
                                      <ul className="space-y-1">
                                        {hotel.reasons.map((reason, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                                            <span className="text-green-900">{reason}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => {
                  setRecommendations(null);
                  setStep(2);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!recommendations}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Next: Confirm & Save
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ready to Save</h2>
                  <p className="text-gray-600 mt-1">Review your inventory configuration below</p>
                </div>
              </div>

              <div className="space-y-6 border-t border-gray-200 pt-6">
                {/* Selected Hotels Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Hotels ({selectedHotels.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {populatedHotels.map((h) => (
                      <div
                        key={h.hotel?._id || h.hotel}
                        className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">
                            {h.hotel?.name || h.hotel?.organization || 'Hotel'}
                          </p>
                          {h.hotel?.location?.city && (
                            <p className="text-xs text-gray-600 mt-1">
                              📍 {h.hotel.location.city}
                              {h.hotel.location.country ? `, ${h.hotel.location.country}` : ''}
                            </p>
                          )}
                          {h.hotel?.priceRange?.min && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              💰 ${h.hotel.priceRange.min} - ${h.hotel.priceRange.max || h.hotel.priceRange.min}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Groups Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Guest Groups ({groups.length})</h3>
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <div key={g._id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{g.name}</p>
                          <p className="text-sm text-gray-600">{g.members.length} members</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final action */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm text-primary-900">
                    ✓ All groups have been created and recommendations generated. Click below to finalize your inventory
                    configuration.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  toast.success('Inventory configuration saved!');
                  navigate(`/microsite/${slug}/dashboard`);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                ✓ Save & Complete
              </button>
            </div>
          </div>
        )}
      </div>
    </MicrositeDashboardLayout>
  );
};
