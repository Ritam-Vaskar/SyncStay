import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'user_login',
        'user_logout',
        'user_register',
        'event_create',
        'event_update',
        'event_delete',
        'event_approve',
        'event_reject',
        'event_microsite_publish',
        'inventory_create',
        'inventory_update',
        'inventory_lock',
        'inventory_release',
        'proposal_submit',
        'proposal_review',
        'hotel_proposal_select',
        'hotel_proposal_submit',
        'booking_create',
        'booking_approve',
        'booking_cancel',
        'payment_process',
        'payment_refund',
        'planner_payment_complete',
        'settings_update',
        'guest_add',
        'guest_upload',
        'guest_remove',
        'guest_update',
        'event_privacy_toggle',
        'guest_auto_register',
        'guest_invite_login',
      ],
    },
    resource: {
      type: String, // e.g., 'Event', 'Booking', 'Inventory'
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'warning'],
      default: 'success',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
