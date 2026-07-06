const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT a.* FROM activities a
       WHERE a.triage_status = 'pending'
       ORDER BY a.occurred_at DESC
       LIMIT 50`,
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/match', async (req, res, next) => {
  try {
    const { contact_id, lead_id, organization_id } = req.body;

    await query(
      `UPDATE activities SET triage_status = 'matched' WHERE id = $1`,
      [req.params.id],
    );

    if (contact_id || lead_id) {
      await query(
        `INSERT INTO interactions (activity_id, contact_id, lead_id)
         VALUES ($1, $2, $3)`,
        [req.params.id, contact_id || null, lead_id || null],
      );
    }

    if (organization_id && !lead_id) {
      const lead = await query(
        `INSERT INTO leads (organization_id, title, stage, source)
         VALUES ($1, $2, 'new', 'email_triage') RETURNING id`,
        [organization_id, 'Triage lead'],
      );
      await query(
        `INSERT INTO interactions (activity_id, lead_id) VALUES ($1, $2)`,
        [req.params.id, lead.rows[0].id],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/dismiss', async (req, res, next) => {
  try {
    await query(
      `UPDATE activities SET triage_status = 'dismissed' WHERE id = $1`,
      [req.params.id],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
