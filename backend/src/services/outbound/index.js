const OutboundNotification = require('../../models/OutboundNotification');
const User = require('../../models/User');
const { getProvider } = require('./providers');
const { renderTemplate } = require('./templates');

const DEFAULT_CHANNEL = 'email';

const dispatchOutbound = async ({ userId, type, channel = DEFAULT_CHANNEL, subject, body, metadata = {} }) => {
  const user = await User.findById(userId).select('email phone name');
  if (!user) {
    throw new Error('Recipient user not found');
  }
  const to = channel === 'email' ? user.email : user.phone;

  const record = await OutboundNotification.create({
    user: userId,
    type,
    channel,
    to,
    subject,
    body,
    status: 'queued',
    metadata,
  });

  let provider;
  try {
    provider = getProvider(channel);
  } catch (err) {
    record.status = 'failed';
    record.error = err.message.slice(0, 500);
    record.attempts += 1;
    await record.save();
    throw err;
  }

  try {
    await provider.send({ to, subject, body });
    record.status = 'sent';
    record.sentAt = new Date();
    record.attempts += 1;
  } catch (err) {
    record.status = 'failed';
    record.error = String(err.message || err).slice(0, 500);
    record.attempts += 1;
  }
  await record.save();

  return record;
};

const sendTemplatedEmail = async ({ userId, type, summary, metadata = {} }) => {
  const { subject, text } = renderTemplate(type, summary);
  return dispatchOutbound({
    userId,
    type,
    channel: 'email',
    subject,
    body: text,
    metadata,
  });
};

module.exports = { dispatchOutbound, sendTemplatedEmail };