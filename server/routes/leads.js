const express = require('express');
const { query } = require('../db');
const { LEAD_STAGES } = require('../../shared/types.cjs');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { stage, org_id } = req.query;
    let sql = `SELECT l.*, o.name AS organization_name,
                      c.first_name AS contact_first_name, c.last_name AS contact_last_name, c.email AS contact_email
               FROM leads l
               LEFT JOIN organizations o ON o.id = l.organization_id
               LEFT JOIN contacts c ON c.id = l.contact_id
               WHERE 1=1`;
    const params = [];

    if (stage) {
      params.push(stage);
      sql += ` AND l.stage = $${params.length}`;
    }
    if (org_id) {
      params.push(org_id);
      sql += ` AND l.organization_id = $${params.length}`;
    }
    sql += ` ORDER BY l.updated_at DESC`;

    const result = await query(sql, params);
    res.json({ leads: result.rows, stages: LEAD_STAGES });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await query(
      `SELECT l.*, o.name AS organization_name,
              c.first_name AS contact_first_name, c.last_name AS contact_last_name
       FROM leads l
       LEFT JOIN organizations o ON o.id = l.organization_id
       LEFT JOIN contacts c ON c.id = l.contact_id
       WHERE l.id = $1`,
      [req.params.id],
    );
    if (!lead.rows[0]) return res.status(404).json({ error: 'Not found' });

    const timeline = await query(
      `SELECT a.* FROM activities a
       JOIN interactions i ON i.activity_id = a.id
       WHERE i.lead_id = $1
       ORDER BY a.occurred_at DESC`,
      [req.params.id],
    );

    res.json({ lead: lead.rows[0], timeline: timeline.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      organization_id,
      organization_name,
      contact_id,
      contact_first_name,
      contact_last_name,
      contact_email,
      stage,
      owner_email,
      estimated_value,
      source,
      notes,
      next_action_date,
    } = req.body;

    if (!title?.trim() && !contact_first_name?.trim()) {
      return res.status(400).json({ error: 'Title or contact name required' });
    }

    let orgId = organization_id || null;
    if (!orgId && organization_name?.trim()) {
      const org = await query(
        `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
        [organization_name.trim()],
      );
      orgId = org.rows[0].id;
    }

    let contactId = contact_id || null;
    if (!contactId && (contact_first_name || contact_email)) {
      const contact = await query(
        `INSERT INTO contacts (organization_id, first_name, last_name, email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          orgId,
          contact_first_name?.trim() || 'Unknown',
          contact_last_name || null,
          contact_email || null,
        ],
      );
      contactId = contact.rows[0].id;
    }

    const leadTitle =
      title?.trim() ||
      `${contact_first_name || ''} ${contact_last_name || ''}`.trim() ||
      'New lead';

    const result = await query(
      `INSERT INTO leads (
         organization_id, contact_id, title, stage, owner_email,
         estimated_value, source, notes, next_action_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        orgId,
        contactId,
        leadTitle,
        stage || 'new',
        owner_email || req.user?.email || null,
        estimated_value || null,
        source || 'manual',
        notes || null,
        next_action_date || null,
      ],
    );

    res.status(201).json({ lead: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const {
      title, stage, organization_id, contact_id, owner_email,
      estimated_value, source, notes, warmth_score, next_action_date,
    } = req.body;

    if (stage && !LEAD_STAGES.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const result = await query(
      `UPDATE leads SET
         title = COALESCE($2, title),
         stage = COALESCE($3, stage),
         organization_id = COALESCE($4, organization_id),
         contact_id = COALESCE($5, contact_id),
         owner_email = COALESCE($6, owner_email),
         estimated_value = COALESCE($7, estimated_value),
         source = COALESCE($8, source),
         notes = COALESCE($9, notes),
         warmth_score = COALESCE($10, warmth_score),
         next_action_date = COALESCE($11, next_action_date),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id, title, stage, organization_id, contact_id, owner_email,
        estimated_value, source, notes, warmth_score, next_action_date,
      ],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ lead: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(`DELETE FROM leads WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
