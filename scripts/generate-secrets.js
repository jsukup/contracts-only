// Script to generate secure secrets for production deployment
const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generated Secure Secrets for ContractsOnly Notification System');
console.log('==============================================================');
console.log('');
console.log('Add these to your Vercel environment variables:');
console.log('');
console.log('CRON_SECRET=' + generateSecret());
console.log('ADMIN_SECRET=' + generateSecret());
console.log('');
console.log('📧 Email Configuration (already configured):');
console.log('FROM_EMAIL=info@contracts-only.com');
console.log('RESEND_API_KEY=re_[your-resend-api-key]');
console.log('');
console.log('🌐 App URL (already configured in Vercel):');
console.log('NEXT_PUBLIC_APP_URL=https://contracts-only.vercel.app');
console.log('');
console.log('🚨 IMPORTANT: Keep these secrets secure and never commit them to git!');