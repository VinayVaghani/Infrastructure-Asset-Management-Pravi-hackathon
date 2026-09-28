const AuditLog = require('../models/AuditLog');

/**
 * Audit Logging Service
 */
const logAudit = async ({
  action,
  entityType,
  entityId,
  performedBy,
  changes = {},
  req = null,
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      changes,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error(`[Audit Log Failure]: ${err.message}`);
  }
};

module.exports = {
  logAudit,
};
