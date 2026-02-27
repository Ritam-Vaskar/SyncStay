import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plane, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CreditCard,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';

export const MicrositeFlightBooking = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [assignedFlights, setAssignedFlights] = useState(null);
  const [selectedArrivalFlight, setSelectedArrivalFlight] = useState(null);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState(null);
  const [passengers, setPassengers] = useState([{
    paxId: 1,
    title: 'Mr',
    firstName: '',
    lastName: '',
    gender: 'M',
    dateOfBirth: '',
    passportNo: '',
    passportExpiry: '',
    nationality: 'IN',
    paxType: '1', // 1=Adult
  }]);
  const [bookingStep, setBookingStep] = useState('select'); // 'select', 'passengers', 'review', 'payment'
  const [bookingLoading, setBookingLoading] = useState(false);
  const [myBookings, setMyBookings] = useState([]);

  useEffect(() => {
    fetchEventAndFlights();
    fetchMyBookings();
  }, [slug, user]);

  const fetchEventAndFlights = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await api.get(`/events/microsite/${slug}`);
      setEvent(eventResponse.data);

      if (user?.email) {
        // Fetch assigned flights for this guest
        const flightsResponse = await api.get(
          `/flights/events/${eventResponse.data._id}/assigned?guestEmail=${user.email}`
        );
        setAssignedFlights(flightsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 404) {
        toast.error('No flight options available yet. Please check back later.');
      } else {
        toast.error('Failed to load flight information');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    if (!user?.email || !event) return;
    
    try {
      const response = await api.get(
        `/flights/events/${event._id}/bookings?guestEmail=${user.email}`
      );
      setMyBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const addPassenger = () => {
    if (passengers.length >= 9) {
      toast.error('Maximum 9 passengers allowed');
      return;
    }
    setPassengers([
      ...passengers,
      {
        paxId: passengers.length + 1,
        title: 'Mr',
        firstName: '',
        lastName: '',
        gender: 'M',
        dateOfBirth: '',
        passportNo: '',
        passportExpiry: '',
        nationality: 'IN',
        paxType: '1',
      },
    ]);
  };

  const removePassenger = (index) => {
    if (passengers.length === 1) {
      toast.error('At least one passenger is required');
      return;
    }
    const updated = passengers.filter((_, i) => i !== index);
    setPassengers(updated);
  };

  const updatePassenger = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const validatePassengers = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName || !p.lastName || !p.dateOfBirth) {
        toast.error(`Please fill all required fields for Passenger ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const calculateTotalFare = () => {
    const arrivalFare = selectedArrivalFlight?.fare?.totalFare || 0;
    const departureFare = selectedDepartureFlight?.fare?.totalFare || 0;
    return (arrivalFare + departureFare) * passengers.length;
  };

  const handleBookFlight = async () => {
    if (!validatePassengers()) return;

    try {
      setBookingLoading(true);

      const bookingData = {
        eventId: event._id,
        guestEmail: user.email,
        locationGroup: assignedFlights.locationGroup,
        arrivalFlight: selectedArrivalFlight ? {
          traceId: selectedArrivalFlight.traceId,
          resultIndex: selectedArrivalFlight.resultIndex,
          flightDetails: selectedArrivalFlight.flightDetails,
          fare: selectedArrivalFlight.fare,
        } : null,
        departureFlight: selectedDepartureFlight ? {
          traceId: selectedDepartureFlight.traceId,
          resultIndex: selectedDepartureFlight.resultIndex,
          flightDetails: selectedDepartureFlight.flightDetails,
          fare: selectedDepartureFlight.fare,
        } : null,
        passengers,
        guestDetails: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      };

      const response = await api.post('/flights/book', bookingData);
      
      toast.success('Flight booked successfully! Proceeding to payment...');
      
      // TODO: Integrate with Razorpay payment
      // For now, just navigate to bookings
      setTimeout(() => {
        navigate(`/microsite/${slug}/my-flight-bookings`);
      }, 2000);
      
    } catch (error) {
      console.error('Error booking flight:', error);
      toast.error(error.response?.data?.message || 'Failed to book flight');
    } finally {
      setBookingLoading(false);
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
      year: 'numeric',
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <MicrositeDashboardLayout event={event}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MicrositeDashboardLayout>
    );
  }

  if (!assignedFlights) {
    return (
      <MicrositeDashboardLayout event={event}>
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Flights Available</h2>
          <p className="text-gray-600">
            Flight options for this event are not yet configured. Please check back later.
          </p>
        </div>
      </MicrositeDashboardLayout>
    );
  }

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Plane className="h-8 w-8 text-primary-600" />
          Book Your Flights
        </h1>
        <p className="mt-2 text-gray-600">
          Select your preferred flights • {assignedFlights.locationGroup}
        </p>
      </div>

      {/* Booking Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${bookingStep === 'select' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'select' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="font-medium">Select Flights</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${bookingStep === 'passengers' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'passengers' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="font-medium">Passenger Details</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${bookingStep === 'review' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'review' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="font-medium">Review & Pay</span>
          </div>
        </div>
      </div>

      {/* Step 1: Select Flights */}
      {bookingStep === 'select' && (
        <div className="space-y-6">
          {/* Arrival Flights */}
          {assignedFlights.arrivalFlights?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Select Arrival Flight
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {assignedFlights.origin} → {assignedFlights.destination}
              </p>
              
              <div className="space-y-3">
                {assignedFlights.arrivalFlights.map((flight, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedArrivalFlight(flight)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedArrivalFlight?.resultIndex === flight.resultIndex
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="font-semibold text-gray-900">
                            {flight.flightDetails.airline}
                          </p>
                          <span className="text-sm text-gray-600">
                            {flight.flightDetails.airlineCode} {flight.flightDetails.flightNumber}
                          </span>
                          {flight.flightDetails.stops === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Non-stop
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <p className="text-gray-600">Depart</p>
                            <p className="font-semibold">
                              {formatTime(flight.flightDetails.departureTime)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(flight.flightDetails.departureTime)}
                            </p>
                          </div>
                          <div className="flex-1 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-xs text-gray-600">
                              {formatDuration(flight.flightDetails.duration)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">Arrive</p>
                            <p className="font-semibold">
                              {formatTime(flight.flightDetails.arrivalTime)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(flight.flightDetails.arrivalTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{flight.fare.totalFare.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">per person</p>
                        {selectedArrivalFlight?.resultIndex === flight.resultIndex && (
                          <Check className="h-6 w-6 text-primary-600 ml-auto mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Departure Flights */}
          {assignedFlights.departureFlights?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Select Departure Flight
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {assignedFlights.destination} → {assignedFlights.origin}
              </p>
              
              <div className="space-y-3">
                {assignedFlights.departureFlights.map((flight, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedDepartureFlight(flight)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDepartureFlight?.resultIndex === flight.resultIndex
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="font-semibold text-gray-900">
                            {flight.flightDetails.airline}
                          </p>
                          <span className="text-sm text-gray-600">
                            {flight.flightDetails.airlineCode} {flight.flightDetails.flightNumber}
                          </span>
                          {flight.flightDetails.stops === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Non-stop
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <p className="text-gray-600">Depart</p>
                            <p className="font-semibold">
                              {formatTime(flight.flightDetails.departureTime)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(flight.flightDetails.departureTime)}
                            </p>
                          </div>
                          <div className="flex-1 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-xs text-gray-600">
                              {formatDuration(flight.flightDetails.duration)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">Arrive</p>
                            <p className="font-semibold">
                              {formatTime(flight.flightDetails.arrivalTime)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(flight.flightDetails.arrivalTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{flight.fare.totalFare.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">per person</p>
                        {selectedDepartureFlight?.resultIndex === flight.resultIndex && (
                          <Check className="h-6 w-6 text-primary-600 ml-auto mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedArrivalFlight && selectedDepartureFlight
                    ? 'Both flights selected'
                    : selectedArrivalFlight || selectedDepartureFlight
                    ? 'One flight selected'
                    : 'No flights selected'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!selectedArrivalFlight && !selectedDepartureFlight) {
                    toast.error('Please select at least one flight');
                    return;
                  }
                  setBookingStep('passengers');
                }}
                disabled={!selectedArrivalFlight && !selectedDepartureFlight}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue to Passenger Details
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Passenger Details */}
      {bookingStep === 'passengers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Passenger Details</h2>
              <button
                onClick={addPassenger}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Add Passenger
              </button>
            </div>

            {passengers.map((passenger, index) => (
              <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Passenger {index + 1}</h3>
                  {passengers.length > 1 && (
                    <button
                      onClick={() => removePassenger(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={passenger.title}
                    onChange={(e) => updatePassenger(index, 'title', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                  </select>
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={passenger.firstName}
                    onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={passenger.lastName}
                    onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <select
                    value={passenger.gender}
                    onChange={(e) => updatePassenger(index, 'gender', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                  <input
                    type="date"
                    placeholder="Date of Birth *"
                    value={passenger.dateOfBirth}
                    onChange={(e) => updatePassenger(index, 'dateOfBirth', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Passport No (Optional)"
                    value={passenger.passportNo}
                    onChange={(e) => updatePassenger(index, 'passportNo', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between">
            <button
              onClick={() => setBookingStep('select')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (validatePassengers()) {
                  setBookingStep('review');
                }
              }}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              Continue to Review
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Pay */}
      {bookingStep === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review Booking</h2>

            {/* Flight Summary */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Selected Flights</h3>
              {selectedArrivalFlight && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Arrival: {selectedArrivalFlight.flightDetails.airline}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedArrivalFlight.flightDetails.departureTime)} •{' '}
                    ₹{selectedArrivalFlight.fare.totalFare.toLocaleString()} per person
                  </p>
                </div>
              )}
              {selectedDepartureFlight && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Departure: {selectedDepartureFlight.flightDetails.airline}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedDepartureFlight.flightDetails.departureTime)} •{' '}
                    ₹{selectedDepartureFlight.fare.totalFare.toLocaleString()} per person
                  </p>
                </div>
              )}
            </div>

            {/* Passenger Summary */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Passengers ({passengers.length})</h3>
              {passengers.map((p, i) => (
                <p key={i} className="text-sm text-gray-600">
                  {p.title} {p.firstName} {p.lastName}
                </p>
              ))}
            </div>

            {/* Pricing */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Fare</span>
                <span className="font-semibold">₹{calculateTotalFare().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary-600">₹{calculateTotalFare().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between">
            <button
              onClick={() => setBookingStep('passengers')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleBookFlight}
              disabled={bookingLoading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Confirm & Pay
                </>
              )}
            </button>
          </div>
        </div>
      )}    </div>
    </MicrositeDashboardLayout>
  );
};

export default MicrositeFlightBooking;
