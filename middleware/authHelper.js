const jwt = require('jsonwebtoken');

/**
 * Helper to verify JWT token in Next.js API routes.
 * Modifies the response and returns null if validation fails.
 * Returns the decoded user object if validation succeeds.
 */
function verifyAuth(req, res) {
  const token = req.headers['x-auth-token'];

  if (!token) {
    res.status(401).json({ msg: 'No token, authorization denied' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.user;
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
    return null;
  }
}

module.exports = verifyAuth;
