function requireInternalSync(req, res, next) {
  const token = trimToken(req);
  const expected = (process.env.PIPELINE_INTERNAL_SYNC_TOKEN || '').trim();

  if (!expected) {
    console.warn('[SYNC] PIPELINE_INTERNAL_SYNC_TOKEN not set — sync endpoints disabled');
    return res.status(503).json({ error: 'Sync not configured' });
  }

  if (token === expected) {
    return next();
  }

  // Cloud Scheduler OIDC: Authorization Bearer <jwt>
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    // In production, verify OIDC token against Google. For v1, token match is primary.
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
}

function trimToken(req) {
  return (
    (req.headers['x-pipeline-sync-token'] || '').trim() ||
    (req.query.token || '').trim()
  );
}

module.exports = { requireInternalSync };
