import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Key,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Phone,
  Building,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    role: 'all',
    status: '',
    search: '',
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const response = await api.get(`/admin/users?${params}`);
      return response;
    },
  });

  // Fetch user stats
  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/users/stats/overview');
      return response;
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      await api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      await api.put(`/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries(['admin-users']);
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }) => {
      await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setShowResetPassword(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      await api.post('/admin/users', userData);
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-stats']);
      setShowCreateUser(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(userId);
    }
  };

  const handleToggleStatus = (user) => {
    updateMutation.mutate({
      userId: user._id,
      data: { isActive: !user.isActive },
    });
  };

  const getRoleBadge = (role) => {
    const config = {
      admin: 'bg-red-100 text-red-800',
      planner: 'bg-blue-100 text-blue-800',
      hotel: 'bg-purple-100 text-purple-800',
      guest: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config[role]}`}>
        {role.toUpperCase()}
      </span>
    );
  };

  if (isLoading && !usersData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all platform users</p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Users className="h-5 w-5" />
          Create User (JSON)
        </button>
      </div>

      {/* Stats Overview */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={statsData.totalUsers} icon={Users} color="bg-blue-500" />
          <StatCard title="Active Users" value={statsData.activeUsers} icon={UserCheck} color="bg-green-500" />
          <StatCard title="Planners" value={statsData.roleStats?.planner || 0} icon={Calendar} color="bg-purple-500" />
          <StatCard title="Hotels" value={statsData.roleStats?.hotel || 0} icon={Building} color="bg-yellow-500" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="planner">Planner</option>
              <option value="hotel">Hotel</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersData?.users?.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.organization && (
                          <div className="text-xs text-gray-400">{user.organization}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <XCircle className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'planner' && user.stats && (
                      <div>
                        <span className="font-medium">{user.stats.eventsCount}</span> events
                      </div>
                    )}
                    {user.role === 'hotel' && user.stats && (
                      <div>
                        <span className="font-medium">{user.stats.proposalsCount}</span> proposals
                      </div>
                    )}
                    {user.role === 'guest' && user.stats && (
                      <div>
                        <span className="font-medium">{user.stats.bookingsCount}</span> bookings
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowResetPassword(user)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {usersData?.users?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {usersData?.pagination && usersData.pagination.pages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page {usersData.pagination.page} of {usersData.pagination.pages}
              {' '}({usersData.pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(usersData.pagination.pages, p + 1))}
                disabled={page === usersData.pagination.pages}
                className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => updateMutation.mutate({ userId: editingUser._id, data })}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <ResetPasswordModal
          user={showResetPassword}
          onClose={() => setShowResetPassword(null)}
          onReset={(newPassword) =>
            resetPasswordMutation.mutate({ userId: showResetPassword._id, newPassword })
          }
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreate={(userData) => createUserMutation.mutate(userData)}
        />
      )}
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

// Edit User Modal
function EditUserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    organization: user.organization || '',
    phone: user.phone || '',
    isActive: user.isActive,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="guest">Guest</option>
              <option value="planner">Planner</option>
              <option value="hotel">Hotel</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active User
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reset Password Modal
function ResetPasswordModal({ user, onClose, onReset }) {
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    onReset(newPassword);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Password</h3>
        <p className="text-sm text-gray-600 mb-4">
          Reset password for <strong>{user.name}</strong> ({user.email})
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter new password (min 6 characters)"
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Reset Password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create User Modal
function CreateUserModal({ onClose, onCreate }) {
  const [jsonInput, setJsonInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('guest');
  const [error, setError] = useState('');

  const sampleData = {
    guest: {
      name: "John Guest",
      email: "guest@example.com",
      password: "password123",
      role: "guest",
      phone: "+1234567890",
      organization: "Guest Company Inc"
    },
    planner: {
      name: "Sarah Planner",
      email: "planner@example.com",
      password: "password123",
      role: "planner",
      phone: "+1234567891",
      organization: "Event Planning Co"
    },
    hotel: {
      name: "Grand Hotel",
      email: "hotel@example.com",
      password: "password123",
      role: "hotel",
      phone: "+1234567892",
      organization: "Grand Hotel & Resorts",
      address: {
        street: "123 Main Street",
        city: "New York",
        state: "NY",
        country: "USA",
        postalCode: "10001"
      },
      hotelDetails: {
        starRating: 5,
        totalRooms: 200,
        amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Spa", "Conference Rooms"],
        description: "Luxury hotel in the heart of the city with world-class amenities"
      }
    },
    admin: {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      phone: "+1234567893",
      organization: "Platform Admin"
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setJsonInput(JSON.stringify(sampleData[role], null, 2));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const userData = JSON.parse(jsonInput);
      
      // Validate required fields
      if (!userData.name || !userData.email || !userData.password || !userData.role) {
        setError('Required fields: name, email, password, role');
        return;
      }
      
      if (userData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      onCreate(userData);
    } catch (err) {
      setError('Invalid JSON format: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Create User via JSON</h3>
        
        {/* Role Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role to Load Sample
          </label>
          <div className="flex gap-2">
            {['guest', 'planner', 'hotel', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  selectedRole === role
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* JSON Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Data (JSON Format)
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError('');
              }}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              placeholder="Paste JSON data or select a role above to load sample"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Required fields:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>name (string)</li>
              <li>email (string, valid email)</li>
              <li>password (string, min 6 characters)</li>
              <li>role (string: guest, planner, hotel, admin)</li>
            </ul>
            <p className="mt-2 font-medium">Optional fields:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>phone (string)</li>
              <li>organization (string)</li>
              <li>address (object) - for hotel role</li>
              <li>hotelDetails (object) - for hotel role</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
            >
              Create User
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
