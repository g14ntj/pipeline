const { query } = require('../../db');
const { getMailboxes } = require('../gmail');
const { getDriveClient, listFilesInFolder, exportGoogleDoc } = require('../drive');
const { extractMeetingNotes } = require('../gemini');
const { curateFromOrganizationName } = require('../leadCurator');

async function matchContactByAttendees(attendees) {
  for (const attendee of attendees || []) {
    const email = String(attendee).includes('@') ? attendee : null;
    if (!email) continue;
    const result = await query(
      `SELECT id FROM contacts WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    if (result.rows[0]) return result.rows[0].id;
  }
  return null;
}

async function syncDriveNotes() {
  const folderId = (process.env.PIPELINE_DRIVE_NOTES_FOLDER_ID || '').trim();
  if (!folderId) {
    return { ok: true, synced: 0, skipped: true, reason: 'PIPELINE_DRIVE_NOTES_FOLDER_ID not set' };
  }

  const mailboxes = getMailboxes();
  const subject = mailboxes[0];
  if (!subject) return { ok: true, synced: 0, skipped: true, reason: 'no_mailboxes' };

  const drive = await getDriveClient(subject);
  if (!drive) return { ok: true, synced: 0, skipped: true, reason: 'no_credentials' };

  const files = await listFilesInFolder(drive, folderId);
  let synced = 0;

  for (const file of files) {
    if (!file.mimeType?.includes('document')) continue;

    const existing = await query(
      `SELECT id FROM drive_notes WHERE drive_file_id = $1`,
      [file.id],
    );
    if (existing.rows[0]) continue;

    let text = '';
    try {
      text = await exportGoogleDoc(drive, file.id);
    } catch (err) {
      console.warn(`[DRIVE-SYNC] Export failed for ${file.name}:`, err.message);
      continue;
    }

    let extracted = { attendees: [], decisions: '', action_items: [] };
    try {
      extracted = await extractMeetingNotes(text);
    } catch (err) {
      console.warn('[DRIVE-SYNC] Extraction failed:', err.message);
    }

    const contactId = await matchContactByAttendees(extracted.attendees);

    let linkedLeadId = null;
    let linkedOrgId = null;
    if (extracted.organization) {
      const mailboxes = getMailboxes();
      const curated = await curateFromOrganizationName({
        organizationName: extracted.organization,
        attendees: extracted.attendees,
        subject: file.name,
        mailbox: mailboxes[0],
      });
      if (curated) {
        linkedLeadId = curated.lead?.id || null;
        linkedOrgId = curated.org?.id || null;
      }
    }

    const note = await query(
      `INSERT INTO drive_notes (drive_file_id, title, attendees, decisions, action_items, extracted_at, linked_contact_id, linked_lead_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING id`,
      [
        file.id,
        file.name,
        extracted.attendees || [],
        extracted.decisions || null,
        JSON.stringify(extracted.action_items || []),
        contactId,
        linkedLeadId,
      ],
    );

    const activity = await query(
      `INSERT INTO activities (type, summary, raw_ref, metadata, triage_status)
       VALUES ('drive_doc', $1, $2, $3, 'matched') RETURNING id`,
      [
        extracted.decisions || `Meeting notes: ${file.name}`,
        `drive:${file.id}`,
        JSON.stringify({ title: file.name, action_items: extracted.action_items }),
      ],
    );

    if (contactId) {
      await query(
        `INSERT INTO interactions (activity_id, contact_id) VALUES ($1, $2)`,
        [activity.rows[0].id, contactId],
      );
    }

    synced++;
  }

  await query(
    `INSERT INTO sync_state (mailbox, sync_type, last_sync_at)
     VALUES ($1, 'drive', NOW())
     ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW()`,
    [`drive:${folderId}`],
  );

  return { ok: true, synced };
}

module.exports = { syncDriveNotes };
