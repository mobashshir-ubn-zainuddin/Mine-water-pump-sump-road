# Mine Water, Road & Pump Management System

A production-grade MERN stack application for real-time mining water management, pump health monitoring, and haul road maintenance. Features AI-powered flood prediction, weather integration, and cybersecurity compliance.

## 🎯 Project Overview

This system helps pit foremen make better decisions by:
- **Predicting time-to-flood** based on sump capacity and pump performance
- **Detecting pump siltation** through motor torque and discharge analysis
- **Identifying haul road soft spots** using truck telemetry
- **Triggering early storm preparation** with real-time weather alerts
- **Tracking drainage issues** through road cross-fall monitoring

## 📋 Features

### Water Management
- ✅ Real-time sump monitoring (dimensions, water level, inflow rate)
- ✅ Time-to-flood calculation (Safe/Warning/Critical)
- ✅ Pump capacity tracking and health status
- ✅ Siltation detection algorithm
- ✅ Maintenance alerts

### Weather Integration
- ✅ OpenWeatherMap API integration
- ✅ Location-based weather forecasting
- ✅ Storm and heavy rainfall prediction
- ✅ Location permission requirement enforcement
- ✅ Weather API caching (1-hour TTL)

### Road Monitoring
- ✅ Haul road drainage assessment
- ✅ Cross-fall tracking and requirements
- ✅ Soft spot detection from truck telemetry
- ✅ Water level and priority management

### Security & Performance
- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (15 min / 100 requests per IP)
- ✅ CORS protection
- ✅ Input validation (Joi / express-validator)
- ✅ Helmet security headers
- ✅ MongoDB indexing for performance
- ✅ Async/await throughout
- ✅ Non-blocking API calls

## 🚀 Tech Stack

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **axios** - HTTP client
- **node-cache** - In-memory caching

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Zustand** - State management
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

## 📁 Project Structure

```
mine-management/
├── backend/
│   ├── models/
│   │   ├── User.js           # User schema with auth methods
│   │   ├── Sump.js           # Water pit schema with flood logic
│   │   ├── Pump.js           # Pump schema with health tracking
│   │   ├── HaulRoad.js       # Road schema with drainage logic
│   │   └── TruckTelemetry.js # Truck data for soft spot detection
│   ├── routes/
│   │   ├── authRoutes.js     # Authentication endpoints
│   │   ├── sumpRoutes.js     # Sump management endpoints
│   │   ├── pumpRoutes.js     # Pump management endpoints
│   │   ├── roadRoutes.js     # Road management endpoints
│   │   └── weatherRoutes.js  # Weather & early warning endpoints
│   ├── middleware/
│   │   ├── auth.js           # JWT verification & role-based access
│   │   ├── errorHandler.js   # Centralized error handling
│   │   └── validation.js     # Request body validation rules
│   ├── utils/
│   │   ├── weatherCache.js   # Weather API caching
│   │   └── jwtUtils.js       # Token generation & verification
│   ├── server.js             # Express server setup
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx              # Navigation header
│   │   │   ├── PrivateRoute.jsx        # Authentication guard
│   │   │   └── LocationPermissionModal.jsx # Location request
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx         # Public homepage
│   │   │   ├── LoginPage.jsx           # User login
│   │   │   ├── SignupPage.jsx          # User registration
│   │   │   └── Dashboard.jsx           # Main control center
│   │   ├── stores/
│   │   │   └── authStore.js            # Zustand auth store
│   │   ├── App.jsx                     # Root component
│   │   ├── main.jsx                    # Entry point
│   │   └── index.css                   # Tailwind + custom styles
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── README.md (this file)
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- MongoDB local or cloud instance
- OpenWeatherMap API key (free tier available)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** (use `.env.example` as template)
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```
   MONGO_URI=mongodb://localhost:27017/mine-management
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   JWT_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   WEATHER_API_KEY=your_openweathermap_api_key
   BCRYPT_ROUNDS=10
   ```

5. **Start the backend**
   ```bash
   npm run dev  # Development with nodemon
   npm start    # Production
   ```
   Backend runs on `http://localhost:5000`

### Frontend Setup
 
