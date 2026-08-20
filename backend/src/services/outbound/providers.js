const config = require('../../config/notificationConfig');
const nodemailer = require('nodemailer');

let transportCache = null;

const buildTransport = () => {
  if (config.email.transport === 'smtp') {
    return nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: config.email.smtp.auth.user ? config.email.smtp.auth : undefined,
    });
  }
  return {
    sendMail: async ({ to, subject, text, html }) => {
      console.log(
        `[email:console-preview] to=${to} subject="${subject}"\n${text}\n${html ? '[html omitted]' : ''}`
      );
      return { preview: true, messageId: `console-${Date.now()}` };
    },
  };
};

const getTransport = () => {
  if (!transportCache) {
    transportCache = buildTransport();
  }
  return transportCache;
};

const emailProvider = {
  name: 'email',
  async send({ to, subject, text, html }) {
    const info = await getTransport().sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });
    return info;
  },
};

const smsProvider = {
  name: 'sms',
  async send() {
    if (!config.sms.enabled) {
      throw new Error('SMS provider is not configured yet');
    }
    throw new Error('SMS provider not implemented');
  },
};

const pushProvider = {
  name: 'push',
  async send() {
    if (!config.push.enabled) {
      throw new Error('Push provider is not configured yet');
    }
    throw new Error('Push provider not implemented');
  },
};

const registry = {
  email: emailProvider,
  sms: smsProvider,
  push: pushProvider,
};

const getProvider = (channel) => {
  const provider = registry[channel];
  if (!provider) {
    throw new Error(`Unknown notification channel: ${channel}`);
  }
  return provider;
};

module.exports = { registry, getProvider, getTransport };