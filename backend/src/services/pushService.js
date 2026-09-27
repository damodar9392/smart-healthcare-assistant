const webpush = require('web-push');
const User = require('../models/User');
const OutboundNotification = require('../models/OutboundNotification');
const config = require('../config/notificationConfig');

let initialised = false;

const setupVapid = () => {
  if (initialised) {
    return;
  }
  initialised = true;
  const { vapid } = config.push;
  if (!config.push.enabled || !vapid.publicKey || !vapid.privateKey) {
    return;
  }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
};

const removeSubscription = async (userId, endpoint) => {
  const user = await User.findById(userId).select('pushSubscriptions');
  if (!user) return;
  user.pushSubscriptions = (user.pushSubscriptions || []).filter(
    (sub) => sub.endpoint !== endpoint
  );
  await user.save();
};

const sendToUser = async (userId, notification) => {
  setupVapid();
  if (!config.push.enabled) {
    return { enabled: false, sent: 0, removed: 0 };
  }

  const user = await User.findById(userId).select('pushSubscriptions');
  const subscriptions = user?.pushSubscriptions || [];
  const payload = JSON.stringify({
    title: notification.title || 'SmartCare',
    body: notification.message || '',
    type: notification.type || 'system',
    url: notification.url || '/',
    timestamp: Date.now(),
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: 86400 }
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          removed += 1;
          await removeSubscription(userId, sub.endpoint);
        }
      }
    })
  );

  if (sent > 0 && user && notification.id) {
    await OutboundNotification.create({
      user: userId,
      type: notification.type || 'system',
      channel: 'push',
      to: subscriptions[0]?.endpoint || 'web-push',
      subject: notification.title || 'SmartCare',
      body: notification.message || '',
      status: 'sent',
      sentAt: new Date(),
      metadata: { sent, removed, url: notification.url || null },
    });
  }

  return { enabled: true, sent, removed };
};

module.exports = { sendToUser, setupVapid };