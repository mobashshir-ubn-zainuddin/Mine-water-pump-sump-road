import NodeCache from 'node-cache';

// ============ WEATHER API CACHING ============
// Implements in-memory caching for OpenWeatherMap API calls
// to reduce API calls and improve response times

// Create cache instance with 1 hour TTL (3600 seconds)
const weatherCache = new NodeCache({ stdTTL: 3600 });

// Generate cache key from coordinates
const getCacheKey = (lat, lng) => `weather_${lat}_${lng}`;

// Get cached weather data
export const getCachedWeather = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  return weatherCache.get(key);
};

// Set weather data in cache
export const setCachedWeather = (lat, lng, data) => {
  const key = getCacheKey(lat, lng);
  weatherCache.set(key, data);
};

// Clear specific location cache
export const clearWeatherCache = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  weatherCache.del(key);
};

// Clear all weather cache
export const clearAllWeatherCache = () => {
  weatherCache.flushAll();
};

export default weatherCache;
