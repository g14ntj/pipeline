const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { pool } = require('./db');
const { attachUser } = require('./middleware/auth');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/organizations');
const contactRoutes = require('./routes/contacts');
const leadRoutes = require('./routes/leads');
const projectRoutes = require('./routes/projects');
const activityRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const triageRoutes = require('./routes/triage');
const outreachRoutes = require('./routes/outreach');
const syncRoutes = require('./routes/internal/sync');
const { runMigrations } = require('./migrate');

const app = express();
const PORT = Number(process.env.SERVER_PORT || 8081);
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

if (!isProd) {
  app.use(
    cors({
      origin: process.env.APP_URL || 'http://localhost:5173',
      credentials: true,
    }),
  );
}

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.PIPELINE_SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(attachUser);

// Public auth routes
app.use('/api/auth', authRoutes);

// Protected API
app.use('/api/organizations', requireAuth, orgRoutes);
app.use('/api/contacts', requireAuth, contactRoutes);
app.use('/api/leads', requireAuth, leadRoutes);
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/activities', requireAuth, activityRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/triage', requireAuth, triageRoutes);
app.use('/api/outreach', requireAuth, outreachRoutes);
app.use('/api/internal/sync', syncRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'pipeline' });
});

// Serve React build in production — require sign-in for all app routes
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();

    const isLoginPage = req.path === '/login' || req.path === '/login/';
    if (!isLoginPage && !req.session?.user) {
      return res.redirect('/login');
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[API] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('[PIPELINE] Migration failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[PIPELINE] Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

start();

module.exports = app;
