const fs = require('fs');
const { JWT, GoogleAuth } = require('google-auth-library');
const { gmail: gmailApi } = require('@googleapis/gmail');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const DEFAULT_SA_EMAIL = 'pipeline-sync@phoenician-production.iam.gserviceaccount.com';

function getMailboxes() {
  const raw = (process.env.PIPELINE_SYNC_MAILBOXES || '').trim();
  return raw ? raw.split(',').map((m) => m.trim()).filter(Boolean) : [];
}

function loadServiceAccountJson() {
  const inline = (process.env.PIPELINE_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (err) {
      console.warn('[GMAIL] Invalid PIPELINE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  const credPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (credPath && fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  return null;
}

function getServiceAccountEmail(saJson) {
  return (
    saJson?.client_email ||
    process.env.PIPELINE_SYNC_SERVICE_ACCOUNT ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    DEFAULT_SA_EMAIL
  );
}

/**
 * Domain-wide delegation via IAM signJwt (no SA key file required on Cloud Run).
 */
async function getDelegatedClientViaIam(subject, saEmail) {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const now = Math.floor(Date.now() / 1000);

  const payload = JSON.stringify({
    iss: saEmail,
    sub: subject,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  const signUrl =
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail)}:signJwt`;

  const signRes = await client.request({
    url: signUrl,
    method: 'POST',
    data: { payload },
  });

  const assertion = signRes.data.signedJwt;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`DWD token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokens = await tokenRes.json();
  const oauth = new GoogleAuth({ scopes: SCOPES });
  const oauthClient = await oauth.getClient();
  oauthClient.setCredentials({
    access_token: tokens.access_token,
    token_type: tokens.token_type || 'Bearer',
    expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
  });
  return oauthClient;
}

async function getDelegatedClient(subject) {
  const isLocal = process.env.NODE_ENV !== 'production';
  const saJson = loadServiceAccountJson();
  const saEmail = getServiceAccountEmail(saJson);

  if (saJson?.client_email && saJson?.private_key) {
    return new JWT({
      email: saJson.client_email,
      key: saJson.private_key,
      scopes: SCOPES,
      subject,
    });
  }

  if (isLocal && !process.env.GCP_PROJECT) {
    console.log('[GMAIL] No credentials — skipping DWD client in local dev');
    return null;
  }

  try {
    return await getDelegatedClientViaIam(subject, saEmail);
  } catch (err) {
    console.error(`[GMAIL] DWD auth failed for ${subject}:`, err.message);
    throw err;
  }
}

async function getGmailForMailbox(mailbox) {
  const auth = await getDelegatedClient(mailbox);
  if (!auth) return null;
  return gmailApi({ version: 'v1', auth });
}

function parseEmailAddress(header) {
  if (!header) return null;
  const match = header.match(/<([^>]+)>/);
  return (match ? match[1] : header).trim().toLowerCase();
}

function decodeBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  const parts = payload.parts || [];
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf8');
    }
  }
  for (const part of parts) {
    const nested = decodeBody(part);
    if (nested) return nested;
  }
  return '';
}

async function fetchRecentMessages(gmail, maxResults = 25) {
  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:inbox OR in:sent',
  });

  const messages = [];
  for (const item of list.data.messages || []) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: item.id,
      format: 'full',
    });
    const headers = full.data.payload?.headers || [];
    const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name)?.value;

    messages.push({
      id: full.data.id,
      threadId: full.data.threadId,
      subject: getHeader('subject') || '(no subject)',
      from: parseEmailAddress(getHeader('from')),
      to: parseEmailAddress(getHeader('to')),
      date: getHeader('date'),
      snippet: full.data.snippet,
      body: decodeBody(full.data.payload).slice(0, 4000),
      internalDate: full.data.internalDate,
    });
  }
  return messages;
}

module.exports = {
  getMailboxes,
  getGmailForMailbox,
  getDelegatedClient,
  fetchRecentMessages,
  SCOPES,
};
