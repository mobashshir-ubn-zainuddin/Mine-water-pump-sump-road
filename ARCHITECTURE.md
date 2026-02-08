# System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite)                               │  │
│  │  ├─ Components (Header, PrivateRoute)               │  │
│  │  ├─ Pages (Landing, Login, Signup, Dashboard)       │  │
│  │  ├─ Stores (Zustand - authStore)                    │  │
│  │  └─ Styling (Tailwind CSS + Dark Theme)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                    ↕ HTTPS/HTTP ↕
                 (JWT in Authorization Header)
                           │
┌─────────────────────────────────────────────────────────────┐
│                    API SERVER                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js (Node.js)                                │  │
│  ├─ Security Layer                                      │  │
│  │  ├─ Helmet (HTTP headers)                           │  │
│  │  ├─ CORS (whitelist origins)                        │  │
│  │  ├─ Rate Limiter (100/15min)                        │  │
│  │  └─ Auth Middleware (JWT verify)                    │  │
│  ├─ Routes (5 modules)                                 │  │
│  │  ├─ Auth Routes (signup, login, refresh)            │  │
│  │  ├─ Sump Routes (water management)                  │  │
│  │  ├─ Pump Routes (health monitoring)                 │  │
│  │  ├─ Road Routes (haul roads)                        │  │
│  │  └─ Weather Routes (forecasts, alerts)              │  │
│  ├─ Logic Layer                                        │  │
│  │  ├─ Time-to-Flood Calculation                       │  │
│  │  ├─ Pump Health Assessment                          │  │
│  │  ├─ Siltation Detection                             │  │
│  │  ├─ Road Drainage Analysis                          │  │
│  │  └─ Storm Risk Analysis                             │  │
│  ├─ Data Layer (Mongoose/MongoDB)                      │  │
│  │  ├─ User (authentication)                           │  │
│  │  ├─ Sump (water pits)                               │  │
│  │  ├─ Pump (equipment)                                │  │
│  │  ├─ HaulRoad (road conditions)                      │  │
│  │  └─ TruckTelemetry (GPS/telemetry)                 │  │
│  └─ External Services                                  │  │
│     └─ OpenWeatherMap API (with caching)              │  │
│                                                        │  │
│  ┌──────────────────────────────────────────────────┐  │  │
│  │  Cache Layer (node-cache)                       │  │  │
│  │  └─ Weather data (1-hour TTL)                   │  │  │
│  └──────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────┘
                           │
                    ↕ MongoDB Protocol ↕
                           │
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MongoDB                                             │  │
│  ├─ Collections (5):                                   │  │
│  │  ├─ users (unique: email)                           │  │
│  │  ├─ sumps (indexed: userId, status)                 │  │
│  │  ├─ pumps (indexed: userId, sumpId)                 │  │
│  │  ├─ haulroads (indexed: userId)                     │  │
│  │  └─ trucktelemetries (TTL: 30 days)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### User Authentication Flow
```
[User] → [Signup/Login Form]
           ↓
       [Validate Input]
           ↓
       [Verify Email]
           ↓
       [Hash Password (bcrypt)]
           ↓
       [Save to MongoDB]
           ↓
       [Generate JWT Tokens]
           ↓
       [Store in localStorage]
           ↓
    [Redirect to Dashboard]
```

### Time-to-Flood Calculation Flow
```
[Sump Created/Updated]
           ↓
[Get Dimensions & Water Level]
           ↓
[Calculate Max Volume = L × W × D]
           ↓
[Calculate Current Volume = L × W × H]
           ↓
[Calculate Remaining = Max - Current]
           ↓
[Get Connected Pumps]
           ↓
[Sum Pump Capacities]
           ↓
[Calculate Net Inflow = Inflow - Pumping]
           ↓
[If Net Inflow ≤ 0] → Safe ✅
[If Net Inflow > 0]
           ↓
[Time = Remaining / Net Inflow]
           ↓
[If Time > 8h] → Safe 🟢
[If Time 4-8h] → Warning 🟠
[If Time < 4h] → Critical 🔴
```

### Weather Alert Flow
```
[User Requests Early Warning]
           ↓
[Check Location Permission]
   ↙ No ↘
[Block] [Continue]
        ↓
[Get User Location (lat/lng)]
        ↓
[Check Cache for Weather]
   ↙ Hit ↘
[Return Cached] [API Call]
        ↓
[Parse OpenWeatherMap Data]
        ↓
[Analyze for Storm Risk]
  - Check rainfall forecast
  - Check rain probability
  - Check humidity
  - Check wind speed
        ↓
[Cache Result (1 hour)]
        ↓
[Get Sump Capacity %]
        ↓
[Combine Weather + Sump Status]
        ↓
[Generate Warning Level]
  - None
  - Low
  - Medium
  - High
  - Critical
        ↓
[Return to Frontend]
```

### Pump Siltation Detection Flow
```
[Pump Data Updated]
        ↓
[Get Current Capacity %]
        ↓
[Check Motor Torque Trend]
   AND
[Check Discharge Trend]
        ↓
[If Torque↑ AND Discharge↓]
        ↓
    [Siltation Suspected!]
        ↓
[Set siltationSuspected = true]
        ↓
[Recommend Maintenance]
  - Vacuum truck
  - Dozer cleaning
        ↓
[Alert in Dashboard]
```

## 📋 Module Dependencies

