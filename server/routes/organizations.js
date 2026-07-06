const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM organizations ORDER BY name ASC`,
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const org = await query(`SELECT * FROM organizations WHERE id = $1`, [req.params.id]);
    if (!org.rows[0]) return res.status(404).json({ error: 'Not found' });

    const [contacts, leads, projects] = await Promise.all([
      query(`SELECT * FROM contacts WHERE organization_id = $1 ORDER BY last_name`, [req.params.id]),
      query(`SELECT * FROM leads WHERE organization_id = $1 ORDER BY updated_at DESC`, [req.params.id]),
      query(`SELECT * FROM projects WHERE organization_id = $1 ORDER BY updated_at DESC`, [req.params.id]),
    ]);

    res.json({
      organization: org.rows[0],
      contacts: contacts.rows,
      leads: leads.rows,
      projects: projects.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, sector, website, tags, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const result = await query(
      `INSERT INTO organizations (name, sector, website, tags, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), sector || null, website || null, tags || [], notes || null],
    );
    res.status(201).json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, sector, website, tags, notes } = req.body;
    const result = await query(
      `UPDATE organizations SET
         name = COALESCE($2, name),
         sector = COALESCE($3, sector),
         website = COALESCE($4, website),
         tags = COALESCE($5, tags),
         notes = COALESCE($6, notes),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, sector, website, tags, notes],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(`DELETE FROM organizations WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
