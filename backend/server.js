import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import sumpRoutes from './routes/sumpRoutes.js';
import pumpRoutes from './routes/pumpRoutes.js';
import roadRoutes from './routes/roadRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// ============ SECURITY MIDDLEWARE ============
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS Configuration
// In production, replace CLIENT_URL with your actual frontend domain
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  // Add production URL here: 'https://yourdomain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 200, // 200 requests per minute (much higher for dashboard)
  message: 'Too many requests from this IP, please try again later.'
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

// Apply general rate limiting to all routes
app.use(limiter);

// ============ BODY PARSING ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============ DATABASE CONNECTION ============
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB connected successfully'))
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// ============ ROUTES ============
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sumps', sumpRoutes);
app.use('/api/pumps', pumpRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============ ERROR HANDLING ============
app.use(errorHandler);

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});
