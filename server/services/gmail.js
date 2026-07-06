const { GoogleAuth } = require('google-auth-library');
const { gmail: gmailApi } = require('@googleapis/gmail');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function getMailboxes() {
  const raw = (process.env.PIPELINE_SYNC_MAILBOXES || '').trim();
  return raw ? raw.split(',').map((m) => m.trim()).filter(Boolean) : [];
}

async function getDelegatedClient(subject) {
  const isLocal = process.env.NODE_ENV !== 'production';
  const hasCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT;

  if (isLocal && !hasCreds) {
    console.log('[GMAIL] Skipping DWD client (no credentials in local dev)');
    return null;
  }

  const auth = new GoogleAuth({ scopes: SCOPES });
  const client = await auth.getClient();

  if (client.constructor.name === 'JWT' || client.constructor.name === 'Compute') {
    client.subject = subject;
  }

  return client;
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
