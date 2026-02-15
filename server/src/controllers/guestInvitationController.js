import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';
import crypto from 'crypto';
import xlsx from 'xlsx';
import sendEmail from '../utils/mail.js';

// @desc    Add guests to private event (manually)
// @route   POST /api/events/:eventId/guests
// @access  Private (Planner)
export const addGuests = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { guests } = req.body; // Array of { name, email, phone }

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  // Check if user is the planner
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to manage this event' });
  }

  // Generate access codes for new guests
  const newGuests = guests.map(guest => ({
    ...guest,
    accessCode: crypto.randomBytes(16).toString('hex'),
    addedAt: new Date(),
    hasAccessed: false,
  }));

  // Check for duplicate emails
  const existingEmails = event.invitedGuests.map(g => g.email.toLowerCase());
  const duplicates = newGuests.filter(g => existingEmails.includes(g.email.toLowerCase()));

  if (duplicates.length > 0) {
    return res.status(400).json({ 
      message: 'Some guests are already invited',
      duplicateEmails: duplicates.map(d => d.email),
    });
  }

  event.invitedGuests.push(...newGuests);
  await event.save();

  await createAuditLog(req.user.id, 'ADD_GUESTS', 'Event', eventId, {
    guestsAdded: newGuests.length,
  });

  try {
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const slug = event.micrositeConfig?.customSlug;
    const micrositeLink = slug ? `${clientUrl}/microsite/${slug}` : clientUrl;

    await Promise.all(
      newGuests.map((guest) =>
        sendEmail({
          to: guest.email,
          subject: `You're invited to ${event.name}`,
          html: `
            <p>Hi ${guest.name || 'Guest'},</p>
            <p>You have been invited to the private event <strong>${event.name}</strong>.</p>
            <p><strong>Access Code:</strong> ${guest.accessCode}</p>
            <p>Access the event here: <a href="${micrositeLink}">${micrositeLink}</a></p>
          `,
          text: `You're invited to ${event.name}. Access code: ${guest.accessCode}. Link: ${micrositeLink}`,
        })
      )
    );
  } catch (error) {
    console.error('Error sending guest invitation emails:', error);
  }

  res.status(200).json({
    success: true,
    message: `${newGuests.length} guests added successfully`,
    data: newGuests,
  });
});

// @desc    Upload guest list via Excel
// @route   POST /api/events/:eventId/guests/upload
// @access  Private (Planner)
export const uploadGuestList = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { fileData } = req.body; // Base64 encoded Excel file

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to manage this event' });
  }

  try {
    // Decode base64 and parse Excel
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Expected columns: Name, Email, Phone (optional)
    const guests = data.map(row => ({
      name: row.Name || row.name,
      email: row.Email || row.email,
      phone: row.Phone || row.phone || '',
      accessCode: crypto.randomBytes(16).toString('hex'),
      addedAt: new Date(),
      hasAccessed: false,
    })).filter(guest => guest.name && guest.email);

    if (guests.length === 0) {
      return res.status(400).json({ 
        message: 'No valid guests found in Excel file. Please ensure columns are named: Name, Email, Phone',
      });
    }

    // Check for duplicates
    const existingEmails = event.invitedGuests.map(g => g.email.toLowerCase());
    const newGuests = guests.filter(g => !existingEmails.includes(g.email.toLowerCase()));
    const skipped = guests.length - newGuests.length;

    event.invitedGuests.push(...newGuests);
    await event.save();

    await createAuditLog(req.user.id, 'UPLOAD_GUEST_LIST', 'Event', eventId, {
      guestsAdded: newGuests.length,
      skipped,
    });

    try {
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
      const slug = event.micrositeConfig?.customSlug;
      const micrositeLink = slug ? `${clientUrl}/microsite/${slug}` : clientUrl;

      await Promise.all(
        newGuests.map((guest) =>
          sendEmail({
            to: guest.email,
            subject: `You're invited to ${event.name}`,
            html: `
              <p>Hi ${guest.name || 'Guest'},</p>
              <p>You have been invited to the private event <strong>${event.name}</strong>.</p>
              <p><strong>Access Code:</strong> ${guest.accessCode}</p>
              <p>Access the event here: <a href="${micrositeLink}">${micrositeLink}</a></p>
            `,
            text: `You're invited to ${event.name}. Access code: ${guest.accessCode}. Link: ${micrositeLink}`,
          })
        )
      );
    } catch (error) {
      console.error('Error sending guest invitation emails:', error);
    }

    res.status(200).json({
      success: true,
      message: `${newGuests.length} guests added successfully${skipped > 0 ? `, ${skipped} duplicates skipped` : ''}`,
      data: {
        added: newGuests.length,
        skipped,
      },
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error parsing Excel file. Please ensure it has columns: Name, Email, Phone',
      error: error.message,
    });
  }
});

