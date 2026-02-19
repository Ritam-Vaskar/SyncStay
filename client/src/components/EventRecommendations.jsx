import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  Sparkles,
  Heart,
  Eye,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const EventRecommendations = () => {
  const { isAuthenticated, token } = useAuthStore();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedEvents, setBookmarkedEvents] = useState(new Set());
  const [isColdStart, setIsColdStart] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    if (isAuthenticated && token) {
      fetchBookmarks();
    }
  }, [isAuthenticated, token]);

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/activity/history?type=bookmark');
      const bookmarkIds = response.data.data.map(activity => activity.entityId._id || activity.entityId);
      setBookmarkedEvents(new Set(bookmarkIds));
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated && token) {
        // Authenticated user - get personalized recommendations
        const response = await api.get('/recommendations/user?limit=6');
        console.log('Raw recommendations response:', response);
        
        // API returns: { success, data: [events], coldStart }
        const eventList = response.data || [];
        console.log('Parsed event list:', eventList);
        
        // Transform events to recommendation format if they're plain event objects
        const formattedRecommendations = eventList.map(item => {
          // Check if already in recommendation format {event, score, reason}
          if (item.event) {
            return item;
          }
          // Otherwise it's a plain event object, wrap it
          return {
            event: item,
            score: item.recommendationScore || 0,
            reason: item.breakdown?.trending ? 'Trending now' : 'Recommended'
          };
        });
        
        setRecommendations(formattedRecommendations);
        setIsColdStart(response.coldStart || false);
      } else {
        // Guest user - show trending/active events
        const response = await api.get('/events?status=active&limit=6');
        console.log('Raw events response:', response);
        
        const events = response.data || [];
        console.log('Parsed events:', events);
        
        // Transform to match recommendation format
        setRecommendations(events.map(event => ({
          event,
          score: 0,
          reason: 'Popular event'
        })));
        setIsColdStart(true);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      console.error('Error details:', error.response?.data);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (eventId) => {
    if (!isAuthenticated || !token) return;
    
    try {
      await api.post('/activity/view', { entityId: eventId });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleBookmark = async (eventId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please login to bookmark events');
      return;
    }

    try {
      const isBookmarked = bookmarkedEvents.has(eventId);
      
      // Optimistically update UI
      setBookmarkedEvents(prev => {
        const updated = new Set(prev);
        if (isBookmarked) {
          updated.delete(eventId);
        } else {
          updated.add(eventId);
        }
        return updated;
      });

      // Track bookmark activity
      await api.post('/activity/bookmark', { entityId: eventId });
      
    } catch (error) {
      console.error('Failed to bookmark:', error);
      // Revert on error
      setBookmarkedEvents(prev => {
        const updated = new Set(prev);
        if (updated.has(eventId)) {
          updated.delete(eventId);
        } else {
          updated.add(eventId);
        }
        return updated;
      });
    }
  };

  const handleEventClick = (eventId) => {
    trackView(eventId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-primary-50 via-purple-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0 && !loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-primary-50 via-purple-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Available</h3>
            <p className="text-gray-600">Check back soon for exciting events!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-primary-50 via-purple-50 to-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-700">
              {isColdStart ? '🔥 Trending Events' : '✨ Personalized For You'}
            </span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {isColdStart ? 'Popular Events Right Now' : 'Recommended Just For You'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isColdStart 
              ? 'Start exploring these trending events. View and bookmark events to get personalized recommendations!'
              : 'Based on your interests and activity, here are events you might love'
            }
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {recommendations.filter(item => item && item.event).map(({ event, score, reason }) => (
            <Link
              key={event._id}
              to={`/microsite/${event.micrositeConfig?.customSlug || event._id}`}
              onClick={() => handleEventClick(event._id)}
              className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Event Image */}
              <div className="relative h-48 bg-gradient-to-br from-primary-400 to-purple-600 overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute top-4 left-4 flex gap-2">
                  {isAuthenticated && score > 0.8 && (
                    <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Best Match
                    </span>
                  )}
                  {event.status === 'active' && (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => handleBookmark(event._id, e)}
                    className={`p-2 rounded-full transition-all ${
                      bookmarkedEvents.has(event._id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/90 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Heart 
                      className="h-5 w-5" 
                      fill={bookmarkedEvents.has(event._id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="h-20 w-20 text-white/30" />
                </div>
              </div>

              {/* Event Details */}
              <div className="p-6">
                {/* Event Type Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full capitalize">
                    {event.type || 'Event'}
                  </span>
                  {!isColdStart && reason && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {reason}
                    </span>
                  )}
                  {isColdStart && (
                    <span className="text-xs text-orange-600 flex items-center gap-1 font-semibold">
                      🔥 Trending
                    </span>
                  )}
                </div>

                {/* Event Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {event.name}
                </h3>

                {/* Event Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    <span className="text-sm">
                      {event.location?.city || 'Location TBD'}, {event.location?.country || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-primary-600" />
                    <span className="text-sm">
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4 text-primary-600" />
                    <span className="text-sm">{event.attendees || 0} attendees</span>
                  </div>
                </div>

                {/* Match Score (only for personalized recommendations) */}
                {!isColdStart && score > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Match Score</span>
                      <span className="font-semibold">{Math.round(score * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${score * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Call to Action for Cold Start */}
                {isColdStart && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-orange-800">
                      💡 <strong>Pro tip:</strong> View and bookmark events to get personalized recommendations!
                    </p>
                  </div>
                )}

                {/* View Details Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm font-semibold text-primary-600 flex items-center gap-2 group-hover:gap-3 transition-all">
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  {event.viewCount > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {event.viewCount} views
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link 
            to="/events" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Browse All Events
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
