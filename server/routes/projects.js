const express = require('express');
const { query } = require('../db');
const { PROJECT_STATUSES } = require('../../shared/types.cjs');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `SELECT p.*, o.name AS organization_name
               FROM projects p
               LEFT JOIN organizations o ON o.id = p.organization_id
               WHERE 1=1`;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }
    sql += ` ORDER BY p.updated_at DESC`;

    const result = await query(sql, params);
    res.json({ projects: result.rows, statuses: PROJECT_STATUSES });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { organization_id, name, status, product_line, description, start_date, end_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const result = await query(
      `INSERT INTO projects (organization_id, name, status, product_line, description, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        organization_id || null,
        name.trim(),
        status || 'active',
        product_line || null,
        description || null,
        start_date || null,
        end_date || null,
      ],
    );
    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { organization_id, name, status, product_line, description, start_date, end_date } = req.body;
    const result = await query(
      `UPDATE projects SET
         organization_id = COALESCE($2, organization_id),
         name = COALESCE($3, name),
         status = COALESCE($4, status),
         product_line = COALESCE($5, product_line),
         description = COALESCE($6, description),
         start_date = COALESCE($7, start_date),
         end_date = COALESCE($8, end_date),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, organization_id, name, status, product_line, description, start_date, end_date],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
