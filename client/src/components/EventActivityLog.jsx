import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Calendar,
  Edit,
  CheckCircle,
  XCircle,
  Globe,
  Hotel,
  FileText,
  CreditCard,
  UserPlus,
  Upload,
  UserMinus,
  Edit as EditIcon,
  UserCheck,
  Package,
  Lock,
  Unlock,
  Filter,
  Clock,
  Users
} from 'lucide-react';
import { analyticsService } from '@/services/apiServices';
import { formatActivityMessage, getActivityIcon, getActivityColor, formatDistanceDate, formatDate } from '@/utils/helpers';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Icon component mapper
const iconComponents = {
  Calendar,
  Edit,
  CheckCircle,
  XCircle,
  Globe,
  Hotel,
  FileText,
  CreditCard,
  UserPlus,
  Upload,
  UserMinus,
  EditIcon,
  UserCheck,
  Package,
  Lock,
  Unlock,
  Activity,
};

export const EventActivityLog = ({ eventId, initialCollapsed = true }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [actionFilter, setActionFilter] = useState('all');

  // Action filter options
  const filterOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'booking', label: 'Bookings', actions: ['booking_create', 'booking_approve', 'booking_cancel', 'booking_reject'] },
    { value: 'guest', label: 'Guests', actions: ['guest_add', 'guest_upload', 'guest_remove', 'guest_update', 'guest_auto_register', 'guest_invite_login'] },
    { value: 'event', label: 'Event Updates', actions: ['event_create', 'event_update', 'event_approve', 'event_reject', 'event_comment', 'event_comment_reply', 'event_privacy_toggle', 'event_microsite_publish'] }
  ];

  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ['event-activity-logs', eventId],
    queryFn: () => analyticsService.getEventActivityLogs(eventId),
    enabled: !isCollapsed && !!eventId,
    refetchInterval: 30000, // Refetch every 30 seconds when expanded
  });

  const allLogs = logsData?.data || [];

  // Deduplicate logs by _id (safety check)
  const uniqueLogs = React.useMemo(() => {
    const seen = new Set();
    const duplicates = [];
    const unique = [];
    
    allLogs.forEach((log, index) => {
      const id = log._id;
      if (seen.has(id)) {
        duplicates.push({ id, index });
      } else {
        seen.add(id);
        unique.push(log);
      }
    });
    
    if (duplicates.length > 0) {
      console.warn('Found duplicate log IDs:', duplicates);
      console.warn('Original count:', allLogs.length, 'Unique count:', unique.length);
    }
    
    return unique;
  }, [allLogs]);

  // Debug logging
  React.useEffect(() => {
    if (!isCollapsed && logsData) {
      console.log('Activity Logs Response:', logsData);
      console.log('Total logs fetched:', allLogs.length);
      console.log('Unique logs after dedup:', uniqueLogs.length);
      console.log('Event ID:', eventId);
    }
    if (error) {
      console.error('Activity Logs Error:', error);
      console.error('Error message:', error?.response?.data?.message || error?.message || 'Unknown error');
      console.error('Error status:', error?.response?.status);
    }
  }, [logsData, allLogs.length, uniqueLogs.length, eventId, isCollapsed, error]);

  // Client-side filtering based on selected category
  const logs = React.useMemo(() => {
    const filtered = actionFilter === 'all' 
      ? uniqueLogs 
      : uniqueLogs.filter(log => {
          const selectedFilter = filterOptions.find(f => f.value === actionFilter);
          return selectedFilter?.actions?.includes(log.action);
        });
    
    // Final deduplication pass before rendering (in case of any edge cases)
    const finalUnique = Array.from(
      new Map(filtered.map(log => [log._id, log])).values()
    );
    
    if (filtered.length !== finalUnique.length) {
      console.warn('Removed duplicates in final render:', filtered.length - finalUnique.length);
    }
    
    return finalUnique;
  }, [uniqueLogs, actionFilter]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getIconComponent = (action) => {
    const iconName = getActivityIcon(action);
    return iconComponents[iconName] || Activity;
  };

  return (
    <div className="card overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <Activity className="h-5 w-5 text-primary-600" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
            <p className="text-sm text-gray-600">
              {isCollapsed 
                ? 'Click to view event timeline and activities' 
                : `${logs.length} ${logs.length === 1 ? 'activity' : 'activities'} recorded`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && logs.length > 0 && (
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {logs.length}
            </span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-6 w-6 text-gray-400" />
          ) : (
            <ChevronUp className="h-6 w-6 text-gray-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-6">
          {/* Filter Dropdown */}
          <div className="mb-6 flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-semibold">Failed to load activity logs</p>
              <p className="text-sm text-gray-600 mt-2">
                {error?.response?.data?.message || error?.message || 'An unknown error occurred'}
              </p>
              <details className="mt-4 text-left max-w-2xl mx-auto">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">View error details</summary>
                <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded text-xs space-y-2">
                  <div><strong>Status:</strong> {error?.response?.status || 'N/A'}</div>
                  <div><strong>Message:</strong> {error?.response?.data?.message || error?.message || 'No error message'}</div>
                  {error?.response?.data && (
                    <div>
                      <strong>Response:</strong>
                      <pre className="mt-1 p-2 bg-white rounded overflow-auto">
                        {JSON.stringify(error.response.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activities Yet</h3>
              <p className="text-gray-600">
                {actionFilter !== 'all' 
                  ? `No ${filterOptions.find(f => f.value === actionFilter)?.label.toLowerCase()} activities found.`
                  : 'Event activities will appear here as actions are performed.'}
              </p>
              
              {/* Show available actions if filter returns 0 but uniqueLogs has data */}
              {actionFilter !== 'all' && uniqueLogs.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Found {uniqueLogs.length} activities in other categories</h4>
                  </div>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>Available action types in this event:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[...new Set(uniqueLogs.map(log => log.action))].map(action => (
                        <span key={action} className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono">
                          {action}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setActionFilter('all')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View All {uniqueLogs.length} Activities
                    </button>
                  </div>
                </div>
              )}
              
              {/* Debug Info */}
              <details className="mt-6 text-left max-w-2xl mx-auto">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 text-center">
                  🐛 Debug Information (for developers)
                </summary>
                <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 text-xs space-y-2">
                  <div><strong>Event ID:</strong> {eventId}</div>
                  <div><strong>Total Logs Fetched:</strong> {allLogs.length}</div>
                  <div><strong>Unique Logs (after dedup):</strong> {uniqueLogs.length}</div>
                  {allLogs.length !== uniqueLogs.length && (
                    <div className="text-red-600"><strong>⚠️ Duplicates Removed in Step 1:</strong> {allLogs.length - uniqueLogs.length}</div>
                  )}
                  <div><strong>Selected Filter:</strong> {actionFilter}</div>
                  <div><strong>Final Rendered Logs:</strong> {logs.length}</div>
                  <div><strong>API Endpoint:</strong> /api/analytics/events/{eventId}/activity-logs</div>
                  {logsData && (
                    <>
                      <div><strong>API Response Success:</strong> {logsData.success ? 'Yes' : 'No'}</div>
                      <div><strong>API Response Count:</strong> {logsData.count}</div>
                    </>
                  )}
                  <div className="pt-2 border-t border-gray-300">
                    <strong>Expected Actions for "{actionFilter}" filter:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {filterOptions.find(f => f.value === actionFilter)?.actions?.map(a => (
                        <span key={a} className="px-2 py-0.5 bg-yellow-100 rounded text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <strong>Actual Actions in Data:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[...new Set(uniqueLogs.map(log => log.action))].map(a => (
                        <span key={a} className="px-2 py-0.5 bg-green-100 rounded text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <strong>Sample Log (First Item):</strong>
                    <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-40 text-xs">
                      {JSON.stringify(uniqueLogs[0], null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Activity Timeline */}
          {!isLoading && !error && logs.length > 0 && (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const IconComponent = getIconComponent(log.action);
                const colorClass = getActivityColor(log.action);
                const message = formatActivityMessage(log);
                const timeAgo = formatDistanceDate(log.createdAt);

                return (
                  <div 
                    key={log._id}
                    className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {message}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo}</span>
                        </div>
                        
                        {log.user && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full capitalize">
                            {log.user.role}
                          </span>
                        )}
                        
                        {log.status && log.status !== 'success' && (
                          <span className={`px-2 py-0.5 rounded-full capitalize ${
                            log.status === 'failure' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {log.status}
                          </span>
                        )}
                      </div>

                      {/* Additional Details */}
                      {((log.details && Object.keys(log.details).length > 0) || log.user || log.ipAddress || log.resourceType) && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer font-semibold flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            View details
                          </summary>
                          <div className="mt-3 text-xs bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                            {/* User Information */}
                            {log.user && (
                              <div className="flex items-start gap-2 pb-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 min-w-[80px]">Performed By:</span>
                                <div className="flex-1">
                                  <div className="text-gray-900 font-medium">{log.user.name}</div>
                                  <div className="text-gray-600">{log.user.email}</div>
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs capitalize">
                                    {log.user.role}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                              <span className="font-semibold text-gray-700 min-w-[80px]">Date & Time:</span>
                              <span className="text-gray-900">{formatDate(log.createdAt, 'MMM dd, yyyy hh:mm a')}</span>
                            </div>

                            {/* Action Type */}
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                              <span className="font-semibold text-gray-700 min-w-[80px]">Action:</span>
                              <span className="text-gray-900 font-mono text-xs bg-gray-200 px-2 py-1 rounded">{log.action}</span>
                            </div>

                            {/* Resource Information */}
                            {log.resourceType && (
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 min-w-[80px]">Resource:</span>
                                <span className="text-gray-900 capitalize">{log.resourceType}</span>
                              </div>
                            )}

                            {/* IP Address */}
                            {log.ipAddress && (
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 min-w-[80px]">IP Address:</span>
                                <span className="text-gray-900 font-mono text-xs">{log.ipAddress}</span>
                              </div>
                            )}

                            {/* Status */}
                            {log.status && (
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 min-w-[80px]">Status:</span>
                                <span className={`inline-block px-2 py-1 rounded capitalize ${
                                  log.status === 'success' ? 'bg-green-100 text-green-700' :
                                  log.status === 'failure' ? 'bg-red-100 text-red-700' : 
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {log.status}
                                </span>
                              </div>
                            )}

                            {/* Custom Details */}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="pt-2">
                                <div className="font-semibold text-gray-700 mb-2">Additional Information:</div>
                                <div className="space-y-1 pl-2">
                                  {Object.entries(log.details).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="font-medium text-gray-600 capitalize min-w-[100px]">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                                      </span>
                                      <span className="text-gray-900 break-all flex-1">
                                        {typeof value === 'object' 
                                          ? JSON.stringify(value, null, 2) 
                                          : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Enriched Group & Hotel Data for Inventory Actions */}
                            {log.enrichedData && log.enrichedData.group && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary-600" />
                                  Group Information:
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
                                  <div className="flex gap-2">
                                    <span className="font-medium text-gray-600 min-w-[120px]">Group Name:</span>
                                    <span className="text-gray-900 font-semibold">{log.enrichedData.group.name}</span>
                                  </div>
                                  {log.enrichedData.group.category && (
                                    <div className="flex gap-2">
                                      <span className="font-medium text-gray-600 min-w-[120px]">Category:</span>
                                      <span className="text-gray-900 capitalize">{log.enrichedData.group.category}</span>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <span className="font-medium text-gray-600 min-w-[120px]">Members:</span>
                                    <span className="text-gray-900">{log.enrichedData.group.memberCount} guest(s)</span>
                                  </div>
                                  
                                  {/* Assigned Hotels */}
                                  {log.enrichedData.group.assignedHotels && log.enrichedData.group.assignedHotels.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Hotel className="h-3 w-3" />
                                        Assigned Hotels:
                                      </div>
                                      <div className="space-y-2">
                                        {log.enrichedData.group.assignedHotels.map((hotel, idx) => (
                                          <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                                            <div className="font-medium text-gray-900">{hotel.hotelName}</div>
                                            <div className="text-gray-600">{hotel.hotelEmail}</div>
                                            <div className="flex gap-3 mt-1 text-xs">
                                              <span className="text-gray-500">
                                                Priority: <span className="font-medium text-gray-700">{hotel.priority}</span>
                                              </span>
                                              <span className="text-gray-500">
                                                Assigned: <span className="font-medium text-gray-700">{formatDate(hotel.assignedAt, 'MMM dd, yyyy')}</span>
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Group Members */}
                                  {log.enrichedData.group.members && log.enrichedData.group.members.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Users className="h-3 w-3" />
                                        Group Members ({log.enrichedData.group.members.length}):
                                      </div>
                                      <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {log.enrichedData.group.members.map((member, idx) => (
                                          <div key={idx} className="bg-gray-50 rounded px-2 py-1 text-xs flex justify-between">
                                            <span className="font-medium text-gray-900">{member.guestName}</span>
                                            <span className="text-gray-600">{member.guestEmail}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Enriched Inventory Data */}
                            {log.enrichedData && log.enrichedData.inventory && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <Hotel className="h-4 w-4 text-primary-600" />
                                  Inventory Details:
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-3 space-y-2 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="font-medium text-gray-600">Hotel:</span>
                                      <div className="text-gray-900">{log.enrichedData.inventory.hotelName}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Room Type:</span>
                                      <div className="text-gray-900">{log.enrichedData.inventory.roomType}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Total Rooms:</span>
                                      <div className="text-gray-900">{log.enrichedData.inventory.totalRooms}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Available:</span>
                                      <div className="text-gray-900">{log.enrichedData.inventory.availableRooms}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Blocked:</span>
                                      <div className="text-gray-900">{log.enrichedData.inventory.blockedRooms}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Status:</span>
                                      <div className="text-gray-900 capitalize">{log.enrichedData.inventory.status}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show More Indicator */}
          {!isLoading && logs.length >= 100 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Showing most recent 100 activities
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
