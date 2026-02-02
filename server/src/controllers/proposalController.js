import Proposal from '../models/Proposal.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   GET /api/proposals
 * @desc    Get all proposals (filtered by role)
 * @access  Private
 */
export const getProposals = asyncHandler(async (req, res) => {
  const { event, status } = req.query;
  let query = {};

  // Role-based filtering
  if (req.user.role === 'hotel') {
    query.hotel = req.user.id;
  } else if (req.user.role === 'planner' && event) {
    // Verify planner owns the event
    const eventDoc = await Event.findById(event);
    if (eventDoc && eventDoc.planner.toString() === req.user.id) {
      query.event = event;
    }
  }

  if (status) query.status = status;

  const proposals = await Proposal.find(query)
    .populate('event', 'name type startDate endDate')
    .populate('hotel', 'name organization email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: proposals.length,
    data: proposals,
  });
});

/**
 * @route   GET /api/proposals/:id
 * @desc    Get single proposal
 * @access  Private
 */
export const getProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id)
    .populate('event', 'name type startDate endDate')
    .populate('hotel', 'name organization email');

  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  res.status(200).json({
    success: true,
    data: proposal,
  });
});

/**
 * @route   POST /api/proposals
 * @desc    Create/submit proposal
 * @access  Private (Hotel)
 */
export const createProposal = asyncHandler(async (req, res) => {
  // Verify event exists
  const event = await Event.findById(req.body.event);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Set hotel ID
  req.body.hotel = req.user.id;
  req.body.status = 'submitted';
  req.body.submittedAt = new Date();

  const proposal = await Proposal.create(req.body);

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'proposal_submit',
    resource: 'Proposal',
    resourceId: proposal._id,
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'Proposal submitted successfully',
    data: proposal,
  });
});

/**
 * @route   PUT /api/proposals/:id
 * @desc    Update proposal
 * @access  Private (Hotel)
 */
export const updateProposal = asyncHandler(async (req, res) => {
  let proposal = await Proposal.findById(req.params.id);

  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  // Check ownership
  if (proposal.hotel.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this proposal',
    });
  }

  // Increment version if resubmitting
  if (req.body.status === 'submitted') {
    req.body.version = (proposal.version || 1) + 1;
    req.body.submittedAt = new Date();
  }

  proposal = await Proposal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Proposal updated successfully',
    data: proposal,
  });
});

/**
 * @route   PUT /api/proposals/:id/review
 * @desc    Review proposal (accept/reject)
 * @access  Private (Planner)
 */
export const reviewProposal = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be "accepted" or "rejected"',
    });
  }

  let proposal = await Proposal.findById(req.params.id).populate('event');

  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  // Verify planner owns the event
  if (proposal.event.planner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to review this proposal',
    });
  }

  proposal.status = status;
  proposal.reviewNotes = reviewNotes || '';
  proposal.reviewedAt = new Date();
  await proposal.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'proposal_review',
    resource: 'Proposal',
    resourceId: proposal._id,
    details: { status, reviewNotes },
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: `Proposal ${status} successfully`,
    data: proposal,
  });
});

/**
 * @route   DELETE /api/proposals/:id
 * @desc    Delete proposal
 * @access  Private (Hotel/Admin)
 */
export const deleteProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);

  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  // Check ownership
  if (proposal.hotel.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this proposal',
    });
  }

  await proposal.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Proposal deleted successfully',
  });
});
