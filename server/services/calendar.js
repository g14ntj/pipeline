const { calendar: calendarApi } = require('@googleapis/calendar');
const { getDelegatedClient } = require('./gmail');

async function getCalendarClient(subject) {
  const auth = await getDelegatedClient(subject);
  if (!auth) return null;
  return calendarApi({ version: 'v3', auth });
}

async function getFreeBusy(calendar, calendars, timeMin, timeMax) {
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: calendars.map((id) => ({ id })),
    },
  });
  return res.data.calendars || {};
}

function suggestSlots(busyMap, durationMins = 30, count = 3) {
  const slots = [];
  const now = new Date();
  const workStart = 9;
  const workEnd = 17;

  for (let day = 0; day < 5 && slots.length < count; day++) {
    const d = new Date(now);
    d.setDate(d.getDate() + day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    for (let hour = workStart; hour < workEnd && slots.length < count; hour++) {
      const start = new Date(d);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + durationMins * 60 * 1000);

      const busy = Object.values(busyMap).some((cal) =>
        (cal.busy || []).some((b) => {
          const bStart = new Date(b.start).getTime();
          const bEnd = new Date(b.end).getTime();
          return start.getTime() < bEnd && end.getTime() > bStart;
        }),
      );

      if (!busy && start > now) {
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return slots;
}

async function listCalendarEvents(calendar, _calendarId, daysBack = 90, daysForward = 30) {
  const timeMin = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + daysForward * 24 * 60 * 60 * 1000).toISOString();

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  return res.data.items || [];
}

module.exports = { getCalendarClient, getFreeBusy, suggestSlots, listCalendarEvents };
