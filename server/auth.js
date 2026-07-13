const { OAuth2Client } = require('google-auth-library');
const { ALLOWED_DOMAIN, ALLOWED_USERS } = require('../shared/types.cjs');

function trimEnv(name) {
  return (process.env[name] || '').trim();
}

function getAllowedUsers() {
  const fromEnv = trimEnv('PIPELINE_ALLOWED_USERS');
  if (fromEnv) {
    return fromEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return ALLOWED_USERS.map((e) => e.toLowerCase());
}

function isAllowedUser(email) {
  if (!email) return false;
  return getAllowedUsers().includes(email.toLowerCase());
}

function getOAuthClient() {
  const clientId = trimEnv('PIPELINE_GOOGLE_CLIENT_ID');
  const clientSecret = trimEnv('PIPELINE_GOOGLE_CLIENT_SECRET');
  const redirectUri =
    trimEnv('PIPELINE_GOOGLE_REDIRECT_URI') ||
    `${trimEnv('API_URL') || 'http://localhost:8081'}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function getAuthUrl() {
  const client = getOAuthClient();
  if (!client) throw new Error('Google OAuth not configured');

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    hd: ALLOWED_DOMAIN,
  });
}

async function exchangeCode(code) {
  const client = getOAuthClient();
  if (!client) throw new Error('Google OAuth not configured');

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: trimEnv('PIPELINE_GOOGLE_CLIENT_ID'),
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('No email in token');

  const email = payload.email.toLowerCase();
  const domain = email.split('@')[1];

  if (domain !== ALLOWED_DOMAIN) {
    throw new Error(`Access restricted to @${ALLOWED_DOMAIN}`);
  }

  if (payload.hd && payload.hd !== ALLOWED_DOMAIN) {
    throw new Error(`Hosted domain mismatch: ${payload.hd}`);
  }

  if (!isAllowedUser(email)) {
    throw new Error('Your account is not authorized to access Pipeline');
  }

  return {
    email,
    name: payload.name || email,
    picture: payload.picture || null,
    googleId: payload.sub,
  };
}

function oauthConfigured() {
  return Boolean(trimEnv('PIPELINE_GOOGLE_CLIENT_ID') && trimEnv('PIPELINE_GOOGLE_CLIENT_SECRET'));
}

module.exports = { getAuthUrl, exchangeCode, oauthConfigured, getOAuthClient, isAllowedUser, getAllowedUsers };
