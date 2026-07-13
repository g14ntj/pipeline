const { query } = require('../../db');
const { getMailboxes } = require('../gmail');
const { getCalendarClient, listCalendarEvents } = require('../calendar');
const { curateFromAttendee, isInternalEmail } = require('../leadCurator');

function eventTimestamp(event) {
  const start = event.start?.dateTime || event.start?.date;
  return start ? new Date(start).getTime() : Date.now();
}

function externalAttendees(event) {
  return (event.attendees || []).filter((a) => {
    const email = (a.email || '').toLowerCase();
    return email && !a.self && !isInternalEmail(email) && !a.resource;
  });
}

async function syncMailboxEvents(mailbox) {
  const calendar = await getCalendarClient(mailbox);
  if (!calendar) {
    return { mailbox, synced: 0, leadsCreated: 0, skipped: true, reason: 'no_credentials' };
  }

  const events = await listCalendarEvents(calendar, mailbox);
  let synced = 0;
  let leadsCreated = 0;

  for (const event of events) {
    if (event.status === 'cancelled') continue;

    const rawRef = `gcal:${event.id}`;
    const existing = await query(`SELECT id FROM activities WHERE raw_ref = $1`, [rawRef]);
    if (existing.rows[0]) continue;

    const externals = externalAttendees(event);
    if (!externals.length) continue;

    const summary = event.summary || 'Meeting';
    const activity = await query(
      `INSERT INTO activities (type, occurred_at, summary, raw_ref, mailbox, metadata, triage_status)
       VALUES ('meeting', to_timestamp($1 / 1000.0), $2, $3, $4, $5, 'matched')
       RETURNING id`,
      [
        eventTimestamp(event),
        summary,
        rawRef,
        mailbox,
        JSON.stringify({
          subject: summary,
          attendees: event.attendees?.map((a) => a.email),
          organizer: event.organizer?.email,
          htmlLink: event.htmlLink,
        }),
      ],
    );

    for (const attendee of externals) {
      const result = await curateFromAttendee({
        email: attendee.email,
        displayName: attendee.displayName,
        subject: summary,
        mailbox,
        activityId: activity.rows[0].id,
      });
      if (result?.created) leadsCreated++;
    }

    synced++;
  }

  await query(
    `INSERT INTO sync_state (mailbox, sync_type, last_sync_at)
     VALUES ($1, 'calendar_events', NOW())
     ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW(), sync_type = 'calendar_events'`,
    [`calendar-events:${mailbox}`],
  );

  return { mailbox, synced, leadsCreated };
}

async function runCalendarEventSync() {
  const mailboxes = getMailboxes();
  const results = [];

  for (const mailbox of mailboxes) {
    try {
      const result = await syncMailboxEvents(mailbox);
      results.push(result);
      console.log(`[CALENDAR-SYNC] ${mailbox}: ${result.synced} events, ${result.leadsCreated} new leads`);
    } catch (err) {
      console.error(`[CALENDAR-SYNC] ${mailbox} failed:`, err.message);
      results.push({ mailbox, error: err.message });
    }
  }

  return { ok: true, results };
}

module.exports = { runCalendarEventSync, syncMailboxEvents };