1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```
   VITE_API_URL=http://localhost:5000
   VITE_ENV=development
   ```

5. **Start the frontend**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

## 🔐 Security Configuration

### CORS Production Update
In `backend/server.js`, update the `allowedOrigins` array:
```javascript
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://yourdomain.com',  // Add your production domain
  'https://www.yourdomain.com'
];
```

### Environment Variables (Production)
- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random strings
- Use MongoDB Atlas or managed database
- Set `NODE_ENV=production`
- Update `CLIENT_URL` to production domain

### Rate Limiting
Currently set to 100 requests per 15 minutes. Adjust in `backend/server.js` if needed.

### Password Requirements
- Minimum 6 characters for signup
- Hashed with bcrypt (10 rounds by default)
- Account locked after 5 failed login attempts for 2 hours

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/signup           - Register new user
POST   /api/auth/login            - User login
POST   /api/auth/refresh          - Refresh access token
POST   /api/auth/logout           - Logout and invalidate token
GET    /api/auth/me               - Get current user profile
PATCH  /api/auth/location-permission - Update location permission
```

### Sumps (Water Pits)
```
GET    /api/sumps                 - Get all sumps
POST   /api/sumps                 - Create new sump
GET    /api/sumps/:sumpId         - Get specific sump
PUT    /api/sumps/:sumpId         - Update sump
DELETE /api/sumps/:sumpId         - Delete sump
GET    /api/sumps/:sumpId/analysis - Get flood analysis
```

### Pumps
```
GET    /api/pumps                 - Get all pumps
POST   /api/pumps                 - Create pump
GET    /api/pumps/:pumpId         - Get pump details
PUT    /api/pumps/:pumpId         - Update pump
DELETE /api/pumps/:pumpId         - Delete pump
GET    /api/pumps/user/health-summary - Health summary for all pumps
```

### Haul Roads
```
GET    /api/roads                 - Get all roads
POST   /api/roads                 - Create road
GET    /api/roads/:roadId         - Get road details
PUT    /api/roads/:roadId         - Update road
DELETE /api/roads/:roadId         - Delete road
POST   /api/roads/:roadId/telemetry - Submit truck telemetry
GET    /api/roads/:roadId/softspots - Get detected soft spots
GET    /api/roads/:roadId/drainage-assessment - Drainage analysis
```

### Weather
```
GET    /api/weather/forecast      - Get weather forecast (requires location)
POST   /api/weather/early-warning - Get early warning system status
```

## 🧮 Core Logic

### Time-to-Flood Calculation
```
Net Inflow = Inflow Rate - Total Pump Capacity (m³/hr)
Time to Flood = Remaining Sump Capacity / Net Inflow (hours)

Status:
  > 8 hours  → 🟢 Safe
  4-8 hours  → 🟠 Warning  
  < 4 hours  → 🔴 Critical
```

### Pump Health Status
```
Capacity % = (Current Capacity / Original Capacity) × 100

< 60%      → 🔴 Red (Maintenance Required)
60-70%     → 🟡 Yellow (Performance Degrading)
> 70%      → 🟢 Green (Healthy)
```

### Siltation Detection
```
IF Motor Torque INCREASING AND Discharge DECREASING
   → Siltation Suspected
   → Recommend: Vacuum truck or dozer cleaning
```

### Soft Spot Detection
```
IF Speed ≤ 50% AND Payload Constant AND Strut Pressure Anomaly
   → Soft Spot Detected
   → Severity based on speed reduction
```

### Drainage Risk Assessment
```
Cross-Fall Deficiency = Required - Current

