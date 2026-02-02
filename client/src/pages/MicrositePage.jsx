import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, inventoryService, bookingService } from '@/services/apiServices';
import { LoadingPage } from '@/components/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Calendar, MapPin, Users, Hotel, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const MicrositePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['microsite-inventory', eventData?.data?._id],
    queryFn: () => inventoryService.getAvailable(eventData.data._id),
    enabled: !!eventData?.data?._id,
  });

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

  const handleBookNow = (item) => {
    setSelectedInventory(item);
    setShowBookingForm(true);
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
          onClose={() => {
            setShowBookingForm(false);
            setSelectedInventory(null);
          }}
        />
      )}
    </div>
  );
};

const BookingModal = ({ inventory, event, onClose }) => {
  const [formData, setFormData] = useState({
    numberOfRooms: 1,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
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
