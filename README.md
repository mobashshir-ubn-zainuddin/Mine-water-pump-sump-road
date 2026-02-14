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
