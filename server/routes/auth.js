const express = require('express');
const { getAuthUrl, exchangeCode, oauthConfigured } = require('../auth');
const { query } = require('../db');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({ configured: oauthConfigured() });
});

router.get('/login', (_req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  try {
    const profile = await exchangeCode(code);

    const result = await query(
      `INSERT INTO users (email, name, picture, last_login_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         last_login_at = NOW()
       RETURNING id, email, name, picture`,
      [profile.email, profile.name, profile.picture],
    );

    req.session.user = result.rows[0];
    res.redirect(appUrl);
  } catch (err) {
    console.error('[AUTH] Callback failed:', err.message);
    res.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

module.exports = router;
