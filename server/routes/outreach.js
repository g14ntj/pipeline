const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT oq.*, l.title, l.stage, l.warmth_score, l.next_action_date,
              c.email, c.first_name, c.last_name, o.name AS organization_name
       FROM outreach_queue oq
       JOIN leads l ON l.id = oq.lead_id
       LEFT JOIN contacts c ON c.id = l.contact_id
       LEFT JOIN organizations o ON o.id = l.organization_id
       WHERE oq.status IN ('pending', 'scheduled')
       ORDER BY oq.priority DESC`,
    );
    res.json({ queue: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    await query(
      `UPDATE outreach_queue SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [req.params.id],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