// @desc    Get guest list for event
// @route   GET /api/events/:eventId/guests
// @access  Private (Planner)
export const getGuestList = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).select('invitedGuests isPrivate name planner');

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to view this event' });
  }

  res.status(200).json({
    success: true,
    data: {
      eventName: event.name,
      isPrivate: event.isPrivate,
      totalGuests: event.invitedGuests.length,
      guests: event.invitedGuests,
    },
  });
});

// @desc    Remove guest from event
// @route   DELETE /api/events/:eventId/guests/:guestId
// @access  Private (Planner)
export const removeGuest = asyncHandler(async (req, res) => {
  const { eventId, guestId } = req.params;

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to manage this event' });
  }

  event.invitedGuests = event.invitedGuests.filter(
    guest => guest._id.toString() !== guestId
  );

  await event.save();

  await createAuditLog(req.user.id, 'REMOVE_GUEST', 'Event', eventId, {
    guestId,
  });

  res.status(200).json({
    success: true,
    message: 'Guest removed successfully',
  });
});

// @desc    Verify guest access to private event
// @route   POST /api/events/verify-access
// @access  Public
export const verifyGuestAccess = asyncHandler(async (req, res) => {
  const { eventSlug, email } = req.body;

  console.log('\n🔍 VERIFYING GUEST ACCESS:');
  console.log('   Event Slug:', eventSlug);
  console.log('   Email to verify:', email);

  const event = await Event.findOne({ 'micrositeConfig.customSlug': eventSlug })
    .select('isPrivate invitedGuests name');

  if (!event) {
    console.log('   ❌ Event not found');
    return res.status(404).json({ message: 'Event not found' });
  }

  console.log('   Event:', event.name);
  console.log('   Is Private:', event.isPrivate);

  // Public events are accessible to all
  if (!event.isPrivate) {
    console.log('   ✅ Public event - access granted');
    return res.status(200).json({
      success: true,
      hasAccess: true,
      isPrivate: false,
    });
  }

  console.log('   Invited Guests List:');
  event.invitedGuests.forEach((g, index) => {
    console.log(`      ${index + 1}. ${g.name} <${g.email}> (hasAccessed: ${g.hasAccessed})`);
  });

  // Check if email is in invited guests
  const guest = event.invitedGuests.find(
    g => g.email.toLowerCase() === email.toLowerCase()
  );

  console.log('   Email comparison:');
  console.log('      Looking for:', email.toLowerCase());
  console.log('      Found match:', guest ? `YES - ${guest.name} <${guest.email}>` : 'NO');

  if (!guest) {
    console.log('   ❌ Access denied: Email not in invited guests list');
    // Return 200 with hasAccess: false (not a server error, just not invited)
    return res.status(200).json({
      success: true,
      hasAccess: false,
      isPrivate: true,
      message: 'You are not invited to this private event',
    });
  }

  console.log('   ✅ Access granted: Guest is invited');

  // Mark as accessed
  if (!guest.hasAccessed) {
    guest.hasAccessed = true;
    await event.save();
  }

  res.status(200).json({
    success: true,
    hasAccess: true,
    isPrivate: true,
    guestInfo: {
      name: guest.name,
      email: guest.email,
      accessCode: guest.accessCode,
    },
  });
});

// @desc    Toggle event privacy
// @route   PATCH /api/events/:eventId/privacy
// @access  Private (Planner)
export const toggleEventPrivacy = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { isPrivate } = req.body;

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to manage this event' });
  }

  event.isPrivate = isPrivate;
  await event.save();

  await createAuditLog(req.user.id, 'TOGGLE_EVENT_PRIVACY', 'Event', eventId, {
    isPrivate,
  });

  res.status(200).json({
    success: true,
    message: `Event is now ${isPrivate ? 'private' : 'public'}`,
    data: { isPrivate: event.isPrivate },
  });
});
