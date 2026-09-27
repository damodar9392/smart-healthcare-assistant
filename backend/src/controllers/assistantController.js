const { body, param, query } = require('express-validator');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { askAssistant } = require('../services/assistantService');
const Conversation = require('../models/Conversation');
const { encrypt, decrypt } = require('../utils/encryption');
const { throttledWarn } = require('../utils/logThrottle');

const FALLBACK_REPLY =
  'The AI assistant is temporarily unavailable. Please try again in a moment. '
  + 'For urgent medical concerns, contact your local emergency services immediately.';

const chatValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  validate,
];

const chat = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  let existingConversation = null;
  if (conversationId) {
    existingConversation = await Conversation.findOne({ _id: conversationId, isDeleted: false });
    if (existingConversation) {
      if (req.user && existingConversation.user && existingConversation.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
      }
    }
  }

  const history = existingConversation
    ? existingConversation.messages.slice(-10).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content ? decrypt(msg.content) : '',
      })).filter((m) => m.content && m.content !== '[decryption failed]')
    : [];

  let result;
  try {
    result = await askAssistant({ message, history });
  } catch (err) {
    throttledWarn(
      'assistantController.chat',
      `[assistantController] AI assistant unavailable (${err.message}); serving fallback reply (logged at most once per minute)`
    );
    result = { reply: FALLBACK_REPLY, intent: 'unavailable', detectedLanguage: null };
  }

  const encryptedContent = encrypt(message);

  const userMessage = {
    role: 'user',
    content: encryptedContent,
    intent: result.intent,
    detectedLanguage: result.detectedLanguage || null,
  };

  const botMessage = {
    role: 'bot',
    content: encrypt(result.reply),
    intent: result.intent,
    detectedLanguage: result.detectedLanguage || null,
    recommendedSpecialty: result.recommendedSpecialty || null,
    urgencyLevel: result.urgencyLevel || null,
    confidenceScore: result.confidenceScore || null,
  };

  let conversation;
  const sessionHeader = req.headers['x-session-id'];
  const sessionId = sessionHeader || crypto.randomUUID();

  if (existingConversation) {
    existingConversation.messages.push(userMessage, botMessage);
    await existingConversation.save();
    conversation = existingConversation;
  } else {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

    conversation = await Conversation.create({
      user: req.user?._id || null,
      sessionId,
      language: result.detectedLanguage || 'en',
      title: encrypt(message.slice(0, 80)),
      messages: [userMessage, botMessage],
      metadata: {
        userAgent: req.headers['user-agent']?.slice(0, 200) || null,
        ipHash,
      },
    });
  }

  res.json({
    success: true,
    data: {
      ...result,
      conversationId: conversation._id,
      sessionId: conversation.sessionId,
    },
  });
});

const getConversationsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validate,
];

const getConversations = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { isDeleted: false };
  if (req.user) {
    filter.user = req.user._id;
  } else {
    return res.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-messages -__v')
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: conversations.map((c) => ({
      _id: c._id,
      sessionId: c.sessionId,
      language: c.language,
      title: decrypt(c.title) || 'New conversation',
      messageCount: c.messageCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getConversationValidation = [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  validate,
];

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isOwner = req.user && conversation.user && conversation.user.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden: not your conversation' });
  }

  if (isAdmin && !isOwner) {
    return res.json({ success: true, data: conversation.toAdminJSON() });
  }

  return res.json({ success: true, data: conversation.toOwnerJSON() });
});

const deleteConversationValidation = [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  validate,
];

const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isOwner = req.user && conversation.user && conversation.user.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  conversation.isDeleted = true;
  conversation.deletedAt = new Date();
  await conversation.save();

  res.json({ success: true, data: { message: 'Conversation deleted successfully' } });
});

const purgeConversationValidation = [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  validate,
];

const purgeConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isOwner = req.user && conversation.user && conversation.user.toString() === req.user._id.toString();

  if (!isOwner) {
    return res.status(403).json({ success: false, message: 'Only the owner can permanently delete conversations' });
  }

  await Conversation.findByIdAndDelete(req.params.id);

  res.json({ success: true, data: { message: 'Conversation permanently deleted' } });
});

module.exports = {
  chatValidation,
  chat,
  getConversationsValidation,
  getConversations,
  getConversationValidation,
  getConversation,
  deleteConversationValidation,
  deleteConversation,
  purgeConversationValidation,
  purgeConversation,
};
