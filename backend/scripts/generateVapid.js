const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('');
console.log('Add these two lines to your .env file, plus:');
console.log("VAPID_SUBJECT=mailto:admin@example.com");