// scripts/generate-vapid-keys.js
const webpush = require('web-push');
const fs = require('fs');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Generated VAPID Keys for Push Notifications:');
console.log('==========================================');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('==========================================');

// Create .env example content with the keys
const envContent = `# Web Push Notification Keys
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=admin@example.com
`;

// Write to a .env.vapid file
fs.writeFileSync('.env.vapid', envContent);

console.log('\nVAPID keys have been saved to .env.vapid file.');
console.log('Add these keys to your .env file.');
console.log('Run the script with: node scripts/generate-vapid-keys.js');