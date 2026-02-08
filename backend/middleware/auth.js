import jwt from 'jsonwebtoken';

// ============ JWT TOKEN VERIFICATION MIDDLEWARE ============
// This middleware verifies the JWT token from the Authorization header
// and attaches the decoded user info to req.user

export const verifyToken = (req, res, next) => {
  try {
    // Extract token from Authorization header (format: "Bearer <token>")
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided. Please log in.' 
      });
    }

    // Verify token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object for use in route handlers
    req.user = decoded;
    next();
  } catch (error) {
    // Token expired or invalid
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please refresh your token.' 
      });
    }

    res.status(401).json({ 
      error: 'Invalid token. Please log in again.' 
    });
  }
};

// ============ ROLE-BASED ACCESS CONTROL ============
// Middleware to check if user has required role
export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};
