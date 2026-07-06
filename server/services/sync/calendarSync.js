const { query } = require('../../db');
const { getMailboxes } = require('../gmail');
const { getCalendarClient, getFreeBusy, suggestSlots } = require('../calendar');

async function buildOutreachQueue() {
  const warmLeads = await query(
    `SELECT l.*, c.email, c.first_name, c.last_name
     FROM leads l
     LEFT JOIN contacts c ON c.id = l.contact_id
     WHERE l.stage IN ('qualified', 'proposal', 'negotiation', 'contacted')
       AND l.next_action_date IS NOT NULL
       AND l.next_action_date <= CURRENT_DATE
       AND (l.last_activity_at IS NULL OR l.last_activity_at < NOW() - INTERVAL '7 days')
       AND NOT EXISTS (
         SELECT 1 FROM outreach_queue oq
         WHERE oq.lead_id = l.id AND oq.status IN ('pending', 'scheduled')
       )`,
  );

  const mailboxes = getMailboxes();
  const calendarIds = mailboxes.map((m) => m);
  let slots = [];

  if (calendarIds.length) {
    const calendar = await getCalendarClient(calendarIds[0]);
    if (calendar) {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const busy = await getFreeBusy(calendar, calendarIds, timeMin, timeMax);
      slots = suggestSlots(busy, 30, 5);
    }
  }

  let created = 0;
  for (const lead of warmLeads.rows) {
    await query(
      `INSERT INTO outreach_queue (lead_id, priority, reason, suggested_slots)
       VALUES ($1, $2, $3, $4)`,
      [
        lead.id,
        lead.warmth_score || 50,
        `Follow-up due (stage: ${lead.stage})`,
        JSON.stringify(slots),
      ],
    );
    created++;
  }

  if (calendarIds.length) {
    await query(
      `INSERT INTO sync_state (mailbox, sync_type, last_sync_at)
       VALUES ($1, 'calendar', NOW())
       ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW()`,
      [`calendar:${calendarIds[0]}`],
    );
  }

  return { ok: true, outreachCreated: created, suggestedSlots: slots };
}

module.exports = { buildOutreachQueue };
