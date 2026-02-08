'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { MapPin, X } from 'lucide-react';

// ============ LOCATION PERMISSION MODAL ============
// Requests location permission from user on first visit
// Required for weather data and early warning system

function LocationPermissionModal() {
  const [showModal, setShowModal] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const { locationPermission, setLocationPermission, user, checkAuth } = useAuthStore();
  const [hasModal, setHasModal] = useState(false); // Declare hasModal variable

  useEffect(() => {
    // Only show if user is authenticated and hasn't been asked yet
    const hasAskedBefore = localStorage.getItem('locationPermissionAsked');
    if (checkAuth() && user && !hasAskedBefore && !hasModal) {
      setShowModal(true);
      setHasAsked(true);
    }
  }, [user, checkAuth()]);

  const handleGrantPermission = async () => {
    try {
      // Request browser location permission
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Store location
          localStorage.setItem('userLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }));

          // Update auth store
          await setLocationPermission(true);

          // Mark that we've asked
          localStorage.setItem('locationPermissionAsked', 'true');
          setShowModal(false);
        },
        (error) => {
          console.error('Location error:', error);
          alert('Failed to get location. Please enable location services.');
        }
      );
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const handleDenyPermission = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <MapPin className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-text">Location Permission</h2>
          </div>
          <button
            onClick={handleDenyPermission}
            className="text-textSecondary hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-textSecondary mb-6">
          To enable weather forecasting and early storm warning for your mining site,
          we need access to your location. This helps us provide real-time alerts for
          flood preparation.
        </p>

        <div className="bg-surface border border-border rounded p-3 mb-6">
          <p className="text-sm text-textSecondary">
            <strong>What we use this for:</strong>
          </p>
          <ul className="text-sm text-textSecondary mt-2 space-y-1">
            <li>• Real-time weather forecasting</li>
            <li>• Storm and rainfall prediction</li>
            <li>• Early warning alerts</li>
            <li>• Pump preparation recommendations</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGrantPermission}
            className="flex-1 btn-primary"
          >
            Allow Location
          </button>
          <button
            onClick={handleDenyPermission}
            className="flex-1 btn-secondary"
          >
            Not Now
          </button>
        </div>

        <p className="text-xs text-textSecondary text-center mt-4">
          You can change this setting later in your account preferences
        </p>
      </div>
    </div>
  );
}

export default LocationPermissionModal;
