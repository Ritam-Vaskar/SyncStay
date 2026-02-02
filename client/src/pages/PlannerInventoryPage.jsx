import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Hotel, Plus, Edit2, Trash2, DollarSign, Bed } from 'lucide-react';
import { inventoryService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const PlannerInventoryPage = () => {
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
    amenities: [],
    description: ''
  });

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['planner-inventory'],
    queryFn: () => inventoryService.getAll(),
  });

  const inventory = inventoryData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => inventoryService.create(data),
    onSuccess: () => {
      toast.success('Inventory item added successfully!');
      queryClient.invalidateQueries(['planner-inventory']);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add inventory');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryService.update(id, data),
    onSuccess: () => {
      toast.success('Inventory item updated successfully!');
      queryClient.invalidateQueries(['planner-inventory']);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update inventory');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.delete(id),
    onSuccess: () => {
      toast.success('Inventory item deleted successfully!');
      queryClient.invalidateQueries(['planner-inventory']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete inventory');
    },
  });

  const resetForm = () => {
    setFormData({
      hotelName: '',
      location: '',
      roomType: 'single',
      totalRooms: '',
      availableRooms: '',
      pricePerNight: '',
      amenities: [],
      description: ''
    });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      hotelName: item.hotelName,
      location: item.location,
      roomType: item.roomType,
      totalRooms: item.totalRooms.toString(),
      availableRooms: item.availableRooms.toString(),
      pricePerNight: item.pricePerNight.toString(),
      amenities: item.amenities || [],
      description: item.description || ''
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

  const stats = {
    totalHotels: new Set(inventory.map(i => i.hotelName)).size,
    totalRooms: inventory.reduce((sum, i) => sum + i.totalRooms, 0),
    availableRooms: inventory.reduce((sum, i) => sum + i.availableRooms, 0),
    bookedRooms: inventory.reduce((sum, i) => sum + (i.totalRooms - i.availableRooms), 0)
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
          <p className="text-gray-600 mt-1">Manage hotel rooms and availability</p>
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
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRooms}</p>
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

      {/* Inventory List */}
      {inventory.length === 0 ? (
        <div className="card text-center py-12">
          <Hotel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Inventory Yet</h3>
          <p className="text-gray-600 mb-6">Start by adding your first hotel inventory.</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add First Inventory
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hotel & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Rooms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/Night
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.hotelName}</p>
                        <p className="text-sm text-gray-500">{item.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-gray-900">{item.roomType}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{item.totalRooms}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${item.availableRooms > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.availableRooms}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">${item.pricePerNight}</td>
                    <td className="px-6 py-4 text-right space-x-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Edit Inventory' : 'Add New Inventory'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
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
                    />
                  </div>

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
                      Price per Night *
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerNight}
                      onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="input"
                    />
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
                    />
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
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn btn-primary"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingItem ? 'Update' : 'Add Inventory'}
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
