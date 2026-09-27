const lastEmitted = new Map();

const throttledWarn = (key, message, windowMs = 60000) => {
  const now = Date.now();
  const last = lastEmitted.get(key) || 0;
  if (now - last < windowMs) {
    return false;
  }
  lastEmitted.set(key, now);
  console.warn(message);
  return true;
};

module.exports = { throttledWarn };