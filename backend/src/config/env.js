function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];

  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

  if (process.env.JWT_SECRET && String(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in all environments');
  }

  if (process.env.ENCRYPTION_KEY && String(process.env.ENCRYPTION_KEY).length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long; sensitive fields are never stored as plaintext');
  }

  if (!process.env.ENCRYPTION_KEY) {
    if (isProduction) {
      missing.push('ENCRYPTION_KEY');
    } else {
      console.warn(
        '[env] WARNING: ENCRYPTION_KEY not set; falling back to JWT_SECRET for at-rest chat encryption (development only). Set ENCRYPTION_KEY in production.'
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. See .env.example.`
    );
  }
}

module.exports = { validateEnv };
