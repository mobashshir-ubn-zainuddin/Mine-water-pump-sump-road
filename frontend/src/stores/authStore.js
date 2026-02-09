import { create } from 'zustand';
import axios from 'axios';

// ============ AUTH STORE ============
// Centralized state management for authentication using Zustand
// Stores user info, tokens, and location permission status

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configure axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useAuthStore = create((set) => ({
  // State
  user: JSON.parse(localStorage.getItem('user')) || null,
  tokens: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  locationPermission: false,

  // ============ SIGNUP ============
  signup: async (name, email, password, role = 'foreman') => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/api/auth/signup', {
        name,
        email,
        password,
        role
      });

      const { user, tokens } = response.data;

      // Store tokens and user in localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, tokens, isLoading: false });
      return user;
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Signup failed';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  // ============ LOGIN ============
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });

      const { user, tokens } = response.data;

      // Store tokens and user
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, tokens, isLoading: false });
      return user;
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  // ============ LOGOUT ============
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiClient.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear tokens and user
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    set({
      user: null,
      tokens: null,
      locationPermission: false
    });
  },

  // ============ GET CURRENT USER ============
  getCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/api/auth/me');
      const { user } = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoading: false });
      return user;
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ============ UPDATE LOCATION PERMISSION ============
  setLocationPermission: async (granted) => {
    try {
      const response = await apiClient.patch('/api/auth/location-permission', {
        locationPermission: granted
      });
      set({ locationPermission: granted });
      return response.data;
    } catch (error) {
      console.error('Failed to update location permission:', error);
      throw error;
    }
  },

  // ============ REFRESH TOKEN ============
  refreshAccessToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken
      });

      const { accessToken } = response.data;
      localStorage.setItem('accessToken', accessToken);

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens and logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, tokens: null });
      throw error;
    }
  },

  // ============ CHECK IF AUTHENTICATED ============
  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    return !!token;
  },

  // ============ INIT AUTH ============
  initAuth: async () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      // Set user from localStorage immediately
      set({ user: JSON.parse(storedUser) });
      
      try {
        // Verify token is still valid by fetching current user
        await useAuthStore.getState().getCurrentUser();
      } catch (error) {
        // Token invalid, clear everything
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, tokens: null });
      }
    }
    
    set({ isInitialized: true });
  }
}));

export default apiClient;
