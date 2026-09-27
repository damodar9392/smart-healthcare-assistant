const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentEncrypted: {
      type: String,
      select: false,
    },
    intent: {
      type: String,
      default: null,
    },
    detectedLanguage: {
      type: String,
      default: null,
    },
    recommendedSpecialty: {
      type: String,
      default: null,
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency', null],
      default: null,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    title: {
      type: String,
      default: null,
    },
    messages: [chatMessageSchema],
    messageCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      userAgent: { type: String, default: null },
      ipHash: { type: String, default: null },
    },
  },
  { timestamps: true },
);

conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ isDeleted: 1, createdAt: -1 });

conversationSchema.pre('save', function (next) {
  this.messageCount = this.messages.length;
  next();
});

conversationSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    sessionId: this.sessionId,
    language: this.language,
    title: decrypt(this.title) || 'New conversation',
    messageCount: this.messageCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

conversationSchema.methods.toOwnerJSON = function () {
  return {
    _id: this._id,
    sessionId: this.sessionId,
    language: this.language,
    title: decrypt(this.title) || 'New conversation',
    messages: this.messages.map((msg) => ({
      _id: msg._id,
      role: msg.role,
      content: msg.content ? decrypt(msg.content) : null,
      intent: msg.intent,
      detectedLanguage: msg.detectedLanguage,
      recommendedSpecialty: msg.recommendedSpecialty,
      urgencyLevel: msg.urgencyLevel,
      confidenceScore: msg.confidenceScore,
      createdAt: msg.createdAt,
    })),
    messageCount: this.messageCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

conversationSchema.methods.toAdminJSON = function () {
  return {
    _id: this._id,
    user: this.user,
    sessionId: this.sessionId,
    language: this.language,
    title: '[encrypted]',
    messageCount: this.messageCount,
    messages: this.messages.map((msg) => ({
      _id: msg._id,
      role: msg.role,
      content: '[encrypted]',
      intent: msg.intent,
      detectedLanguage: msg.detectedLanguage,
      recommendedSpecialty: msg.recommendedSpecialty,
      urgencyLevel: msg.urgencyLevel,
      createdAt: msg.createdAt,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

function decrypt(text) {
  if (!text) return text;
  try {
    const crypto = require('crypto');
    const { getEncryptionKey } = require('../utils/encryption');
    const key = getEncryptionKey();

    const parts = text.split(':');
    if (parts.length !== 3) return text;

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '[decryption failed]';
  }
}

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
