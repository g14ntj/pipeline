const express = require('express');
const { requireInternalSync } = require('../../middleware/internal');
const { runGmailSync } = require('../../services/sync/gmailSync');
const { syncDriveNotes } = require('../../services/sync/driveSync');
const { buildOutreachQueue } = require('../../services/sync/calendarSync');

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

router.post('/all', async (_req, res, next) => {
  try {
    const [gmail, drive, calendar] = await Promise.all([
      runGmailSync(),
      syncDriveNotes(),
      buildOutreachQueue(),
    ]);
    res.json({ gmail, drive, calendar });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
