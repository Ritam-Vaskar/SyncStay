import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plane, 
  Users, 
  Calendar, 
  Search, 
  Check, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  MoveRight,
  UserCheck,
  UserX,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';

export const MicrositeFlightManagement = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentJourneyType, setCurrentJourneyType] = useState('arrival'); // 'arrival' or 'departure'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFlights, setSelectedFlights] = useState({
    arrival: [],
    departure: []
  });
  const [editingGroupCode, setEditingGroupCode] = useState(null);
  const [tempAirportCode, setTempAirportCode] = useState('');
  const [eventAirportCode, setEventAirportCode] = useState('');
  const [savingEventCode, setSavingEventCode] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedGuests, setSelectedGuests] = useState({});
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [guestToMove, setGuestToMove] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchEventAndConfiguration();
  }, [slug]);

  const fetchEventAndConfiguration = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await api.get(`/events/microsite/${slug}`);
      setEvent(eventResponse.data);

      // Try to get existing configuration
      try {
        const configResponse = await api.get(`/flights/events/${eventResponse.data._id}/configuration`);
        setConfiguration(configResponse.configuration);
        setEventAirportCode(configResponse.configuration?.eventLocation?.airportCode || '');
        console.log('✅ Flight configuration loaded:', configResponse.configuration);
      } catch (err) {
        console.log('Configuration fetch error:', err);
        
        // No configuration exists yet, initialize it
        // Note: api interceptor returns error.response.data directly, not full axios error
        if (err.message?.includes('not found') || err.message?.includes('Flight configuration not found')) {
          console.log('⚠️ No configuration found, initializing...');
          await initializeConfiguration(eventResponse.data._id);
        } else {
          console.error('❌ Error fetching configuration:', err);
          toast.error(err.message || 'Failed to load configuration');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching event data:', error);
      toast.error('Failed to load flight management');
    } finally {
      setLoading(false);
    }
  };

  const initializeConfiguration = async (eventId) => {
    try {
      console.log('🔄 Initializing flight configuration for event:', eventId);
      const response = await api.post(`/flights/events/${eventId}/configuration/initialize`);
      setConfiguration(response.configuration);
      
      if (!response.configuration.locationGroups || response.configuration.locationGroups.length === 0) {
        toast.info('No departure cities found. Please assign departure cities to guests first.');
      } else {
        toast.success(`Flight groups ready: ${response.configuration.locationGroups.length} departure cities found`);
      }
      
      console.log('✅ Configuration initialized:', response.configuration);
    } catch (error) {
      console.error('❌ Error initializing configuration:', error);
      
      // Set empty configuration so UI can show helpful message
      setConfiguration({
        locationGroups: [],
        stats: { totalGroups: 0, totalGuests: 0, configuredGroups: 0 }
      });
      
      toast.error(error.message || 'Failed to initialize flight configuration. Please check console for details.');
    }
  };

  const updateGroupAirportCode = async (groupName, newAirportCode) => {
    try {
      // Validate airport code format (3 uppercase letters)
      const codeRegex = /^[A-Z]{3}$/;
      if (!codeRegex.test(newAirportCode)) {
        toast.error('Airport code must be 3 uppercase letters (e.g., DEL, BOM)');
        return;
      }

      // Update in local state first
      const updatedGroups = configuration.locationGroups.map(group =>
        group.groupName === groupName
          ? { ...group, origin: newAirportCode }
          : group
      );

      // Update configuration on backend
      const response = await api.put(`/flights/events/${event._id}/configuration`, {
        locationGroups: updatedGroups
      });

      setConfiguration(response.configuration);
      toast.success(`Airport code updated to ${newAirportCode}`);
      setEditingGroupCode(null);
      
      // If this group was selected, update it
      if (selectedGroup?.groupName === groupName) {
        setSelectedGroup({ ...selectedGroup, origin: newAirportCode });
      }
    } catch (error) {
      console.error('Error updating airport code:', error);
      toast.error('Failed to update airport code');
    }
  };

  const updateEventAirportCode = async () => {
    if (!eventAirportCode || eventAirportCode.length !== 3) {
      toast.error('Airport code must be exactly 3 letters');
      return;
    }

    setSavingEventCode(true);
    try {
      const response = await api.put(
        `/flights/events/${event._id}/configuration`,
        {
          eventLocation: {
            city: event?.location?.city || 'Event Location',
            country: event?.location?.country || '',
            airportCode: eventAirportCode.toUpperCase()
          }
        }
      );

      setConfiguration(response.configuration);
      toast.success('Event airport code saved!');
    } catch (error) {
      console.error('Error updating event airport code:', error);
      toast.error('Failed to update event airport code');
    } finally {
      setSavingEventCode(false);
    }
  };

  const searchFlights = async () => {
    if (!selectedGroup || !selectedDate) {
      toast.error('Please select a group and date');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.post(
        `/flights/events/${event._id}/groups/${selectedGroup.groupName}/search`,
        {
          journeyType: currentJourneyType,
          departureDate: selectedDate,
        }
      );

      setSearchResults(response.flights);
      toast.success(`Found ${response.flights.length} flights`);
    } catch (error) {
      console.error('Error searching flights:', error);
      toast.error('Failed to search flights');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleFlightSelection = (flight) => {
    const flightType = currentJourneyType;
    const currentSelections = [...selectedFlights[flightType]];
    
    const existingIndex = currentSelections.findIndex(
      f => f.resultIndex === flight.resultIndex
    );

    if (existingIndex > -1) {
      currentSelections.splice(existingIndex, 1);
    } else {
      if (currentSelections.length >= 5) {
        toast.error('Maximum 5 flights can be selected');
        return;
      }
      currentSelections.push(flight);
    }

    setSelectedFlights({
      ...selectedFlights,
      [flightType]: currentSelections
    });
  };

  const saveFlightSelections = async () => {
    if (selectedFlights.arrival.length === 0 && selectedFlights.departure.length === 0) {
      toast.error('Please select at least one flight');
      return;
    }

    try {
      const response = await api.post(
        `/flights/events/${event._id}/groups/${selectedGroup.groupName}/select`,
        {
          flightSelections: {
            arrivalFlights: selectedFlights.arrival.map(f => ({
              traceId: f.traceId,
              resultIndex: f.resultIndex,
              flightDetails: {
                airline: f.airline,
                airlineCode: f.airlineCode,
                flightNumber: f.flightNumber,
                origin: f.origin,
                destination: f.destination,
                departureTime: f.departureTime,
                arrivalTime: f.arrivalTime,
                duration: f.duration,
                cabinClass: f.cabinClass,
                stops: f.stops,
                baggage: f.baggage,
                refundable: f.refundable,
              },
              fare: {
                baseFare: f.baseFare,
                tax: f.tax,
                totalFare: f.totalFare,
                currency: f.currency,
              },
            })),
            departureFlights: selectedFlights.departure.map(f => ({
              traceId: f.traceId,
              resultIndex: f.resultIndex,
              flightDetails: {
                airline: f.airline,
                airlineCode: f.airlineCode,
                flightNumber: f.flightNumber,
                origin: f.origin,
                destination: f.destination,
                departureTime: f.departureTime,
                arrivalTime: f.arrivalTime,
                duration: f.duration,
                cabinClass: f.cabinClass,
                stops: f.stops,
                baggage: f.baggage,
                refundable: f.refundable,
              },
              fare: {
                baseFare: f.baseFare,
                tax: f.tax,
                totalFare: f.totalFare,
                currency: f.currency,
              },
            })),
          },
        }
      );

      setConfiguration(response.configuration);
      toast.success('Flight selections saved successfully');
      
      // Reset selections and move to next group
      setSelectedFlights({ arrival: [], departure: [] });
      setSearchResults([]);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error saving flight selections:', error);
      toast.error('Failed to save flight selections');
    }
  };

  const publishConfiguration = async () => {
    if (isPublishing) return;
    
    try {
      setIsPublishing(true);
      await api.post(`/flights/events/${event._id}/configuration/publish`);
      toast.success('Flight configuration published! Guests can now book flights.');
      fetchEventAndConfiguration();
    } catch (error) {
      console.error('Error publishing configuration:', error);
      
      // Handle validation error with missing groups
      if (error.missingGroups && error.missingGroups.length > 0) {
        toast.error(
          `Cannot publish: Configure flights for these groups first: ${error.missingGroups.join(', ')}`,
          { duration: 5000 }
        );
      } else {
        toast.error(error.message || 'Failed to publish configuration');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isFlightSelected = (flight) => {
    return selectedFlights[currentJourneyType].some(
      f => f.resultIndex === flight.resultIndex
    );
  };

  const toggleGroupExpansion = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const getGuestFlightStatus = (guestEmail, groupName) => {
    const groupFlights = configuration.selectedFlights?.find(sf => sf.groupName === groupName);
    if (!groupFlights) return { hasArrival: false, hasDeparture: false };
    
    return {
      hasArrival: groupFlights.arrivalFlights?.length > 0,
      hasDeparture: groupFlights.departureFlights?.length > 0
    };
  };

  const handleMoveGuest = (guest, fromGroup) => {
    setGuestToMove({ guest, fromGroup });
    setShowMoveModal(true);
  };

  const executeMoveGuest = async (toGroupName) => {
    if (!guestToMove) return;
    
    try {
      const updatedGroups = configuration.locationGroups.map(group => {
        if (group.groupName === guestToMove.fromGroup) {
          return {
            ...group,
            guests: group.guests.filter(g => g.email !== guestToMove.guest.email),
            guestsCount: group.guestsCount - 1
          };
        }
        if (group.groupName === toGroupName) {
          return {
            ...group,
            guests: [...group.guests, guestToMove.guest],
            guestsCount: group.guestsCount + 1
          };
        }
        return group;
      });

      const response = await api.put(`/flights/events/${event._id}/configuration`, {
        locationGroups: updatedGroups
      });

      setConfiguration(response.configuration);
      toast.success(`Moved ${guestToMove.guest.name} to ${toGroupName}`);
      setShowMoveModal(false);
      setGuestToMove(null);
    } catch (error) {
      console.error('Error moving guest:', error);
      toast.error('Failed to move guest');
    }
  };

  const getGroupCompletionStatus = (groupName) => {
    return configuration?.configuredGroups?.includes(groupName);
  };

  if (loading) {
    return (
      <MicrositeDashboardLayout event={event}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading flight management...</p>
          </div>
        </div>
      </MicrositeDashboardLayout>
    );
  }

  if (!configuration) {
    return (
      <MicrositeDashboardLayout event={event}>
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Flight Configuration</h2>
          <p className="text-gray-600">Unable to load flight configuration. Please try again.</p>
        </div>
      </MicrositeDashboardLayout>
    );
  }

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Plane className="h-8 w-8 text-primary-600" />
                Flight Management
              </h1>
              <button
                onClick={() => initializeConfiguration(event._id)}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-medium flex items-center gap-2 transition-colors"
                title="Re-sync groups from latest guest departure cities"
              >
                🔄 Refresh Groups
              </button>
            </div>
            <p className="mt-2 text-gray-600">
              Guests are automatically grouped by their departure city for flight booking
            </p>
            
            {/* Event Airport Code Input */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Event Airport Code:</label>
              </div>
              <input
                type="text"
                value={eventAirportCode}
                onChange={(e) => setEventAirportCode(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="e.g., BOM, DEL, BLR"
                className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={updateEventAirportCode}
                disabled={!eventAirportCode || eventAirportCode.length !== 3 || savingEventCode}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
              >
                {savingEventCode ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Code
                  </>
                )}
              </button>
              {configuration?.eventLocation?.airportCode && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Saved: {configuration.eventLocation.airportCode}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-8">
              Enter the airport code for {event?.location?.city || 'the event location'} (e.g., BOM for Mumbai, DEL for Delhi, BLR for Bangalore)
            </p>
          </div>
          {configuration.status === 'completed' && !configuration.isPublished && (
            <button
              onClick={publishConfiguration}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Publish Configuration
            </button>
          )}
          {configuration.isPublished && (
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Published
            </span>
          )}
        </div>

        {/* Info Banner - Invalid Airport Codes */}
        {configuration.locationGroups?.some(g => !g.origin.match(/^(DEL|BOM|BLR|CCU|MAA|HYD|AMD|GOI|COK|PNQ|JAI|LKO|IXC|IXB|GAU|PAT|BBI|IXR|TRV|NAG|VNS|SXR|IXA|IXU|IXJ|IXM|AGR|IDR|IMF|IXD|IXE|IXG|IXI|IXL|IXS|IXW|IXY|IXZ|JDH|JGA|KNU|RPR|SHL|TRZ|UDR|ATQ|BDQ|BHO|BHU|CDP|DHM|DIB|DIU|GWL|JLR|KLH|NMB|RAJ|RTC|STV|TEZ|VGA)$/)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Invalid Airport Codes Detected</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Some groups have invalid airport codes (like DEF, FAM, VIP). These are auto-generated from group names 
                  and won't work for flight searches.
                </p>
                <p className="text-sm text-amber-700 mb-2">
                  <strong>To fix:</strong> Click on each airport code badge (e.g., <code className="bg-amber-100 px-2 py-0.5 rounded">DEF</code>) 
                  to edit it to a valid 3-letter code.
                </p>
                <p className="text-sm text-amber-700">
                  <strong>Examples:</strong> DEL (Delhi), BOM (Mumbai), BLR (Bangalore), CCU (Kolkata), MAA (Chennai)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner - No Location Groups */}
        {(!configuration.locationGroups || configuration.locationGroups.length === 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Guest Departure Cities Required</h3>
                <p className="text-sm text-blue-700 mb-3">
                  To configure flights, each guest needs a departure city assigned. 
                  Go to Guest Management and assign a departure city (e.g., Mumbai (BOM), Delhi (DEL)) for each guest. 
                  Then re-initialize the flight configuration.
                </p>
                <button
                  onClick={() => navigate(`/microsite/${slug}/guests`)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Go to Guest Management
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Publication Status Banner */}
        {configuration && (
          <div className="mt-6">
            {configuration.isPublished ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">
                      ✅ Flight Configuration Published
                    </h3>
                    <p className="text-sm text-green-800 mb-3">
                      Guests can now view and book their assigned flights from the microsite.
                      You can continue to make changes - remember to publish again after updates.
                    </p>
                    <button
                      onClick={publishConfiguration}
                      disabled={isPublishing}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                      <Globe className="h-5 w-5" />
                      Update & Republish
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-900 mb-2">
                      🔒 Not Published - Guests Cannot See Flights Yet
                    </h3>
                    <p className="text-sm text-amber-800 mb-3">
                      Configure flights for each location group below, then click "Publish Configuration" 
                      to make them available to guests. Guests will receive a 403 error until you publish.
                    </p>
                    
                    {/* Show Unconfigured Groups */}
                    {configuration.locationGroups && configuration.locationGroups.length > 0 && (
                      <div className="mb-4 p-4 bg-white rounded-lg border border-amber-200">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Configuration Status:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {configuration.locationGroups.map((group) => {
                            const isConfigured = getGroupCompletionStatus(group.groupName);
                            return (
                              <div
                                key={group.groupName}
                                className={`flex items-center gap-2 text-sm px-3 py-2 rounded ${
                                  isConfigured
                                    ? 'bg-green-50 text-green-800'
                                    : 'bg-red-50 text-red-800'
                                }`}
                              >
                                {isConfigured ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="font-medium">{group.groupName}</span>
                                {!isConfigured && <span className="text-xs">(needs flights)</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={publishConfiguration}
                        disabled={isPublishing || configuration.stats?.configuredGroups !== configuration.stats?.totalGroups}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-2 shadow-lg"
                      >
                        <Globe className="h-5 w-5" />
                        {isPublishing ? 'Publishing...' : 'Publish Configuration Now'}
                      </button>
                      {configuration.stats?.configuredGroups !== configuration.stats?.totalGroups && (
                        <p className="text-sm text-amber-700 italic">
                          All groups must have flights configured ({configuration.stats?.configuredGroups || 0}/{configuration.stats?.totalGroups || 0} complete)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {configuration.locationGroups?.length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Configured</p>
                <p className="text-2xl font-bold text-green-600">
                  {configuration.stats?.configuredGroups || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Guests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {configuration.stats?.totalGuests || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-2xl font-bold text-primary-600">
                  {Math.round((configuration.stats?.configuredGroups / configuration.stats?.totalGroups) * 100) || 0}%
                </p>
              </div>
              <Settings className="h-8 w-8 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Location Groups */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Departure City Groups</h2>
            <p className="text-xs text-gray-600 mb-4">
              Guests grouped by their departure city. Click a group to search &amp; assign flights.
            </p>
            
            {!configuration.locationGroups || configuration.locationGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  No departure city groups found.
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Assign departure cities to guests first, then re-initialize flight configuration.
                </p>
                <button
                  onClick={() => navigate(`/microsite/${slug}/guests`)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Go to Guest Management →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {configuration.locationGroups.map((group) => {
                  const isExpanded = expandedGroups[group.groupName];
                  const isSelected = selectedGroup?.groupName === group.groupName;
                  
                  return (
                    <div
                      key={group.groupName}
                      className={`rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Group Header */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => toggleGroupExpansion(group.groupName)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">{group.groupName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getGroupCompletionStatus(group.groupName) ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-300" />
                            )}
                            <button
                              onClick={() => {
                                setSelectedGroup(group);
                                setSearchResults([]);
                                setSelectedFlights({ arrival: [], departure: [] });
                              }}
                              className={`px-3 py-1 text-xs rounded ${
                                isSelected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Select
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.guestsCount} guests
                          </span>
                          
                          {/* Editable Airport Code */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {editingGroupCode === group.groupName ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={tempAirportCode}
                                  onChange={(e) => setTempAirportCode(e.target.value.toUpperCase())}
                                  onBlur={() => {
                                    if (tempAirportCode && tempAirportCode !== group.origin) {
                                      updateGroupAirportCode(group.groupName, tempAirportCode);
                                    } else {
                                      setEditingGroupCode(null);
                                    }
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      if (tempAirportCode && tempAirportCode !== group.origin) {
                                        updateGroupAirportCode(group.groupName, tempAirportCode);
                                      } else {
                                        setEditingGroupCode(null);
                                      }
                                    }
                                  }}
                                  maxLength={3}
                                  className="w-16 px-2 py-1 text-xs font-mono border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  autoFocus
                                  placeholder="DEL"
                                />
                                <Check 
                                  className="h-3 w-3 text-green-600 cursor-pointer" 
                                  onClick={() => {
                                    if (tempAirportCode && tempAirportCode !== group.origin) {
                                      updateGroupAirportCode(group.groupName, tempAirportCode);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span 
                                className="font-mono text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => {
                                  setEditingGroupCode(group.groupName);
                                  setTempAirportCode(group.origin);
                                }}
                                title="Click to edit airport code"
                              >
                                {group.origin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Guest List */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-white">
                          <div className="p-3 max-h-64 overflow-y-auto">
                            <div className="space-y-2">
                              {group.guests?.map((guest) => {
                                const status = getGuestFlightStatus(group.groupName, guest.email);
                                return (
                                  <div
                                    key={guest.email}
                                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-gray-900 text-sm">{guest.name}</p>
                                          {guest.group && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                              {guest.group}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">{guest.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          {status.hasArrival && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                              <UserCheck className="h-3 w-3" />
                                              Arrival
                                            </span>
                                          )}
                                          {status.hasDeparture && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                              <UserCheck className="h-3 w-3" />
                                              Departure
                                            </span>
                                          )}
                                          {!status.hasArrival && !status.hasDeparture && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                              <UserX className="h-3 w-3" />
                                              Not configured
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleMoveGuest(guest, group.groupName)}
                                        className="ml-2 p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                        title="Move to another group"
                                      >
                                        <MoveRight className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Flight Search & Selection */}
        <div className="lg:col-span-2">
          {!selectedGroup ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Plane className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a Location Group
              </h3>
              <p className="text-gray-600">
                Choose a location group from the left to configure flight options
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Journey Type Toggle */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Configure Flights for {selectedGroup.groupName}
                </h3>
                
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => {
                      setCurrentJourneyType('arrival');
                      setSearchResults([]);
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      currentJourneyType === 'arrival'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold">Arrival Flights</p>
                      <p className="text-sm mt-1">
                        {selectedGroup.origin} → {configuration.eventLocation?.airportCode}
                      </p>
                      <p className="text-xs mt-1 text-gray-600">
                        {selectedFlights.arrival.length} selected
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentJourneyType('departure');
                      setSearchResults([]);
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      currentJourneyType === 'departure'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-semibold">Departure Flights</p>
                      <p className="text-sm mt-1">
                        {configuration.eventLocation?.airportCode} → {selectedGroup.origin}
                      </p>
                      <p className="text-xs mt-1 text-gray-600">
                        {selectedFlights.departure.length} selected
                      </p>
                    </div>
                  </button>
                </div>

                {/* Missing Airport Code Warning */}
                {!configuration.eventLocation?.airportCode && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 mb-1">Event Airport Code Missing</h4>
                        <p className="text-sm text-amber-700 mb-2">
                          The event location needs an airport code to search for flights.
                        </p>
                        <p className="text-sm text-amber-700 mb-3">
                          <strong>Event Location:</strong> {event?.location?.city}, {event?.location?.country}
                        </p>
                        <p className="text-sm text-amber-700">
                          Please update the event with the nearest airport code (e.g., DEL for Delhi, BOM for Mumbai).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flight Route Info */}
                {configuration.eventLocation?.airportCode && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">
                          {currentJourneyType === 'arrival' ? 'From' : 'Destination'}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{selectedGroup.city || selectedGroup.groupName}</p>
                        <p className="text-sm text-gray-600">({selectedGroup.origin})</p>
                      </div>
                      <div className="text-2xl text-primary-600">
                        {currentJourneyType === 'arrival' ? '→' : '←'}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">
                          {currentJourneyType === 'arrival' ? 'To' : 'From'}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{event?.location?.city}</p>
                        <p className="text-sm text-gray-600">({configuration.eventLocation?.airportCode})</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Controls */}
                <div className="flex gap-4 mt-4">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={currentJourneyType === 'arrival' 
                      ? new Date(configuration.searchWindow?.arrivalSearchStart).toISOString().split('T')[0]
                      : new Date(configuration.searchWindow?.departureSearchStart).toISOString().split('T')[0]
                    }
                    max={currentJourneyType === 'arrival'
                      ? new Date(configuration.searchWindow?.arrivalSearchEnd).toISOString().split('T')[0]
                      : new Date(configuration.searchWindow?.departureSearchEnd).toISOString().split('T')[0]
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={searchFlights}
                    disabled={searchLoading || !selectedDate || !configuration.eventLocation?.airportCode}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={!configuration.eventLocation?.airportCode ? 'Event airport code required' : ''}
                  >
                    {searchLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                    Search Flights
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900">
                      Available Flights ({searchResults.length})
                    </h4>
                    <span className="text-sm text-gray-600">
                      Select up to 5 options for guests
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {searchResults.map((flight, index) => (
                      <div
                        key={index}
                        onClick={() => toggleFlightSelection(flight)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isFlightSelected(flight)
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {flight.airline}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {flight.airlineCode} {flight.flightNumber}
                                </p>
                              </div>
                              {flight.stops === 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Non-stop
                                </span>
                              )}
                              {flight.refundable && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  Refundable
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <p className="text-gray-600">Depart</p>
                                <p className="font-semibold">{formatTime(flight.departureTime)}</p>
                                <p className="text-xs text-gray-500">{flight.origin}</p>
                              </div>
                              <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                  <Clock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                  <p className="text-xs text-gray-600">{formatDuration(flight.duration)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-600">Arrive</p>
                                <p className="font-semibold">{formatTime(flight.arrivalTime)}</p>
                                <p className="text-xs text-gray-500">{flight.destination}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-6 text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              ₹{flight.totalFare?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">per person</p>
                            {isFlightSelected(flight) && (
                              <Check className="h-6 w-6 text-primary-600 ml-auto mt-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              {(selectedFlights.arrival.length > 0 || selectedFlights.departure.length > 0) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Selected: {selectedFlights.arrival.length} arrival, {selectedFlights.departure.length} departure flights
                      </p>
                    </div>
                    <button
                      onClick={saveFlightSelections}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check className="h-5 w-5" />
                      Save Flight Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Move Guest Modal */}
      {showMoveModal && guestToMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Move Guest to Another Group</h3>
              <p className="text-sm text-gray-600 mt-1">
                Moving: <strong>{guestToMove.guest.name}</strong> from <strong>{guestToMove.fromGroup}</strong>
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Select destination group:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {configuration.locationGroups
                  .filter(g => g.groupName !== guestToMove.fromGroup)
                  .map(group => (
                    <button
                      key={group.groupName}
                      onClick={() => executeMoveGuest(group.groupName)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{group.groupName}</p>
                          <p className="text-xs text-gray-600">
                            {group.guestsCount} guests • Airport: {group.origin}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setGuestToMove(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MicrositeDashboardLayout>
  );
};

export default MicrositeFlightManagement;
