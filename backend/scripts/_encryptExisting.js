// One-time migration: encrypt any chat messages/titles still stored in plaintext
// (records created before the encrypt-everything change in assistantController).
//
// Run: node scripts/_encryptExisting.js
// Requires MONGO_URI (and ENCRYPTION_KEY or a strong JWT_SECRET) in backend/.env.
//
// Idempotent: records that already decrypt to something other than their stored
// value are treated as already encrypted and left untouched.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Conversation = require(path.join(__dirname, '..', 'src', 'models', 'Conversation'));
const { encrypt, decrypt } = require(path.join(__dirname, '..', 'src', 'utils', 'encryption'));

function isPlaintext(value) {
  if (!value) return false;
  try {
    return decrypt(value) === value;
  } catch {
    return true;
  }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const conversations = await Conversation.find({ isDeleted: false });
  let encryptedMessages = 0;
  let encryptedTitles = 0;

  for (const conversation of conversations) {
    let changed = false;

    if (isPlaintext(conversation.title)) {
      conversation.title = encrypt(conversation.title);
      encryptedTitles += 1;
      changed = true;
    }

    for (const message of conversation.messages) {
      if (isPlaintext(message.content)) {
        message.content = encrypt(message.content);
        encryptedMessages += 1;
        changed = true;
      }
    }

    if (changed) {
      await conversation.save();
    }
  }

  console.log(
    `Migration complete: ${encryptedMessages} message(s) and ${encryptedTitles} title(s) encrypted.`
  );
  process.exit(0);
})().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});