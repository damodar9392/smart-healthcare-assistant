const crypto = require('crypto');

const AuditLog = require('../models/AuditLog');

function auditLog(action, details = {}) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      setImmediate(async () => {
        try {
          const ip = req.ip || req.connection.remoteAddress || 'unknown';
          const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

          await AuditLog.create({
            action,
            user: req.user?._id || null,
            resourceType: details.resourceType || null,
            resourceId: req.params.id || null,
            ipHash,
            userAgent: req.headers['user-agent']?.slice(0, 200) || null,
            success: body?.success !== false,
            metadata: details.metadata ? JSON.stringify(details.metadata).slice(0, 500) : null,
          });
        } catch {
          // audit log failure should not break the request
        }
      });

      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditLog };
