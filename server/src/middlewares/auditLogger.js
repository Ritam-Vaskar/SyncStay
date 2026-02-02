import AuditLog from '../models/AuditLog.js';

/**
 * Create audit log entry
 */
export const createAuditLog = async (logData) => {
  try {
    const auditLog = await AuditLog.create(logData);
    return auditLog;
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

/**
 * Middleware to log actions
 */
export const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = function (data) {
      // Only log if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        createAuditLog({
          user: req.user?._id,
          action,
          resource,
          resourceId: req.params.id || data?.data?._id || null,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent') || '',
          status: 'success',
        });
      }

      // Call original json function
      return originalJson(data);
    };

    next();
  };
};
