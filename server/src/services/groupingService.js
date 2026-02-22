import Event from '../models/Event.js';
import InventoryGroup from '../models/InventoryGroup.js';

/**
 * Auto-generate groups for public events based on guest relationship types
 */
export const autoGroupGuestsByRelationship = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    if (event.isPrivate) throw new Error('Cannot auto-group private events');

    const groupedGuests = {};

    // Group guests by relationship type or default to 'guest'
    event.invitedGuests?.forEach((guest) => {
      const relationshipType = guest.relationshipType || 'guest';
      if (!groupedGuests[relationshipType]) {
        groupedGuests[relationshipType] = [];
      }
      groupedGuests[relationshipType].push({
        guestEmail: guest.email,
        guestName: guest.name,
        relationshipType: relationshipType,
      });
    });

    // Create InventoryGroup for each category
    const createdGroups = [];
    for (const [category, members] of Object.entries(groupedGuests)) {
      const group = new InventoryGroup({
        event: eventId,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)}s Group`,
        type: 'auto',
        category: category,
        number: members.length,
        members: members,
        priority: category === 'vip' ? 100 : 50,
      });
      await group.save();
      createdGroups.push(group);
    }

    return createdGroups;
  } catch (error) {
    console.error('Error auto-grouping guests:', error);
    throw error;
  }
};

/**
 * Create a manual group for private events
 */
export const createManualGroup = async (eventId, groupData) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    const group = new InventoryGroup({
      event: eventId,
      name: groupData.name,
      type: 'manual',
      number: groupData.number,
      description: groupData.description,
      members: groupData.members || [],
      priority: groupData.priority || 0,
    });

    await group.save();
    return group;
  } catch (error) {
    console.error('Error creating manual group:', error);
    throw error;
  }
};

/**
 * Assign guests to a specific group
 */
export const assignGuestsToGroup = async (groupId, guestEmails) => {
  try {
    const group = await InventoryGroup.findById(groupId);
    if (!group) throw new Error('Group not found');

    const event = await Event.findById(group.event);
    if (!event) throw new Error('Event not found');

    // Map guest emails to guest data from event
    const newMembers = [];
    guestEmails.forEach((email) => {
      const guestData = event.invitedGuests?.find(
        (g) => g.email.toLowerCase() === email.toLowerCase()
      );
      if (guestData) {
        newMembers.push({
          guestEmail: guestData.email,
          guestName: guestData.name,
          relationshipType: guestData.relationshipType || 'guest',
        });
      }
    });

    group.members = newMembers;
    await group.save();
    return group;
  } catch (error) {
    console.error('Error assigning guests to group:', error);
    throw error;
  }
};

/**
 * Remove guest from a group
 */
export const removeGuestFromGroup = async (groupId, guestEmail) => {
  try {
    const group = await InventoryGroup.findById(groupId);
    if (!group) throw new Error('Group not found');

    group.members = group.members.filter(
      (m) => m.guestEmail.toLowerCase() !== guestEmail.toLowerCase()
    );
    await group.save();
    return group;
  } catch (error) {
    console.error('Error removing guest from group:', error);
    throw error;
  }
};

/**
 * Get all groups for an event
 */
export const getGroupsByEvent = async (eventId) => {
  try {
    const groups = await InventoryGroup.find({ event: eventId })
      .populate('assignedHotels.hotel', 'name organization location priceRange')
      .populate('recommendations.hotel', 'name organization location priceRange')
      .sort({ priority: -1, createdAt: -1 });
    return groups;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

/**
 * Delete a group
 */
export const deleteGroup = async (groupId) => {
  try {
    const group = await InventoryGroup.findByIdAndDelete(groupId);
    return group;
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

/**
 * Update group metadata
 */
export const updateGroupMetadata = async (groupId, metadata) => {
  try {
    const group = await InventoryGroup.findByIdAndUpdate(
      groupId,
      { metadata: metadata },
      { new: true }
    );
    return group;
  } catch (error) {
    console.error('Error updating group metadata:', error);
    throw error;
  }
};
