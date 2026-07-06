const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { org_id, q } = req.query;
    let sql = `SELECT c.*, o.name AS organization_name FROM contacts c
               LEFT JOIN organizations o ON o.id = c.organization_id WHERE 1=1`;
    const params = [];

    if (org_id) {
      params.push(org_id);
      sql += ` AND c.organization_id = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }
    sql += ` ORDER BY c.last_name, c.first_name`;

    const result = await query(sql, params);
    res.json({ contacts: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const contact = await query(
      `SELECT c.*, o.name AS organization_name FROM contacts c
       LEFT JOIN organizations o ON o.id = c.organization_id
       WHERE c.id = $1`,
      [req.params.id],
    );
    if (!contact.rows[0]) return res.status(404).json({ error: 'Not found' });

    const timeline = await query(
      `SELECT a.*, i.lead_id, i.project_id
       FROM activities a
       JOIN interactions i ON i.activity_id = a.id
       WHERE i.contact_id = $1
       ORDER BY a.occurred_at DESC
       LIMIT 100`,
      [req.params.id],
    );

    res.json({ contact: contact.rows[0], timeline: timeline.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { organization_id, first_name, last_name, email, phone, role, notes } = req.body;
    if (!first_name?.trim()) return res.status(400).json({ error: 'First name required' });

    const result = await query(
      `INSERT INTO contacts (organization_id, first_name, last_name, email, phone, role, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        organization_id || null,
        first_name.trim(),
        last_name || null,
        email || null,
        phone || null,
        role || null,
        notes || null,
      ],
    );
    res.status(201).json({ contact: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { organization_id, first_name, last_name, email, phone, role, notes } = req.body;
    const result = await query(
      `UPDATE contacts SET
         organization_id = COALESCE($2, organization_id),
         first_name = COALESCE($3, first_name),
         last_name = COALESCE($4, last_name),
         email = COALESCE($5, email),
         phone = COALESCE($6, phone),
         role = COALESCE($7, role),
         notes = COALESCE($8, notes),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, organization_id, first_name, last_name, email, phone, role, notes],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ contact: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
