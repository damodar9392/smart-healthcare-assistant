const rateLimit = new Map();
const loginAttempts = new Map();

function createRateLimit({ windowMs = 60000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimit.has(key)) {
      rateLimit.set(key, []);
    }

    const timestamps = rateLimit.get(key).filter((t) => t > windowStart);
    rateLimit.set(key, timestamps);

    if (timestamps.length >= max) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
    }

    timestamps.push(now);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - timestamps.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000));
    next();
  };
}

const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_LOCK_WINDOW_MS = 30 * 1000;

function getLoginLock(identifier) {
  const entry = loginAttempts.get(identifier);
  if (!entry) return null;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return {
      locked: true,
      lockedUntil: entry.lockedUntil,
      retryAfter: Math.ceil((entry.lockedUntil - Date.now()) / 1000),
    };
  }
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(identifier);
    return null;
  }
  return { locked: false, remaining: LOGIN_MAX_ATTEMPTS - entry.failures };
}

function isLoginLocked(identifier) {
  const lock = getLoginLock(identifier);
  return lock ? lock.locked : false;
}

function recordLoginFailure(identifier) {
  const now = Date.now();
  const entry = loginAttempts.get(identifier) || { failures: 0, lockedUntil: null };
  entry.failures += 1;
  if (entry.failures >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCK_WINDOW_MS;
    entry.failures = 0;
  }
  loginAttempts.set(identifier, entry);
}

function clearLoginFailure(identifier) {
  loginAttempts.delete(identifier);
}

const loginRateLimit = createRateLimit({
  windowMs: 60000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});

const registerRateLimit = createRateLimit({
  windowMs: 60000,
  max: 5,
  message: 'Too many registration attempts. Please try again later.',
});

const chatRateLimit = createRateLimit({
  windowMs: 60000,
  max: 20,
  message: 'You are sending messages too quickly. Please wait a moment.',
});

const generalRateLimit = createRateLimit({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests. Please slow down.',
});

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimit.entries()) {
    const valid = timestamps.filter((t) => t > now - 60000);
    if (valid.length === 0) {
      rateLimit.delete(key);
    } else {
      rateLimit.set(key, valid);
    }
  }
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      loginAttempts.delete(key);
    }
  }
}, 300000).unref();

module.exports = {
  createRateLimit,
  chatRateLimit,
  generalRateLimit,
  loginRateLimit,
  registerRateLimit,
  isLoginLocked,
  getLoginLock,
  recordLoginFailure,
  clearLoginFailure,
};
