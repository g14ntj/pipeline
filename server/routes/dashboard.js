const express = require('express');
const { query } = require('../db');
const { STALE_LEAD_DAYS, LEAD_STAGES } = require('../../shared/types.cjs');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const [funnel, stale, projects, outreach, actionItems, syncStatus, triageCount, counts] = await Promise.all([
      query(
        `SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage`,
      ),
      query(
        `SELECT l.*, o.name AS organization_name
         FROM leads l
         LEFT JOIN organizations o ON o.id = l.organization_id
         WHERE l.stage NOT IN ('won', 'lost')
           AND (l.last_activity_at IS NULL OR l.last_activity_at < NOW() - INTERVAL '${STALE_LEAD_DAYS} days')
         ORDER BY l.last_activity_at NULLS FIRST
         LIMIT 20`,
      ),
      query(
        `SELECT p.*, o.name AS organization_name
         FROM projects p
         LEFT JOIN organizations o ON o.id = p.organization_id
         WHERE p.status IN ('active', 'in_process', 'production')
         ORDER BY
           CASE p.status WHEN 'production' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
           p.updated_at DESC
         LIMIT 30`,
      ),
      query(
        `SELECT oq.*, l.title AS lead_title, l.stage, c.email AS contact_email,
                c.first_name, c.last_name, org.name AS organization_name
         FROM outreach_queue oq
         JOIN leads l ON l.id = oq.lead_id
         LEFT JOIN contacts c ON c.id = l.contact_id
         LEFT JOIN organizations org ON org.id = l.organization_id
         WHERE oq.status = 'pending'
         ORDER BY oq.priority DESC, oq.created_at ASC
         LIMIT 20`,
      ),
      query(
        `SELECT dn.* FROM drive_notes dn
         WHERE jsonb_array_length(dn.action_items) > 0
         ORDER BY dn.updated_at DESC LIMIT 10`,
      ),
      query(`SELECT mailbox, sync_type, last_sync_at, metadata FROM sync_state ORDER BY last_sync_at DESC`),
      query(`SELECT COUNT(*)::int AS count FROM activities WHERE triage_status = 'pending'`),
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM leads) AS leads,
           (SELECT COUNT(*)::int FROM contacts) AS contacts,
           (SELECT COUNT(*)::int FROM organizations) AS organizations,
           (SELECT COUNT(*)::int FROM projects) AS projects,
           (SELECT COUNT(*)::int FROM projects WHERE status = 'production') AS production_projects`,
      ),
    ]);

    const funnelCounts = {};
    for (const stage of LEAD_STAGES) funnelCounts[stage] = 0;
    for (const row of funnel.rows) funnelCounts[row.stage] = row.count;

    res.json({
      funnel: funnelCounts,
      staleLeads: stale.rows,
      activeProjects: projects.rows,
      outreachQueue: outreach.rows,
      openActionItems: actionItems.rows,
      syncStatus: syncStatus.rows,
      triageCount: triageCount.rows[0]?.count || 0,
      counts: counts.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
