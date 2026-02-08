import jwt from 'jsonwebtoken';

// ============ JWT TOKEN GENERATION UTILITIES ============
// Helper functions for creating and managing JWT tokens

/**
 * Generate access token (short-lived, 15 minutes)
 * @param {string} userId - MongoDB user ID
 * @param {string} email - User email
 * @param {string} role - User role (foreman, maintenance, road)
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    {
      userId,
      email,
      role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token (long-lived, 7 days)
 * @param {string} userId - MongoDB user ID
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - Token to decode
 * @returns {object} Decoded token payload
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};
