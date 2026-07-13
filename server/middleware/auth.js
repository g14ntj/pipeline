const { isAllowedUser } = require('../auth');

function requireAuth(req, res, next) {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!isAllowedUser(user.email)) {
    req.session.destroy(() => {});
    return res.status(403).json({ error: 'Your account is not authorized to access Pipeline' });
  }
  return next();
}

function attachUser(req, res, next) {
  const user = req.session?.user;
  if (user && !isAllowedUser(user.email)) {
    req.session.destroy(() => {});
    req.user = null;
  } else {
    req.user = user || null;
  }
  next();
}

module.exports = { requireAuth, attachUser };
