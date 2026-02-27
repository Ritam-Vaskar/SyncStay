import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function AdminAuditLogsPage() {
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    user: '',
    limit: '100',
  });
  const [expandedLog, setExpandedLog] = useState(null);

  // Fetch audit logs
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.user && { user: filters.user }),
        limit: filters.limit,
      });
      const response = await api.get(`/analytics/audit-logs?${params}`);
      return response;
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (!logsData?.data || logsData.data.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const csv = [
      ['Date', 'User', 'Role', 'Action', 'Resource', 'Status', 'IP Address'].join(','),
      ...logsData.data.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.user?.name || 'N/A',
        log.user?.role || 'N/A',
        log.action,
        log.resource,
        log.status,
        log.ipAddress || 'N/A',
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Audit logs exported successfully');
  };

  const getActionBadge = (action) => {
    const actionConfig = {
      user_login: { color: 'bg-blue-100 text-blue-800', icon: Shield },
      user_logout: { color: 'bg-gray-100 text-gray-800', icon: Shield },
      user_register: { color: 'bg-green-100 text-green-800', icon: User },
      event_create: { color: 'bg-purple-100 text-purple-800', icon: Activity },
      event_update: { color: 'bg-yellow-100 text-yellow-800', icon: Activity },
      event_delete: { color: 'bg-red-100 text-red-800', icon: Activity },
      event_approve: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      event_reject: { color: 'bg-red-100 text-red-800', icon: XCircle },
      booking_create: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      booking_cancel: { color: 'bg-red-100 text-red-800', icon: XCircle },
      payment_process: { color: 'bg-green-100 text-green-800', icon: Activity },
      payment_refund: { color: 'bg-orange-100 text-orange-800', icon: Activity },
    };

    const config = actionConfig[action] || { color: 'bg-gray-100 text-gray-800', icon: Activity };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3" />
        {action.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const config = {
      success: { color: 'text-green-600', icon: CheckCircle },
      failure: { color: 'text-red-600', icon: XCircle },
      warning: { color: 'text-yellow-600', icon: AlertTriangle },
    };

    const { color, icon: Icon } = config[status] || config.success;

    return (
      <span className={`inline-flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const logs = logsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">Monitor all platform activities and user actions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Logs"
          value={logsData?.count || 0}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="Successful"
          value={logs.filter(l => l.status === 'success').length}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Failed"
          value={logs.filter(l => l.status === 'failure').length}
          icon={XCircle}
          color="bg-red-500"
        />
        <StatCard
          title="Warnings"
          value={logs.filter(l => l.status === 'warning').length}
          icon={AlertTriangle}
          color="bg-yellow-500"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">All Actions</option>
              <optgroup label="Authentication">
                <option value="user_login">User Login</option>
                <option value="user_logout">User Logout</option>
                <option value="user_register">User Register</option>
              </optgroup>
              <optgroup label="Events">
                <option value="event_create">Event Create</option>
                <option value="event_update">Event Update</option>
                <option value="event_delete">Event Delete</option>
                <option value="event_approve">Event Approve</option>
                <option value="event_reject">Event Reject</option>
              </optgroup>
              <optgroup label="Bookings">
                <option value="booking_create">Booking Create</option>
                <option value="booking_approve">Booking Approve</option>
                <option value="booking_cancel">Booking Cancel</option>
              </optgroup>
              <optgroup label="Payments">
                <option value="payment_process">Payment Process</option>
                <option value="payment_refund">Payment Refund</option>
              </optgroup>
              <optgroup label="Inventory">
                <option value="inventory_create">Inventory Create</option>
                <option value="inventory_update">Inventory Update</option>
                <option value="inventory_lock">Inventory Lock</option>
                <option value="inventory_release">Inventory Release</option>
              </optgroup>
              <optgroup label="Guests">
                <option value="guest_add">Guest Add</option>
                <option value="guest_upload">Guest Upload</option>
                <option value="guest_remove">Guest Remove</option>
              </optgroup>
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
            <select
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">All Resources</option>
              <option value="User">User</option>
              <option value="Event">Event</option>
              <option value="Booking">Booking</option>
              <option value="Payment">Payment</option>
              <option value="Inventory">Inventory</option>
              <option value="Proposal">Proposal</option>
              <option value="Guest">Guest</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by User ID</label>
            <input
              type="text"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder="Enter user ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="50">50 logs</option>
              <option value="100">100 logs</option>
              <option value="200">200 logs</option>
              <option value="500">500 logs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <React.Fragment key={log._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-xs">
                            {log.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">{log.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{log.resource}</span>
                      {log.resourceId && (
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {log.resourceId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                      >
                        <span className="text-sm">Details</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedLog === log._id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                  {expandedLog === log._id && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-gray-500">User Agent:</span>
                              <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                                {log.userAgent || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">User Role:</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {log.user?.role?.toUpperCase() || 'N/A'}
                              </p>
                            </div>
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Request Details:</span>
                              <pre className="text-xs text-gray-900 mt-1 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {logs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs Found</h3>
            <p className="text-gray-600">Try adjusting your filters or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
