const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { type, summary, occurred_at, contact_id, lead_id, project_id, raw_ref, metadata } = req.body;
    if (!type) return res.status(400).json({ error: 'Activity type required' });

    const activity = await query(
      `INSERT INTO activities (type, summary, occurred_at, raw_ref, metadata)
       VALUES ($1, $2, COALESCE($3, NOW()), $4, $5) RETURNING *`,
      [type, summary || null, occurred_at || null, raw_ref || null, metadata || {}],
    );

    if (contact_id || lead_id || project_id) {
      await query(
        `INSERT INTO interactions (activity_id, contact_id, lead_id, project_id)
         VALUES ($1, $2, $3, $4)`,
        [activity.rows[0].id, contact_id || null, lead_id || null, project_id || null],
      );
    }

    res.status(201).json({ activity: activity.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
