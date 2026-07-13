const { query } = require('../../db');
const { getMailboxes, getGmailForMailbox, fetchRecentMessages } = require('../gmail');
const { summarizeEmail } = require('../gemini');
const { curateFromEmail, shouldSkipEmail } = require('../leadCurator');

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
    return { mailbox, synced: 0, leadsCreated: 0, skipped: true, reason: 'no_credentials' };
  }

  const messages = await fetchRecentMessages(gmail, 50);
  let synced = 0;
  let leadsCreated = 0;

  for (const msg of messages) {
    const existing = await query(
      `SELECT id FROM activities WHERE raw_ref = $1`,
      [`gmail:${msg.id}`],
    );
    if (existing.rows[0]) continue;

    const isOutbound = msg.from?.includes('phoeniciantech.com');
    const contactEmail = isOutbound ? msg.to : msg.from;
    const contact = await findContactByEmail(contactEmail);

    let summary = msg.snippet;
    const useAi = process.env.PIPELINE_SYNC_USE_AI === 'true';
    if (useAi) {
      try {
        summary = await summarizeEmail(msg);
      } catch (err) {
        console.warn('[GMAIL-SYNC] Summary failed:', err.message);
      }
    }

    let triageStatus = contact ? 'matched' : 'pending';

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
    } else if (contactEmail && !shouldSkipEmail(contactEmail)) {
      const curated = await curateFromEmail({
        email: contactEmail,
        subject: msg.subject,
        summary,
        mailbox,
        activityId: activity.rows[0].id,
        fromHeader: msg.from,
      });

      if (curated) {
        triageStatus = 'matched';
        await query(
          `UPDATE activities SET triage_status = 'matched' WHERE id = $1`,
          [activity.rows[0].id],
        );
        if (curated.created) leadsCreated++;
      }
    }

    synced++;
  }

  await query(
    `INSERT INTO sync_state (mailbox, sync_type, last_sync_at, cursor_value)
     VALUES ($1, 'gmail', NOW(), $2)
     ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW(), cursor_value = EXCLUDED.cursor_value`,
    [mailbox, String(Date.now())],
  );

  return { mailbox, synced, leadsCreated };
}

async function runGmailSync() {
  const mailboxes = getMailboxes();
  const results = [];

  for (const mailbox of mailboxes) {
    try {
      const result = await syncMailbox(mailbox);
      results.push(result);
      console.log(`[GMAIL-SYNC] ${mailbox}: synced ${result.synced}, ${result.leadsCreated} new leads`);
    } catch (err) {
      console.error(`[GMAIL-SYNC] ${mailbox} failed:`, err.message);
      results.push({ mailbox, error: err.message });
    }
  }

  return { ok: true, results };
}

module.exports = { runGmailSync, syncMailbox };
