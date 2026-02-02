import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Hotel, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  MapPin,
  DollarSign,
  Bed
} from 'lucide-react';
import { inventoryService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const HotelInventoryPage = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    hotelName: '',
    location: '',
    roomType: 'single',
    totalRooms: '',
    availableRooms: '',
    pricePerNight: '',
    description: '',
    amenities: []
  });

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['hotel-inventory'],
    queryFn: () => inventoryService.getAll(),
  });

  const inventory = inventoryData?.data || [];

  // Stats
  const stats = {
    totalHotels: new Set(inventory.map(i => i.hotelName)).size,
    totalRooms: inventory.reduce((sum, i) => sum + (i.totalRooms || 0), 0),
    availableRooms: inventory.reduce((sum, i) => sum + (i.availableRooms || 0), 0),
    bookedRooms: inventory.reduce((sum, i) => sum + ((i.totalRooms || 0) - (i.availableRooms || 0)), 0)
  };

  const createMutation = useMutation({
    mutationFn: (data) => inventoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-inventory']);
      toast.success('Inventory item created successfully');
      resetForm();
      setShowModal(false);
    },
    onError: () => {
      toast.error('Failed to create inventory item');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-inventory']);
      toast.success('Inventory item updated successfully');
      resetForm();
      setShowModal(false);
      setEditingItem(null);
    },
    onError: () => {
      toast.error('Failed to update inventory item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-inventory']);
      toast.success('Inventory item deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete inventory item');
    }
  });

  const resetForm = () => {
    setFormData({
      hotelName: '',
      location: '',
      roomType: 'single',
      totalRooms: '',
      availableRooms: '',
      pricePerNight: '',
      description: '',
      amenities: []
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      hotelName: item.hotelName || '',
      location: item.location || '',
      roomType: item.roomType || 'single',
      totalRooms: item.totalRooms?.toString() || '',
      availableRooms: item.availableRooms?.toString() || '',
      pricePerNight: item.pricePerNight?.toString() || '',
      description: item.description || '',
      amenities: item.amenities || []
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      totalRooms: parseInt(formData.totalRooms),
      availableRooms: parseInt(formData.availableRooms),
      pricePerNight: parseFloat(formData.pricePerNight)
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const amenitiesOptions = [
    'Free WiFi',
    'Breakfast Included',
    'Conference Rooms',
    'Parking',
    'Gym/Fitness Center',
    'Swimming Pool',
    'Business Center',
    'Airport Shuttle',
    'Room Service',
    '24/7 Concierge'
  ];

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage your hotel rooms and availability</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Inventory
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hotels</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHotels}</p>
            </div>
            <Hotel className="h-12 w-12 text-primary-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rooms</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalRooms}</p>
            </div>
            <Bed className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.availableRooms}</p>
            </div>
            <Bed className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Booked</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.bookedRooms}</p>
            </div>
            <Bed className="h-12 w-12 text-orange-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hotel Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Night</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Hotel className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No inventory items yet. Add your first room inventory.</p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.hotelName}</p>
                      {item.amenities && item.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.amenities.slice(0, 2).map((amenity, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {amenity}
                            </span>
                          ))}
                          {item.amenities.length > 2 && (
                            <span className="text-xs text-gray-500">+{item.amenities.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-sm text-gray-900">{item.roomType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.totalRooms}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        item.availableRooms === 0 ? 'text-red-600' :
                        item.availableRooms < 5 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {item.availableRooms}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-900">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">{item.pricePerNight?.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Edit Inventory' : 'Add New Inventory'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hotel Name *
                    </label>
                    <input
                      type="text"
                      value={formData.hotelName}
                      onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                      required
                      className="input"
                      placeholder="e.g., Grand Plaza Hotel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                      className="input"
                      placeholder="e.g., New York, NY"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Type *
                    </label>
                    <select
                      value={formData.roomType}
                      onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                      required
                      className="input"
                    >
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="suite">Suite</option>
                      <option value="deluxe">Deluxe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Rooms *
                    </label>
                    <input
                      type="number"
                      value={formData.totalRooms}
                      onChange={(e) => setFormData({ ...formData, totalRooms: e.target.value })}
                      required
                      min="1"
                      className="input"
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Rooms *
                    </label>
                    <input
                      type="number"
                      value={formData.availableRooms}
                      onChange={(e) => setFormData({ ...formData, availableRooms: e.target.value })}
                      required
                      min="0"
                      className="input"
                      placeholder="e.g., 45"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Per Night (USD) *
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerNight}
                    onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="input"
                    placeholder="e.g., 150.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Amenities
                  </label>
                  <div className="grid md:grid-cols-3 gap-3">
                    {amenitiesOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.amenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="input"
                    placeholder="Additional details about the rooms..."
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
