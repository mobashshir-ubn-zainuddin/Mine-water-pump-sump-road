import { body, validationResult } from 'express-validator';

// ============ VALIDATION MIDDLEWARE ============
// Middleware to validate request bodies and handle validation errors

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ============ AUTH VALIDATION RULES ============
export const validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['foreman', 'maintenance', 'road'])
    .optional()
    .withMessage('Invalid role')
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ============ SUMP VALIDATION RULES ============
export const validateSumpCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Sump name is required'),
  body('length')
    .isFloat({ min: 0.1 })
    .withMessage('Length must be a positive number'),
  body('width')
    .isFloat({ min: 0.1 })
    .withMessage('Width must be a positive number'),
  body('depth')
    .isFloat({ min: 0.1 })
    .withMessage('Depth must be a positive number'),
  body('currentWaterHeight')
    .isFloat({ min: 0 })
    .withMessage('Current water height must be >= 0'),
  body('inflowRate')
    .isFloat({ min: 0 })
    .withMessage('Inflow rate must be >= 0')
];

export const validateSumpUpdate = [
  body('currentWaterHeight')
    .isFloat({ min: 0 })
    .optional()
    .withMessage('Current water height must be >= 0'),
  body('inflowRate')
    .isFloat({ min: 0 })
    .optional()
    .withMessage('Inflow rate must be >= 0')
];

// ============ PUMP VALIDATION RULES ============
export const validatePumpCreation = [
  body('pumpId')
    .trim()
    .notEmpty()
    .withMessage('Pump ID is required'),
  body('sumpId')
    .isMongoId()
    .withMessage('Invalid sump ID'),
  // Support both new schema (ratedDischarge) and legacy (originalCapacity)
  body('ratedDischarge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rated discharge must be >= 0'),
  body('currentDischarge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current discharge must be >= 0'),
  body('originalCapacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original capacity must be >= 0'),
  body('currentCapacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current capacity must be >= 0'),
  body('status')
    .optional()
    .isIn(['RUNNING', 'STOPPED', 'FAULT'])
    .withMessage('Invalid pump status'),
  body('motor.powerKw')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Motor power must be >= 0'),
  body('motor.torqueNm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Motor torque must be >= 0')
];

// ============ HAUL ROAD VALIDATION RULES ============
export const validateHaulRoadCreation = [
  body('roadId')
    .trim()
    .notEmpty()
    .withMessage('Road ID is required'),
  body('name')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('Invalid priority'),
  // Support both new geometry schema and legacy fields
  body('geometry.lengthM')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Road length must be >= 0'),
  body('geometry.designCrossFallPercent')
    .optional()
    .isFloat({ min: 0, max: 15 })
    .withMessage('Design cross-fall must be between 0 and 15'),
  body('requiredCrossFall')
    .optional()
    .isFloat({ min: 0, max: 45 })
    .withMessage('Required cross-fall must be between 0 and 45'),
  body('currentCrossFall')
    .optional()
    .isFloat({ min: 0, max: 45 })
    .withMessage('Current cross-fall must be between 0 and 45'),
  body('heightFromPitBottom')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height from pit bottom must be >= 0'),
  body('roadWidth')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Road width must be >= 1'),
  body('linkedSumpId')
    .optional()
    .isMongoId()
    .withMessage('Invalid linked sump ID')
];
