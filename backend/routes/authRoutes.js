import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validateSignup,
  validateLogin,
  handleValidationErrors
} from '../middleware/validation.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwtUtils.js';

const router = express.Router();

// ============ SIGNUP ============
// Register new user with email and password
router.post(
  '/signup',
  validateSignup,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = new User({
      name,
      email,
      passwordHash: password,
      role: role || 'foreman'
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  })
);

// ============ LOGIN ============
// Authenticate user with email and password
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email (select password for comparison)
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is locked due to too many failed attempts
    if (user.isLocked()) {
      return res.status(429).json({
        error: 'Account locked. Too many failed login attempts. Try again later.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database (limit to 5 tokens per user)
    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); // Remove oldest token
    }
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  })
);

// ============ REFRESH TOKEN ============
// Get new access token using refresh token
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user and check if token exists in database
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
      if (!tokenExists) {
        return res.status(401).json({ error: 'Refresh token not found' });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user._id, user.email, user.role);

      res.status(200).json({
        message: 'Token refreshed',
        accessToken: newAccessToken
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  })
);

// ============ LOGOUT ============
// Invalidate refresh token
router.post(
  '/logout',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from database
      const user = await User.findById(req.user.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        await user.save();
      }
    }

    res.status(200).json({ message: 'Logout successful' });
  })
);

// ============ UPDATE LOCATION PERMISSION ============
// Allow user to grant or revoke location permission
router.patch(
  '/location-permission',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { locationPermission } = req.body;

    if (typeof locationPermission !== 'boolean') {
      return res.status(400).json({ error: 'locationPermission must be boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { locationPermission },
      { new: true }
    );

    res.status(200).json({
      message: 'Location permission updated',
      user: user.toJSON()
    });
  })
);

// ============ GET CURRENT USER ============
// Get authenticated user profile
router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: user.toJSON()
    });
  })
);

export default router;
