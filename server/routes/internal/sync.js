const express = require('express');
const { requireInternalSync } = require('../../middleware/internal');
const { runGmailSync } = require('../../services/sync/gmailSync');
const { syncDriveNotes } = require('../../services/sync/driveSync');
const { buildOutreachQueue } = require('../../services/sync/calendarSync');
const { runCalendarEventSync } = require('../../services/sync/calendarEventSync');
const { runGithubGcpSync } = require('../../services/sync/githubGcpSync');

const router = express.Router();

router.use(requireInternalSync);

router.post('/gmail', async (_req, res, next) => {
  try {
    const result = await runGmailSync();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/drive', async (_req, res, next) => {
  try {
    const result = await syncDriveNotes();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/calendar', async (_req, res, next) => {
  try {
    const result = await buildOutreachQueue();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/calendar-events', async (_req, res, next) => {
  try {
    const result = await runCalendarEventSync();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/github-gcp', async (_req, res, next) => {
  try {
    const result = await runGithubGcpSync();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/all', async (_req, res, next) => {
  try {
    const [githubGcp, gmail, calendarEvents, drive, calendar] = await Promise.all([
      runGithubGcpSync(),
      runGmailSync(),
      runCalendarEventSync(),
      syncDriveNotes(),
      buildOutreachQueue(),
    ]);
    res.json({ githubGcp, gmail, calendarEvents, drive, calendar });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
