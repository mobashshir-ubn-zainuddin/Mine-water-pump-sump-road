import { create } from 'zustand';
import axios from 'axios';

// ================= API CONFIG =================

// Fallback protection (important in production)
const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// ================= REQUEST INTERCEPTOR =================

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ================= RESPONSE INTERCEPTOR =================
// Auto refresh token if expired

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return axios(originalRequest);
      } catch (err) {
        // Refresh failed → logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// ================= AUTH STORE =================

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  isLoading: false,
  isInitialized: false,
  error: null,
  locationPermission: false,

  // ================= SIGNUP =================
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

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isLoading: false });

      return user;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Signup failed';

      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // ================= LOGIN =================
  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });

      const { user, tokens } = response.data;

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isLoading: false });

      return user;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Login failed';

      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // ================= LOGOUT =================
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    set({ user: null, locationPermission: false });

    window.location.href = '/login';
  },

  // ================= CURRENT USER =================
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      const { user } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      set({ user });

      return user;
    } catch (error) {
      console.error('Fetch user failed:', error);
      throw error;
    }
  },

  // ================= LOCATION PERMISSION =================
  setLocationPermission: async (granted) => {
    try {
      await apiClient.patch('/api/auth/location-permission', {
        locationPermission: granted
      });

      set({ locationPermission: granted });
    } catch (error) {
      console.error('Location update failed:', error);
      throw error;
    }
  },

  // ================= INIT AUTH =================
  initAuth: async () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      set({ user: JSON.parse(storedUser) });

      try {
        await useAuthStore.getState().getCurrentUser();
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null });
      }
    }

    set({ isInitialized: true });
  }
}));

export default apiClient;