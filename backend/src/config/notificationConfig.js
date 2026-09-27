module.exports = {
  email: {
    transport: process.env.EMAIL_TRANSPORT || 'console',
    from: process.env.EMAIL_FROM || 'Smart Healthcare Assistant <no-reply@example.com>',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
  },
  sms: {
    enabled: false,
  },
  push: {
    enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    vapid: {
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || '',
    },
  },
  reminder: {
    leadHours: parseInt(process.env.REMINDER_LEAD_HOURS, 10) || 24,
    checkIntervalMinutes: parseInt(process.env.REMINDER_CHECK_INTERVAL_MINUTES, 10) || 5,
    enabled: process.env.RUN_REMINDER_SCHEDULER !== 'false',
  },
};