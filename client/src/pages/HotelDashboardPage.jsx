import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  IndianRupee, 
  Users, 
  Hotel,
  TrendingUp,
  CheckCircle,
  Clock,
  Bed
} from 'lucide-react';
import { bookingService, inventoryService } from '@/services/apiServices';
import { Link } from 'react-router-dom';

export const HotelDashboardPage = () => {
  const { data: bookingsData } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: () => bookingService.getAll(),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['hotel-inventory'],
    queryFn: () => inventoryService.getAll(),
  });

  const bookings = bookingsData?.data || [];
  const inventory = inventoryData?.data || [];

  // Calculate metrics
  const stats = {
    totalBookings: bookings.length,
    pendingCheckIn: bookings.filter(b => b.status === 'confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'checked-in').length,
    totalRevenue: bookings
      .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0),
    totalRooms: inventory.reduce((sum, i) => sum + i.totalRooms, 0),
    availableRooms: inventory.reduce((sum, i) => sum + i.availableRooms, 0),
    occupancyRate: 0
  };

  stats.occupancyRate = stats.totalRooms > 0 
    ? ((stats.totalRooms - stats.availableRooms) / stats.totalRooms * 100).toFixed(1) 
    : 0;

  // Recent bookings
  const recentBookings = bookings
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Today's check-ins
  const today = new Date().toDateString();
  const todayCheckIns = bookings.filter(b => {
    const checkInDate = new Date(b.checkInDate).toDateString();
    return checkInDate === today && b.status === 'confirmed';
  });

  // Today's check-outs
  const todayCheckOuts = bookings.filter(b => {
    const checkOutDate = new Date(b.checkOutDate).toDateString();
    return checkOutDate === today && b.status === 'checked-in';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hotel Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your hotel operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBookings}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.checkedIn} currently checked in</p>
            </div>
            <Calendar className="h-12 w-12 text-primary-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">From all bookings</p>
            </div>
            <IndianRupee className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.occupancyRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalRooms - stats.availableRooms}/{stats.totalRooms} rooms occupied</p>
            </div>
            <Bed className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Rooms</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.availableRooms}</p>
              <p className="text-xs text-gray-500 mt-1">Out of {stats.totalRooms} total</p>
            </div>
            <Hotel className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Today's Activities */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Check-Ins */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Today's Check-Ins</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {todayCheckIns.length}
            </span>
          </div>
          <div className="space-y-3">
            {todayCheckIns.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No check-ins scheduled for today</p>
            ) : (
              todayCheckIns.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-600">{booking.inventory?.roomType} - {booking.numberOfRooms} room(s)</p>
                  </div>
                  <Link
                    to="/hotel/bookings"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Process
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Check-Outs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Today's Check-Outs</h2>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
              {todayCheckOuts.length}
            </span>
          </div>
          <div className="space-y-3">
            {todayCheckOuts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No check-outs scheduled for today</p>
            ) : (
              todayCheckOuts.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-600">{booking.inventory?.roomType} - {booking.numberOfRooms} room(s)</p>
                  </div>
                  <Link
                    to="/hotel/bookings"
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    Process
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Link
            to="/hotel/bookings"
            className="flex flex-col items-center justify-center p-6 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <Calendar className="h-8 w-8 text-primary-600 mb-2" />
            <span className="font-medium text-gray-900">Manage Bookings</span>
          </Link>

          <Link
            to="/hotel/inventory"
            className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Hotel className="h-8 w-8 text-purple-600 mb-2" />
            <span className="font-medium text-gray-900">Manage Inventory</span>
          </Link>

          <Link
            to="/hotel/rfps"
            className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <span className="font-medium text-gray-900">View RFPs</span>
          </Link>

          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-gray-600 mb-2" />
            <span className="font-medium text-gray-900">Analytics</span>
            <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
          <Link to="/hotel/bookings" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-500">{booking.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {booking.inventory?.roomType} ({booking.numberOfRooms})
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(booking.checkInDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(booking.checkOutDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status.replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
