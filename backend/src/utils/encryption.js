const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'A secure ENCRYPTION_KEY (>= 32 chars) or strong JWT_SECRET (>= 32 chars) must be set. Encryption is disabled otherwise.'
    );
  }
  const salt = crypto.createHash('sha256').update('smart-healthcare-salt-v1').digest();
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext;
  }
}

function hashForSearch(plaintext) {
  if (!plaintext) return plaintext;
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(String(plaintext).toLowerCase().trim()).digest('hex');
}

module.exports = { encrypt, decrypt, hashForSearch, getEncryptionKey };
