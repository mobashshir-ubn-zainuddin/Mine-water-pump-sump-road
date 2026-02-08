# Quick Start Guide

Get the Mine Water Management System running in 10 minutes.
 
## Prerequisites
- Node.js 16+ installed
- MongoDB running locally (`mongod`) or MongoDB Atlas connection string
- OpenWeatherMap API key (free: https://openweathermap.org/api)

## 1. Backend Setup (5 minutes)

```bash
# Navigate to backend directory
cd backend
   
# Install dependencies
npm install

# Create .env file and add these variables:
# MONGO_URI=mongodb://localhost:27017/mine-management
# JWT_SECRET=test-secret-key-change-in-production-12345
# JWT_REFRESH_SECRET=test-refresh-secret-change-in-production-12345
# WEATHER_API_KEY=your_openweathermap_api_key
# CLIENT_URL=http://localhost:3000
# PORT=5000
# NODE_ENV=development

# Start backend server
npm run dev
```

**Backend runs on:** http://localhost:5000

## 2. Frontend Setup (3 minutes)

In a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file:
# VITE_API_URL=http://localhost:5000
# VITE_ENV=development

# Start frontend development server
npm run dev
```

**Frontend runs on:** http://localhost:3000

## 3. Test the Application (2 minutes)

1. Open browser to http://localhost:3000
2. Click "Sign Up" button
3. Create a test account:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Role: Pit Foreman
4. Click "Create Account"
5. You'll be redirected to the dashboard
6. Grant location permission when prompted (required for weather)

## 4. Add Sample Data

### Create a Sump
1. On dashboard, click "Add Sump" button
2. Fill in details:
   - Name: "Pit A"
   - Length: 50 (meters)
   - Width: 30 (meters)
   - Depth: 8 (meters)
   - Water Height: 3.5 (meters)
   - Inflow Rate: 300 (m³/hr)
3. Click "Create Sump"

### Try the Features
- View sump status and time-to-flood calculation
- Switch to "Pumps" tab to add pump data
- Switch to "Roads" tab to add haul road information
- Check weather alerts (if location permission granted)

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure `mongod` is running: `mongod`
- Or update `MONGO_URI` with your MongoDB Atlas connection string
- Check if port 27017 is available

### "CORS error"
- Ensure `CLIENT_URL` in backend matches frontend URL
- Check that both servers are running

### "Weather not loading"
- Verify `WEATHER_API_KEY` is valid
- Grant location permission in browser
- Check browser console for errors

### "Cannot login"
- Verify you created an account first
- Check that backend is running on port 5000
- Clear browser cache and try again

## Key Files to Understand

### Backend
- `backend/models/` - Database schemas with core logic
- `backend/routes/` - API endpoints
- `backend/utils/jwtUtils.js` - Authentication utilities
- `backend/utils/weatherCache.js` - Weather API caching

### Frontend
- `frontend/src/stores/authStore.js` - State management
- `frontend/src/pages/Dashboard.jsx` - Main control center
- `frontend/src/components/LocationPermissionModal.jsx` - Location handling
- `frontend/src/index.css` - Dark theme styling

## Next Steps

1. **Production Deployment**: Follow deployment steps in README.md
2. **Customize**: Update colors in `frontend/tailwind.config.js`
3. **Add Features**: Extend API routes and dashboard components
4. **Security**: Update JWT secrets and CORS settings for production

## Development Tips

### Debug Mode
Add to `backend/server.js` to see all requests:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Test API Endpoints
Use curl or Postman:
```bash
# Create sump
curl -X POST http://localhost:5000/api/sumps \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","length":50,"width":30,"depth":8,"currentWaterHeight":3,"inflowRate":300}'

# Get all sumps
curl -X GET http://localhost:5000/api/sumps \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitor Database
```bash
# Connect to MongoDB directly
mongosh

# Select database
use mine-management

# View collections
show collections

# Check users
db.users.find()
```

## Performance Tips

1. **Backend**: Requests are cached where possible (weather data cached for 1 hour)
2. **Frontend**: Uses Zustand for efficient state management
3. **Database**: Indexes on userId, email, status fields for faster queries
4. **API**: Rate limiting prevents abuse (100 req/15 min per IP)

## Security Reminders

1. Never commit `.env` files to git
2. Change JWT secrets before production
3. Use HTTPS in production
4. Enable location permission only when needed
5. Regularly update npm dependencies: `npm audit fix`

---

**You're ready to go! Start monitoring your mining operations.**
