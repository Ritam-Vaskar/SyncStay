import React, { useState } from 'react';
import { Hotel, Plane } from 'lucide-react';

export const PlannerBookingsTabs = ({ activeTab, setActiveTab, hotelStats, flightStats }) => {
  return (
    <div className="card mb-6">
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('hotels')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative ${
            activeTab === 'hotels'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Hotel className="h-5 w-5" />
          <span>Hotel Bookings</span>
          {hotelStats && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
              {hotelStats.total}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('flights')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all relative ${
            activeTab === 'flights'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plane className="h-5 w-5" />
          <span>Flight Bookings</span>
          {flightStats && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
              {flightStats.total}
            </span>
          )}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50">
        {activeTab === 'hotels' && hotelStats && (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{hotelStats.pending || 0}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{hotelStats.confirmed || 0}</p>
              <p className="text-xs text-gray-600">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{hotelStats.rejected || 0}</p>
              <p className="text-xs text-gray-600">Rejected</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600">{hotelStats.revenue}</p>
              <p className="text-xs text-gray-600">Total Revenue</p>
            </div>
          </>
        )}

        {activeTab === 'flights' && flightStats && (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{flightStats.pending || 0}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{flightStats.ticketed || 0}</p>
              <p className="text-xs text-gray-600">Ticketed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{flightStats.cancelled || 0}</p>
              <p className="text-xs text-gray-600">Cancelled</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600">{flightStats.revenue}</p>
              <p className="text-xs text-gray-600">Total Revenue</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
