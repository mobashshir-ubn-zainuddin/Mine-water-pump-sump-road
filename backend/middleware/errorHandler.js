// ============ CENTRALIZED ERROR HANDLER ============
// This middleware handles all errors in a consistent format
// It catches both custom errors and unexpected errors

export const errorHandler = (err, req, res, next) => {
  // Log error for debugging (in production, use a logging service)
  console.error('Error:', {
    message: err.message,
    status: err.status || 500,
    stack: err.stack
  });

  // Default error object
  let error = {
    message: err.message || 'Internal server error',
    status: err.status || 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = {
      message: 'Validation error',
      details: messages,
      status: 400
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = {
      message: `${field} already exists`,
      status: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401
    };
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    details: error.details || undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// ============ ASYNC HANDLER WRAPPER ============
// Wraps async route handlers to catch errors and pass to error handler
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
