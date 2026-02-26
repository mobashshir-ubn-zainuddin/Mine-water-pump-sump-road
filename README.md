# Mine Water, Road & Pump Management System

A production-grade MERN stack application for real-time mining water management, pump health monitoring, and haul road maintenance. Features flood prediction, weather integration, and cybersecurity compliance.

## Website Link
https://mine-water-pump-sump-road.vercel.app/

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

## 📄 License

This is a proprietary mining management system. All rights reserved.

## 🤝 Support

For issues or questions:
1. Check existing documentation
2. Review error logs
3. Test with sample data first
4. Contact development team

---

**Built with security, performance, and mining operations excellence in mind by Mobashshir Zainuddin.**
