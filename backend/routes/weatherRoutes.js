import express from 'express';
import axios from 'axios';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getCachedWeather,
  setCachedWeather
} from '../utils/weatherCache.js';

const router = express.Router();

// ============ GET WEATHER FORECAST ============
// Fetch weather data from OpenWeatherMap API
// Only works if user has granted location permission
router.get(
  '/forecast',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude'
      });
    }

    // Verify user has location permission
    const user = await User.findById(req.user.userId);
    if (!user.locationPermission) {
      return res.status(403).json({
        error: 'Location permission required for weather data',
        requiresPermission: true
      });
    }

    try {
      // Check cache first
      const cachedWeather = getCachedWeather(latitude, longitude);
      if (cachedWeather) {
        return res.status(200).json({
          weather: cachedWeather,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch from OpenWeatherMap API
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
          cnt: 40 // 5-day forecast (8 forecasts per day)
        },
        timeout: 5000
      });

      const weatherData = {
        location: {
          lat: response.data.city.coord.lat,
          lng: response.data.city.coord.lon,
          name: response.data.city.name,
          country: response.data.city.country
        },
        timezone: response.data.city.timezone,
        forecast: response.data.list.map((item) => ({
          timestamp: item.dt * 1000,
          temperature: item.main.temp,
          feelsLike: item.main.feels_like,
          humidity: item.main.humidity,
          pressure: item.main.pressure,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rainProbability: (item.pop || 0) * 100, // Probability of precipitation
          rainfall: item.rain ? item.rain['3h'] : 0, // 3-hour rainfall prediction (mm)
          windSpeed: item.wind.speed,
          windDeg: item.wind.deg,
          clouds: item.clouds.all
        }))
      };

      // Analyze for storm/heavy rain conditions
      const stormAnalysis = analyzeStormRisk(weatherData.forecast);

      // Cache the data
      setCachedWeather(latitude, longitude, weatherData);

      res.status(200).json({
        weather: weatherData,
        stormAnalysis,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Weather API error:', error.message);

      if (error.response?.status === 401) {
        return res.status(401).json({
          error: 'Invalid weather API key'
        });
      }

      res.status(500).json({
        error: 'Failed to fetch weather data',
        details: error.message
      });
    }
  })
);

// ============ ANALYZE STORM RISK ============
// Helper function to detect heavy rain and storm conditions
const analyzeStormRisk = (forecast) => {
  const heavyRainThreshold = 50; // mm per 3 hours
  const stormProbabilityThreshold = 70; // % chance of rain

  const riskFactors = {
    heavyRainDetected: false,
    stormProbable: false,
    highHumidity: false,
    strongWind: false,
    recommendations: []
  };

  // Check next 24 hours (8 forecasts)
  const next24Hours = forecast.slice(0, 8);

  next24Hours.forEach((item) => {
    // Heavy rain detection
    if (item.rainfall > heavyRainThreshold) {
      riskFactors.heavyRainDetected = true;
      riskFactors.recommendations.push(`Heavy rainfall expected: ${item.rainfall.toFixed(1)}mm`);
    }

    // Storm probability
    if (item.rainProbability > stormProbabilityThreshold) {
      riskFactors.stormProbable = true;
    }

    // High humidity (indicates storm formation)
    if (item.humidity > 85) {
      riskFactors.highHumidity = true;
    }

    // Strong winds
    if (item.windSpeed > 10) {
      riskFactors.strongWind = true;
      riskFactors.recommendations.push(`Strong winds: ${item.windSpeed.toFixed(1)} m/s`);
    }
  });

  // Generate overall risk level
  let riskLevel = 'low';
  if (riskFactors.heavyRainDetected && riskFactors.stormProbable) {
    riskLevel = 'high';
    riskFactors.recommendations.push('URGENT: Start pumping early to create surge capacity');
  } else if (riskFactors.stormProbable) {
    riskLevel = 'medium';
    riskFactors.recommendations.push('Prepare pumping systems in advance');
  }

  riskFactors.riskLevel = riskLevel;

  return riskFactors;
};

// ============ GET EARLY WARNING ============
// Check weather conditions and sump status for early warning
router.post(
  '/early-warning',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { lat, lng, sumpCapacityPercent } = req.body;

    // Verify user has location permission
    const user = await User.findById(req.user.userId);
    if (!user.locationPermission) {
      return res.status(403).json({
        error: 'Location permission required for early warning system',
        requiresPermission: true
      });
    }

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Location coordinates required'
      });
    }

    try {
      // Fetch weather data
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat,
          lon: lng,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
          cnt: 40
        },
        timeout: 5000
      });

      const forecast = response.data.list.map((item) => ({
        rainfall: item.rain ? item.rain['3h'] : 0,
        rainProbability: (item.pop || 0) * 100
      }));

      // Analyze storm risk
      const stormAnalysis = analyzeStormRisk(forecast);

      // Generate early warning
      const warningLevel = calculateWarningLevel(
        stormAnalysis,
        sumpCapacityPercent || 50
      );

      res.status(200).json({
        warningLevel,
        stormAnalysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Early warning error:', error.message);
      res.status(500).json({
        error: 'Failed to generate early warning'
      });
    }
  })
);

// ============ CALCULATE WARNING LEVEL ============
// Combine weather data with sump capacity for warning level
const calculateWarningLevel = (stormAnalysis, capacityPercent) => {
  let warningLevel = 'none';
  let actions = [];

  const capacityThreshold = 70; // If sump is >70% full, be more cautious

  if (stormAnalysis.riskLevel === 'high') {
    if (capacityPercent > capacityThreshold) {
      warningLevel = 'critical';
      actions = [
        'START PUMPING IMMEDIATELY',
        'Monitor sump water level continuously',
        'Prepare for potential flooding'
      ];
    } else if (capacityPercent > 50) {
      warningLevel = 'high';
      actions = [
        'Increase pumping rate',
        'Monitor weather updates',
        'Prepare additional pumps if available'
      ];
    } else {
      warningLevel = 'medium';
      actions = [
        'Start preventive pumping',
        'Monitor sump level closely'
      ];
    }
  } else if (stormAnalysis.riskLevel === 'medium') {
    if (capacityPercent > capacityThreshold) {
      warningLevel = 'medium';
      actions = ['Increase pumping', 'Monitor weather'];
    } else {
      warningLevel = 'low';
      actions = ['Routine monitoring'];
    }
  }

  return {
    level: warningLevel,
    recommendedActions: actions,
    weatherRisk: stormAnalysis.riskLevel,
    sumpCapacityPercent: capacityPercent,
    shouldProceedWithActivity: warningLevel !== 'critical'
  };
};

export default router;
