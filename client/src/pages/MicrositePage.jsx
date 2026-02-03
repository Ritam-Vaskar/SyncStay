import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, inventoryService, bookingService, authService } from '@/services/apiServices';
import { guestInvitationService } from '@/services/guestInvitationService';
import { LoadingPage } from '@/components/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Calendar, MapPin, Users, Hotel, Check, X, LogIn, UserPlus, LogOut, LayoutDashboard, Lock, Mail } from 'lucide-react';
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

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['microsite-inventory', eventData?.data?._id],
    queryFn: () => inventoryService.getAvailable(eventData.data._id),
    enabled: !!eventData?.data?._id,
  });

  // Check access for private events
  useEffect(() => {
    const checkAccess = async () => {
      if (eventData?.data) {
        const event = eventData.data;
        
        // Public events - grant access immediately
        if (!event.isPrivate) {
          setHasAccess(true);
          return;
        }

        // Wait a bit for Zustand to hydrate from localStorage on fresh page load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-check authentication state after hydration
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const isUserAuthenticated = isAuthenticated || (token && savedUser);
        const currentUser = user || (savedUser ? JSON.parse(savedUser) : null);

        // Planners always have access to their own events
        if (isUserAuthenticated && currentUser?.role === 'planner') {
          setHasAccess(true);
          return;
        }

        // Admins always have access
        if (isUserAuthenticated && currentUser?.role === 'admin') {
          setHasAccess(true);
          return;
        }

        // Private events - check if guest is invited
        if (isUserAuthenticated && currentUser?.email) {
          try {
            const response = await guestInvitationService.verifyGuestAccess(slug, currentUser.email);
            if (response.data.hasAccess) {
              setHasAccess(true);
              localStorage.setItem(`access_${slug}`, currentUser.email);
            } else {
              setHasAccess(false);
              setShowAccessModal(true);
            }
          } catch (error) {
            setHasAccess(false);
            setShowAccessModal(true);
          }
        } else {
          // Not authenticated - check if previously verified
          const savedEmail = localStorage.getItem(`access_${slug}`);
          if (savedEmail) {
            setAccessEmail(savedEmail);
            try {
              const response = await guestInvitationService.verifyGuestAccess(slug, savedEmail);
              setHasAccess(response.data.hasAccess);
              if (!response.data.hasAccess) {
                setShowAccessModal(true);
              }
            } catch (error) {
              setHasAccess(false);
              setShowAccessModal(true);
            }
          } else {
            setShowAccessModal(true);
          }
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
  const inventory = inventoryData?.data || [];
  const theme = event.micrositeConfig?.theme || {};

  // Show loading while checking access for private events
  if (event.isPrivate && hasAccess === null) {
    return <LoadingPage />;
  }

  // Block content if private event and access denied
  if (event.isPrivate && hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {showAccessModal && hasAccess === false && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Private Event</h2>
                <p className="text-gray-600">
                  This is a private event. Please enter your email to verify your invitation.
                </p>
              </div>

              <form onSubmit={handleAccessVerification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="input pl-10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  Verify Access
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Only guests invited by the event planner can access this microsite.
                  If you believe this is an error, please contact the event organizer.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show loading while checking access for private events
  if (event.isPrivate && hasAccess === null) {
    return <LoadingPage />;
  }

  const handleBookNow = (item) => {
    if (!isAuthenticated) {
      toast.error('Please login to book');
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setSelectedInventory(item);
    setShowBookingForm(true);
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
          
          {inventory.length === 0 ? (
            <div className="card text-center py-12">
              <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inventory Available</h3>
              <p className="text-gray-600">Rooms will be available soon. Please check back later.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <div key={item._id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{item.hotelName}</h3>
                    {item.status === 'locked' && (
                      <span className="badge badge-info">Reserved for Event</span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Room Type</p>
                      <p className="font-semibold">{item.roomType}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Available</p>
                        <p className="font-semibold text-green-600">{item.availableRooms} / {item.totalRooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Price/Night</p>
                        <p className="font-semibold">{formatCurrency(item.pricePerNight)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Inclusions</p>
                      <div className="flex flex-wrap gap-1">
                        {item.inclusions?.map((inc, idx) => (
                          <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {inc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Check-in</p>
                        <p className="font-medium">{formatDate(item.checkInDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Check-out</p>
                        <p className="font-medium">{formatDate(item.checkOutDate)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBookNow(item)}
                      disabled={item.availableRooms === 0}
                      className="btn btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.availableRooms === 0 ? 'Sold Out' : 'Book Now'}
                    </button>
                  </div>
                </div>
              ))}
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

const BookingModal = ({ inventory, event, user, onClose }) => {
  const [formData, setFormData] = useState({
    numberOfRooms: 1,
    guestName: user?.name || '',
    guestEmail: user?.email || '',
    guestPhone: user?.phone || '',
    specialRequests: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const bookingData = {
        event: event._id,
        inventory: inventory._id,
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
        specialRequests: formData.specialRequests,
      };

      await bookingService.create(bookingData);
      toast.success('Booking created successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = inventory.pricePerNight * formData.numberOfRooms * 
    Math.ceil((new Date(inventory.checkOutDate) - new Date(inventory.checkInDate)) / (1000 * 60 * 60 * 24));

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
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.guestEmail}
                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                className="input"
                required
              />
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

            <div className="card bg-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-primary-600">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
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