### Backend Modules
```
server.js (entry point)
    ├─ Routes
    │   ├─ authRoutes.js
    │   │   ├─ User model
    │   │   ├─ jwtUtils
    │   │   └─ validation middleware
    │   ├─ sumpRoutes.js
    │   │   ├─ Sump model
    │   │   ├─ Pump model
    │   │   └─ auth middleware
    │   ├─ pumpRoutes.js
    │   │   ├─ Pump model
    │   │   ├─ Sump model
    │   │   └─ auth middleware
    │   ├─ roadRoutes.js
    │   │   ├─ HaulRoad model
    │   │   ├─ TruckTelemetry model
    │   │   └─ auth middleware
    │   └─ weatherRoutes.js
    │       ├─ User model (permission check)
    │       ├─ axios (OpenWeatherMap)
    │       └─ weatherCache utility
    └─ Middleware
        ├─ errorHandler.js
        ├─ auth.js
        └─ validation.js
```

### Frontend Modules
```
main.jsx (entry)
    └─ App.jsx
        ├─ Router
        │   ├─ LandingPage.jsx
        │   ├─ LoginPage.jsx
        │   ├─ SignupPage.jsx
        │   └─ Dashboard.jsx
        │       ├─ useAuthStore (Zustand)
        │       └─ apiClient (axios)
        ├─ Header.jsx
        │   └─ useAuthStore
        └─ LocationPermissionModal.jsx
            └─ useAuthStore
```

## 🔐 Security Architecture

```
Request Flow Security:

[HTTP Request]
      ↓
[CORS Check] ← allowedOrigins whitelist
      ↓
[Helmet Headers Applied]
      ↓
[Rate Limit Check] ← 100/15min per IP
      ↓
[Extract JWT Token] ← Bearer token
      ↓
[Verify JWT Signature] ← JWT_SECRET
      ↓
[Check Token Expiry] ← 15min for access
      ↓
[Route Handler Executes]
      ↓
[Input Validation] ← express-validator
      ↓
[Authorization Check] ← role-based
      ↓
[Database Query] ← Mongoose schema validation
      ↓
[Response Sent]
      ↓
[Error Handling] ← centralized middleware
```

## 📊 Database Schema Relationships

```
User (1) ─── (many) Sump
  │
  ├─ Pump (1) ─── (many) Sump
  │
  └─ HaulRoad
      └─ TruckTelemetry

User
  _id (ObjectId, PK)
  email (unique index)
  role (enum)
  locationPermission (boolean)
  refreshTokens (array)

Sump
  _id (ObjectId, PK)
  userId (FK to User, indexed)
  connectedPumps (array of pump ObjectIds)
  status (indexed: safe, warning, critical)

Pump
  _id (ObjectId, PK)
  userId (FK to User, indexed)
  sumpId (FK to Sump, indexed)
  health (enum)

HaulRoad
  _id (ObjectId, PK)
  userId (FK to User, indexed)
  drainageRisk (indexed)
  softSpotLocations (array)

TruckTelemetry
  _id (ObjectId, PK)
  roadId (FK to HaulRoad)
  timestamp (TTL index: 30 days)
```

## ⚡ Performance Optimization

### Backend Optimizations
```
1. Database Indexing
   - userId on sumps, pumps, roads
   - status on sumps
   - email on users (unique)
   - TTL on telemetry (30 days)

2. Caching
   - Weather API (1-hour in-memory)
   - JWT tokens (fast crypto)
   - MongoDB query caching (Mongoose)

3. Async Operations
   - Non-blocking I/O throughout
   - Promise-based error handling
   - Parallel Promise.all() where possible

4. Rate Limiting
   - Per-IP rate limiter
   - Prevents brute force
   - Configurable thresholds
```

### Frontend Optimizations
```
1. State Management
   - Zustand (minimal bundle)
   - Prevents prop drilling
   - Memoized selectors

2. Rendering
   - React 18 concurrent features ready
   - Component splitting for code-splitting
   - Lazy loading ready (React.lazy)

3. Network
   - JWT in headers (stateless)
   - Request interception for token refresh
   - Caching via axios

4. Assets
   - Vite for fast bundling
   - Tailwind CSS purging
   - Code splitting points identified
```

## 🔄 Deployment Architecture

```
Development:
  Frontend: http://localhost:3000 (Vite dev server)
  Backend: http://localhost:5000 (nodemon)
  Database: localhost:27017 (local MongoDB)

Production:
  Frontend: Vercel / Netlify
    └─ CDN distribution
  Backend: Heroku / AWS / Vercel Serverless
    └─ Auto-scaling
  Database: MongoDB Atlas
    └─ Managed backups
```

## 📡 API Request/Response Cycle

```
Frontend Request:
┌────────────────────────────────────────┐
│ axios.get('/api/sumps')                │
│ Headers: {                             │
│   'Authorization': 'Bearer JWT_TOKEN'  │
│   'Content-Type': 'application/json'   │
│ }                                      │
└────────────────────────────────────────┘
           ↓ (HTTPS)
┌────────────────────────────────────────┐
│ Backend Processing:                    │
│ 1. CORS Check ✓                        │
│ 2. Rate Limit Check ✓                  │
│ 3. JWT Verify ✓                        │
│ 4. Query Validation ✓                  │
│ 5. MongoDB Find ✓                      │
│ 6. Serialize Response ✓                │
│ 7. Send 200 OK ✓                       │
└────────────────────────────────────────┘
           ↓ (HTTPS)
┌────────────────────────────────────────┐
│ Frontend Response:                     │
│ {                                      │
│   "count": 5,                          │
│   "sumps": [                           │
│     { _id, name, status, ... }         │
│   ]                                    │
│ }                                      │
└────────────────────────────────────────┘
```

---

This architecture supports production-scale operations with proper security, performance, and maintainability considerations.
