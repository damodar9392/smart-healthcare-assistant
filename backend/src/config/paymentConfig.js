module.exports = {
  currency: 'INR',
  mode: process.env.PAYMENT_MODE || 'mock',
  mockDelayMs: 400,
};

if (module.exports.mode !== 'mock' && module.exports.mode !== 'manual') {
  throw new Error('PAYMENT_MODE must be either "mock" or "manual"');
}

module.exports.isMock = module.exports.mode === 'mock';