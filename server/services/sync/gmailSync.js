const { query } = require('../../db');
const { getMailboxes, getGmailForMailbox, fetchRecentMessages } = require('../gmail');
const { summarizeEmail } = require('../gemini');

async function findContactByEmail(email) {
  if (!email) return null;
  const result = await query(
    `SELECT c.*, l.id AS lead_id FROM contacts c
     LEFT JOIN leads l ON l.contact_id = c.id
     WHERE LOWER(c.email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] || null;
}

async function syncMailbox(mailbox) {
  const gmail = await getGmailForMailbox(mailbox);
  if (!gmail) {
    return { mailbox, synced: 0, skipped: true, reason: 'no_credentials' };
  }

  const messages = await fetchRecentMessages(gmail, 30);
  let synced = 0;

  for (const msg of messages) {
    const existing = await query(
      `SELECT id FROM activities WHERE raw_ref = $1`,
      [`gmail:${msg.id}`],
    );
    if (existing.rows[0]) continue;

    const contactEmail = msg.from?.includes('phoeniciantech.com') ? msg.to : msg.from;
    const contact = await findContactByEmail(contactEmail);

    let summary = msg.snippet;
    try {
      summary = await summarizeEmail(msg);
    } catch (err) {
      console.warn('[GMAIL-SYNC] Summary failed:', err.message);
    }

    const triageStatus = contact ? 'matched' : 'pending';

    const activity = await query(
      `INSERT INTO activities (type, occurred_at, summary, raw_ref, mailbox, metadata, triage_status)
       VALUES ('email', to_timestamp($1::bigint / 1000.0), $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        msg.internalDate || Date.now(),
        summary,
        `gmail:${msg.id}`,
        mailbox,
        JSON.stringify({ subject: msg.subject, from: msg.from, to: msg.to, threadId: msg.threadId }),
        triageStatus,
      ],
    );

    if (contact) {
      await query(
        `INSERT INTO interactions (activity_id, contact_id, lead_id)
         VALUES ($1, $2, $3)`,
        [activity.rows[0].id, contact.id, contact.lead_id || null],
      );

      if (contact.lead_id) {
        await query(
          `UPDATE leads SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [contact.lead_id],
        );
      }
    } else if (contactEmail && !contactEmail.includes('phoeniciantech.com')) {
      // Unmatched external sender — stays in triage queue for manual review
    }

    synced++;
  }

  await query(
    `INSERT INTO sync_state (mailbox, sync_type, last_sync_at, cursor_value)
     VALUES ($1, 'gmail', NOW(), $2)
     ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW(), cursor_value = EXCLUDED.cursor_value`,
    [mailbox, String(Date.now())],
  );

  return { mailbox, synced };
}

async function runGmailSync() {
  const mailboxes = getMailboxes();
  const results = [];

  for (const mailbox of mailboxes) {
    try {
      const result = await syncMailbox(mailbox);
      results.push(result);
      console.log(`[GMAIL-SYNC] ${mailbox}: synced ${result.synced}`);
    } catch (err) {
      console.error(`[GMAIL-SYNC] ${mailbox} failed:`, err.message);
      results.push({ mailbox, error: err.message });
    }
  }

  return { ok: true, results };
}

module.exports = { runGmailSync, syncMailbox };
