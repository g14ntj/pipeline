function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

function attachUser(req, res, next) {
  req.user = req.session?.user || null;
  next();
}

module.exports = { requireAuth, attachUser };