Deficiency = 0    → 🟢 Safe
Deficiency ≤ 1°   → 🟠 Moderate (Schedule regrading)
Deficiency > 1°   → 🔴 Severe (Urgent regrading)
```

## 🌦️ Weather Integration

The system requires **location permission** before:
- Showing weather forecasts
- Providing early warning alerts
- Accessing advanced preparation features

### Weather Data Flow
1. User grants location permission (browser geolocation API)
2. Frontend stores location in localStorage
3. API calls include lat/lng coordinates
4. OpenWeatherMap API fetches 5-day forecast
5. System analyzes for storm/rainfall risk
6. Combined with sump capacity for early warning

### Storm Risk Factors
- Heavy rain threshold: > 50mm in 3 hours
- Storm probability threshold: > 70% chance of rain
- High humidity indicator: > 85%
- Wind speed alert: > 10 m/s

## 📊 Database Schema

### User Collection
```javascript
{
  name: String,
  email: String (unique),
  passwordHash: String,
  role: 'foreman' | 'maintenance' | 'road',
  locationPermission: Boolean,
  refreshTokens: [{ token, createdAt }],
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Sump Collection
```javascript
{
  userId: ObjectId,
  name: String,
  length: Number (meters),
  width: Number (meters),
  depth: Number (meters),
  currentWaterHeight: Number,
  inflowRate: Number (m³/hr),
  connectedPumps: [ObjectId],
  location: { lat, lng },
  status: 'safe' | 'warning' | 'critical',
  createdAt: Date,
  updatedAt: Date
}
```

### Pump Collection
```javascript
{
  userId: ObjectId,
  pumpId: String (unique),
  sumpId: ObjectId,
  originalCapacity: Number (m³/hr),
  currentCapacity: Number (m³/hr),
  operatingHours: Number,
  motorTorqueTrend: 'increasing' | 'stable' | 'decreasing',
  dischargeTrend: 'increasing' | 'stable' | 'decreasing',
  health: 'green' | 'yellow' | 'red',
  siltationSuspected: Boolean,
  maintenanceRequired: Boolean,
  lastMaintenanceDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### HaulRoad Collection
```javascript
{
  userId: ObjectId,
  roadId: String (unique),
  priority: 'high' | 'medium' | 'low',
  requiredCrossFall: Number (degrees),
  currentCrossFall: Number (degrees),
  heightFromPitBottom: Number (meters),
  roadWidth: Number (meters),
  waterLevel: Number (cm),
  softSpotDetected: Boolean,
  softSpotLocations: [{ lat, lng, severity, lastDetected }],
  drainageRisk: 'safe' | 'moderate' | 'severe',
  requiresRegrading: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔍 Monitoring & Logging

The system includes:
- Console logging for development
- Error tracking with stack traces
- Request logging in development mode
- Async operation monitoring
- Weather API call logging

For production, integrate with services like:
- Sentry for error tracking
- DataDog for monitoring
- CloudWatch for logs
- MongoDB Atlas monitoring

## 🚢 Deployment

### Backend Deployment (Heroku/Vercel)
1. Set production environment variables
2. Deploy to Heroku: `git push heroku main`
3. Or deploy to Vercel with serverless functions

### Frontend Deployment (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy dist folder to Vercel or Netlify
3. Set `VITE_API_URL` to production backend URL

### Database Migration
1. Ensure MongoDB indexes are created (automatic via Mongoose)
2. Backup existing data before major updates
3. Test migrations in staging environment first

## 🐛 Troubleshooting

### CORS Errors
- Check `CLIENT_URL` in backend `.env`
- Verify frontend URL matches `allowedOrigins` in server.js
- Clear browser cache and restart servers

### MongoDB Connection
- Ensure MongoDB service is running
- Check `MONGO_URI` in `.env`
- Verify network access (if using MongoDB Atlas)

### Weather API Issues
- Verify `WEATHER_API_KEY` is valid
- Check OpenWeatherMap API quota
- Ensure location coordinates are valid

### Location Permission
- Grant browser permission when prompted
- Check browser privacy settings
- Ensure HTTPS in production (required for geolocation)

## 📝 Code Standards

This project follows:
- **Security**: No hardcoded secrets, input validation, parameterized queries
- **Comments**: Block headers for major sections, inline for complex logic
- **Performance**: Indexes on frequently queried fields, caching for APIs
- **Error Handling**: Try-catch blocks, meaningful error messages
- **Validation**: Express-validator for input, Mongoose schema validation

## 📄 License

This is a proprietary mining management system. All rights reserved.

## 🤝 Support

For issues or questions:
1. Check existing documentation
2. Review error logs
3. Test with sample data first
4. Contact development team

---

**Built with security, performance, and mining operations excellence in mind.**
