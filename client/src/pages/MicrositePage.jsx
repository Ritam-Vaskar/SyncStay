import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, inventoryService, bookingService, authService } from '@/services/apiServices';
import { guestInvitationService } from '@/services/guestInvitationService';
import { hotelProposalService } from '@/services/hotelProposalService';
import { LoadingPage } from '@/components/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Calendar, MapPin, Users, Hotel, Check, X, LogIn, UserPlus, LogOut, LayoutDashboard, Lock, Mail, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export const MicrositePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [hasAccess, setHasAccess] = useState(null); // null = not checked, true = has access, false = denied
  const [isInvitedGuest, setIsInvitedGuest] = useState(false); // tracks if current user is invited

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  // Fetch selected hotel proposals for active events
  const { data: proposalsData, refetch: refetchProposals } = useQuery({
    queryKey: ['microsite-hotels', slug],
    queryFn: () => hotelProposalService.getSelectedForMicrosite(slug),
    enabled: !!slug,
    refetchInterval: 30000, // Refetch every 30 seconds to show updated availability
  });

  // Check access for private events - simplified to allow viewing for everyone
  useEffect(() => {
    const checkAccess = async () => {
      if (eventData?.data) {
        const event = eventData.data;
        
        // Public events - everyone can view and book (after login)
        if (!event.isPrivate) {
          setHasAccess(true);
          return;
        }

        // Private events - everyone can VIEW the microsite, but only invited guests can BOOK
        // Planners and admins always have full access
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const currentUser = user || (savedUser ? JSON.parse(savedUser) : null);

        // Check if current user is the event planner (compare IDs)
        if (currentUser?.role === 'planner' && event.planner?._id === currentUser.id) {
          setHasAccess(true);
          return;
        }

        // Admins always have access
        if (currentUser?.role === 'admin') {
          setHasAccess(true);
          return;
        }

        // For private events, allow viewing but we'll check booking permission at booking time
        // Also pre-check if current user is an invited guest so we can show proper UI
        setHasAccess(true);

        if (currentUser?.email) {
          try {
            const response = await guestInvitationService.verifyGuestAccess(slug, currentUser.email);
            setIsInvitedGuest(response.hasAccess === true);
          } catch {
            setIsInvitedGuest(false);
          }
        } else {
          setIsInvitedGuest(false);
        }
      }
    };

    if (!eventLoading && eventData?.data) {
      checkAccess();
    }
  }, [eventData, eventLoading, slug, isAuthenticated, user]);

  const handleAccessVerification = async (e) => {
    e.preventDefault();
    try {
      const response = await guestInvitationService.verifyGuestAccess(slug, accessEmail);
      if (response.data.hasAccess) {
        setHasAccess(true);
        setShowAccessModal(false);
        localStorage.setItem(`access_${slug}`, accessEmail);
        toast.success(`Welcome, ${response.data.guestInfo.name}!`);
      } else {
        toast.error('You are not invited to this private event');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Access denied');
    }
  };

  if (eventLoading) return <LoadingPage />;

  if (!eventData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-8">The event microsite you're looking for doesn't exist or isn't published yet.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const event = eventData.data;
  const hotels = proposalsData?.data || [];
  const theme = event.micrositeConfig?.theme || {};

  // Note: We removed the blocking access check for private events
  // Everyone can VIEW the microsite, but only invited guests can BOOK rooms
  // The booking permission is checked in handleBookNow function

  const handleBookNow = async (item) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to book a room');
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    console.log('🔍 BOOKING ACCESS CHECK:');
    console.log('   User Details:', {
      email: user?.email,
      name: user?.name,
      role: user?.role,
      id: user?.id
    });
    console.log('   Event Details:', {
      name: event.name,
      isPrivate: event.isPrivate,
      plannerId: event.planner?._id,
      slug: slug
    });

    // For private events, verify guest access before allowing booking
    if (event.isPrivate) {
      console.log('   ✓ Private event - checking access...');
      
      // Planners and admins can always book
      if (user?.role === 'planner' && event.planner?._id === user.id) {
        console.log('   ✅ Access granted: User is the planner');
        setSelectedInventory(item);
        setShowBookingForm(true);
        return;
      }

      if (user?.role === 'admin') {
        console.log('   ✅ Access granted: User is admin');
        setSelectedInventory(item);
        setShowBookingForm(true);
        return;
      }

      // For other users, check if they're invited
      console.log('   → Verifying guest invitation for email:', user.email);
      try {
        const response = await guestInvitationService.verifyGuestAccess(slug, user.email);
        console.log('   → Verification response:', response);
        
        if (response.hasAccess) {
          console.log('   ✅ Access granted: Guest is invited');
          toast.success(`Welcome, ${response.guestInfo.name}!`);
          setSelectedInventory(item);
          setShowBookingForm(true);
        } else {
          console.log('   ❌ Access denied: Guest not invited');
          toast.error('This is a private event. Only invited guests can book rooms.');
        }
      } catch (error) {
        console.error('   ❌ Verification error:', error);
        toast.error('You are not invited to this private event');
      }
    } else {
      console.log('   ✓ Public event - access granted');
      // Public event - allow booking for any authenticated user
      setSelectedInventory(item);
      setShowBookingForm(true);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with branding */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: theme.bannerImage 
            ? `url(${theme.bannerImage})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Auth Header Bar */}
        <div className="absolute top-0 right-0 p-4 z-10">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
                </div>
                <Link
                  to={`/microsite/${slug}/dashboard`}
                  className="btn btn-sm bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Event Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-sm bg-white text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="btn btn-sm bg-white text-gray-700 hover:bg-gray-100 flex items-center gap-2 shadow-lg"
              >
                <LogIn className="h-4 w-4" />
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                className="btn btn-sm bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-2 shadow-lg"
              >
                <UserPlus className="h-4 w-4" />
                Register
              </button>
            </div>
          )}
        </div>
        
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center">
          {theme.logo && (
            <img src={theme.logo} alt="Logo" className="h-16 mb-4" />
          )}
          <h1 className="text-5xl font-bold text-white mb-4">{event.name}</h1>
          <p className="text-xl text-white/90 max-w-2xl">{event.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Private Event Notice - Show for private events */}
        {event.isPrivate && (
          <div className="card mb-8 bg-purple-50 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Lock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Private Event</h3>
                <p className="text-purple-800 mb-2">
                  This is a private event. You can view the available hotels and rooms, but only invited guests can book accommodations.
                </p>
                <p className="text-sm text-purple-700">
                  {isAuthenticated 
                    ? '✓ You are logged in. Click "Book Now" to check if you have access.' 
                    : '→ Please login with your invited email address to book a room.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Event Dates</p>
              <p className="font-semibold">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
            </div>
          </div>

          <div className="card flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <MapPin className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-semibold">{event.location?.city}, {event.location?.country}</p>
              {event.location?.venue && <p className="text-sm text-gray-600">{event.location.venue}</p>}
            </div>
          </div>

          <div className="card flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected Guests</p>
              <p className="font-semibold">{event.expectedGuests} attendees</p>
            </div>
          </div>
        </div>

        {/* Important Dates */}
        <div className="card mb-12 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Booking Deadline</p>
              <p className="text-amber-700">{formatDate(event.bookingDeadline)} - Book before this date!</p>
            </div>
          </div>
        </div>

        {/* Available Hotels/Inventory */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Available Hotels & Rooms</h2>
          
          {/* Private event notice for non-invited users */}
          {event.isPrivate && isAuthenticated && !isInvitedGuest && user?.role !== 'admin' && event.planner?._id !== user?.id && (
            <div className="card bg-amber-50 border-2 border-amber-200 mb-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Private Event — Invited Guests Only</p>
                  <p className="text-xs text-amber-700">You can view the hotels and rooms, but only invited guests can make bookings. Contact the event planner if you believe you should have access.</p>
                </div>
              </div>
            </div>
          )}

          {event.isPrivate && !isAuthenticated && (
            <div className="card bg-blue-50 border-2 border-blue-200 mb-6">
              <div className="flex items-center gap-3">
                <LogIn className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Login Required to Book</p>
                  <p className="text-xs text-blue-700">This is a private event. Please login with your invited email address to make bookings.</p>
                </div>
              </div>
            </div>
          )}
          
          {hotels.length === 0 ? (
            <div className="card text-center py-12">
              <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Hotels Available Yet</h3>
              <p className="text-gray-600">
                The event planner is still finalizing hotel selection. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {hotels.map((proposal) => {
                const checkInDate = new Date(event.startDate);
                const checkOutDate = new Date(event.endDate);
                const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

                return (
                  <div key={proposal._id} className="card bg-white shadow-lg">
                    {/* Hotel Header */}
                    <div className="border-b border-gray-200 pb-4 mb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {proposal.hotelName}
                          </h3>
                          {proposal.specialOffer && (
                            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                              <span>⭐</span>
                              <span>{proposal.specialOffer}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Rooms</p>
                          <p className="text-2xl font-bold text-primary-600">
                            {proposal.totalRoomsOffered}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Facilities */}
                    {proposal.facilities && Object.keys(proposal.facilities).some(key => proposal.facilities[key]) && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Hotel Facilities</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(proposal.facilities).map(([key, value]) => 
                            value && (
                              <span key={key} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Room Types */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Available Room Types</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {['singleRoom', 'doubleRoom', 'suite'].map((roomType) => {
                          const room = proposal.pricing[roomType];
                          if (!room || !room.availableRooms || room.availableRooms === 0) return null;

                          const totalPrice = room.pricePerNight * nights;
                          const roomLabel = roomType === 'singleRoom' ? 'Single Room' : 
                                          roomType === 'doubleRoom' ? 'Double Room' : 'Suite';

                          return (
                            <div key={roomType} className="card border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all">
                              <h5 className="font-semibold text-gray-900 mb-3">{roomLabel}</h5>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Available:</span>
                                  <span className={`font-semibold ${
                                    room.availableRooms > 5 ? 'text-green-600' :
                                    room.availableRooms > 2 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {room.availableRooms} room{room.availableRooms !== 1 ? 's' : ''} left
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Per Night:</span>
                                  <span className="font-medium">
                                    {formatCurrency(room.pricePerNight)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Stay ({nights} nights):</span>
                                  <span className="font-semibold text-primary-600">
                                    {formatCurrency(totalPrice)}
                                  </span>
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 mb-3">
                                <p>Check-in: {formatDate(checkInDate)}</p>
                                <p>Check-out: {formatDate(checkOutDate)}</p>
                              </div>

                              <button
                                onClick={() => handleBookNow({
                                  ...proposal,
                                  roomType: roomLabel,
                                  roomKey: roomType,
                                  pricePerNight: room.pricePerNight,
                                  availableRooms: room.availableRooms,
                                  checkInDate: event.startDate,
                                  checkOutDate: event.endDate,
                                })}
                                disabled={room.availableRooms === 0 || (event.isPrivate && isAuthenticated && !isInvitedGuest && user?.role !== 'admin' && event.planner?._id !== user?.id)}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {room.availableRooms === 0 ? 'Sold Out' : 
                                  event.isPrivate && !isAuthenticated ? (
                                    <span className="flex items-center justify-center gap-1">
                                      <Lock className="h-4 w-4" /> Login to Book
                                    </span>
                                  ) : 
                                  event.isPrivate && isAuthenticated && !isInvitedGuest && user?.role !== 'admin' && event.planner?._id !== user?.id ? (
                                    <span className="flex items-center justify-center gap-1">
                                      <Lock className="h-4 w-4" /> Invited Guests Only
                                    </span>
                                  ) : 
                                  event.isPrivate ? 'Book Now (Free)' : 'Book Now'
                                }
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {proposal.notes && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                        <p className="text-sm text-gray-700">{proposal.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Organized By */}
        <div className="card mt-12 bg-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Organized by</p>
              <p className="text-lg font-semibold">{event.planner?.name}</p>
              {event.planner?.organization && (
                <p className="text-gray-600">{event.planner.organization}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Event Type</p>
              <span className="badge badge-info capitalize">{event.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingForm && selectedInventory && (
        <BookingModal
          inventory={selectedInventory}
          event={event}
          user={user}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedInventory(null);
          }}
          onSuccess={() => {
            refetchProposals(); // Refresh availability after booking
          }}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(userData, token) => {
            setAuth(userData, token);
            setShowAuthModal(false);
            toast.success(`${authMode === 'login' ? 'Logged in' : 'Registered'} successfully!`);
          }}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        />
      )}
    </div>
  );
};

const BookingModal = ({ inventory, event, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    numberOfRooms: 1,
    guestName: user?.name || '',
    guestEmail: user?.email || '',
    guestPhone: user?.phone || '',
    specialRequests: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({ message: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    const nights = Math.ceil((new Date(inventory.checkOutDate) - new Date(inventory.checkInDate)) / (1000 * 60 * 60 * 24));
    const totalPrice = inventory.pricePerNight * formData.numberOfRooms * nights;

    try {
      // Prepare booking data
      const bookingData = {
        event: event._id,
        hotelProposal: inventory._id,
        guestDetails: {
          name: formData.guestName,
          email: formData.guestEmail,
          phone: formData.guestPhone,
        },
        roomDetails: {
          hotelName: inventory.hotelName,
          roomType: inventory.roomType,
          numberOfRooms: formData.numberOfRooms,
          checkIn: inventory.checkInDate,
          checkOut: inventory.checkOutDate,
        },
        pricing: {
          pricePerNight: inventory.pricePerNight,
        },
        specialRequests: formData.specialRequests,
      };

      // For PRIVATE events - planner already paid, guests book for FREE
      if (event.isPrivate) {
        console.log('🎫 Private event - Creating FREE booking (planner already paid)');
        setPaymentStatus({ message: 'Creating your booking...', type: 'info' });

        await bookingService.create(bookingData);
        
        setPaymentStatus({ message: 'Booking confirmed!', type: 'success' });
        toast.success('Booking created successfully! No payment required.');
        if (onSuccess) onSuccess();
        setTimeout(() => onClose(), 1500);
        return;
      }

      // For PUBLIC events - guest must pay
      console.log('💳 Public event - Processing payment');
      
      if (!window.Razorpay) {
        toast.error('Payment system not loaded. Please refresh the page.');
        setIsSubmitting(false);
        return;
      }

      setPaymentStatus({ message: 'Initiating payment...', type: 'info' });

      // Create Razorpay order
      const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/payments/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPrice,
          bookingData: bookingData,
          customerEmail: formData.guestEmail,
          customerName: formData.guestName,
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();
      const order = orderData.data;

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'SyncStay',
        description: `${event.name} - ${inventory.hotelName}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            setPaymentStatus({ message: 'Verifying payment...', type: 'info' });

            // Verify payment
            const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/payments/razorpay/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingData: bookingData,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setPaymentStatus({ message: 'Payment successful! Creating booking...', type: 'success' });

              // Now create the booking with payment details
              const finalBookingData = {
                ...bookingData,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                paymentStatus: 'paid',
              };

              await bookingService.create(finalBookingData);
              toast.success('Booking created successfully!');
              if (onSuccess) onSuccess();
              onClose();
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentStatus({ message: error.message || 'Payment verification failed', type: 'error' });
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: formData.guestName,
          email: formData.guestEmail,
          contact: formData.guestPhone,
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setPaymentStatus({ message: 'Payment cancelled', type: 'error' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setPaymentStatus({ message: error.message || 'Failed to initiate payment', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const nights = Math.ceil((new Date(inventory.checkOutDate) - new Date(inventory.checkInDate)) / (1000 * 60 * 60 * 24));
  const totalPrice = inventory.pricePerNight * formData.numberOfRooms * nights;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Complete Your Booking</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="card bg-blue-50 mb-6">
            <h3 className="font-semibold mb-2">{inventory.hotelName}</h3>
            <p className="text-sm text-gray-600">{inventory.roomType}</p>
            <p className="text-lg font-bold text-primary-600 mt-2">{formatCurrency(inventory.pricePerNight)} / night</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rooms</label>
              <input
                type="number"
                min="1"
                max={inventory.availableRooms}
                value={formData.numberOfRooms}
                onChange={(e) => setFormData({ ...formData, numberOfRooms: parseInt(e.target.value) })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.guestName}
                onChange={(e) => !event.isPrivate && setFormData({ ...formData, guestName: e.target.value })}
                className={`input ${event.isPrivate ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={event.isPrivate}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.guestEmail}
                onChange={(e) => !event.isPrivate && setFormData({ ...formData, guestEmail: e.target.value })}
                className={`input ${event.isPrivate ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={event.isPrivate}
                required
              />
              {event.isPrivate && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private event — booking is linked to your registered email
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests (Optional)</label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                className="input"
                rows="3"
              />
            </div>

            {/* Payment Status */}
            {paymentStatus.message && (
              <div className={`card ${
                paymentStatus.type === 'error' ? 'bg-red-50 border-red-200' :
                paymentStatus.type === 'success' ? 'bg-green-50 border-green-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${
                  paymentStatus.type === 'error' ? 'text-red-800' :
                  paymentStatus.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
                }`}>
                  {paymentStatus.message}
                </p>
              </div>
            )}

            {/* Private Event - Free Booking Notice */}
            {event.isPrivate && (
              <div className="card bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">Free Booking - Already Paid</p>
                    <p className="text-xs text-green-700">The event planner has covered all costs. No payment required from you!</p>
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary-600">{formatCurrency(totalPrice)}</span>
                  {event.isPrivate && (
                    <p className="text-xs text-green-600 font-medium">✓ Paid by planner</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2 inline" />
                    Processing...
                  </>
                ) : event.isPrivate ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2 inline" />
                    Confirm Free Booking
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2 inline" />
                    Pay ₹{totalPrice.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>

            {!event.isPrivate && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Secure payment powered by Razorpay</p>
                <div className="flex justify-center gap-2 mt-1 text-xs text-gray-400">
                  <span>UPI</span>
                  <span>•</span>
                  <span>Cards</span>
                  <span>•</span>
                  <span>Net Banking</span>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const AuthModal = ({ mode, onClose, onSuccess, onSwitchMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organization: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      if (mode === 'login') {
        response = await authService.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await authService.register({
          ...formData,
          role: 'guest', // Default role for microsite registrations
        });
      }

      onSuccess(response.data.user, response.data.token);
    } catch (error) {
      toast.error(error.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {mode === 'login' ? 'Login to Book' : 'Create Account'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                minLength="6"
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="input"
                  />
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Login'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={onSwitchMode}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Your account will be synced with the main dashboard. After booking,
              you can manage your bookings from the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
