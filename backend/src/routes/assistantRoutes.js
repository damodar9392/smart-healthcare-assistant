const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { chatRateLimit } = require('../middleware/rateLimit');
const { auditLog } = require('../middleware/auditLog');
const {
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
} = require('../controllers/assistantController');

router.post(
  '/chat',
  chatRateLimit,
  auditLog('assistant_chat', { resourceType: 'conversation' }),
  chatValidation,
  chat,
);

router.get(
  '/conversations',
  protect,
  getConversationsValidation,
  getConversations,
);

router.get(
  '/conversations/:id',
  protect,
  getConversationValidation,
  auditLog('conversation_view', { resourceType: 'conversation' }),
  getConversation,
);

router.delete(
  '/conversations/:id',
  protect,
  deleteConversationValidation,
  auditLog('conversation_delete', { resourceType: 'conversation' }),
  deleteConversation,
);

router.delete(
  '/conversations/:id/purge',
  protect,
  purgeConversationValidation,
  auditLog('conversation_purge', { resourceType: 'conversation' }),
  purgeConversation,
);

module.exports = router;
