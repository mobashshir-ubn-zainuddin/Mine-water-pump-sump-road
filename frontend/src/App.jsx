'use client';

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import LocationPermissionModal from './components/LocationPermissionModal';

function App() {
  const { checkAuth, initAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth on app load
    initAuth();
  }, []);

  const isAuthenticated = checkAuth();

  return (
    <BrowserRouter>
      <LocationPermissionModal />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
