'use client';

import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Droplet, AlertCircle, TrendingUp, MapPin, Zap } from 'lucide-react';

// ============ LANDING PAGE ============
// Public homepage with feature overview and CTAs

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-text mb-6 leading-tight">
              Mining Water
              <span className="text-accent"> Management</span>
              System
            </h2>
            <p className="text-lg text-textSecondary mb-8 leading-relaxed">
              Real-time sump monitoring, pump health tracking, and AI-powered flood
              prediction. Keep your mining operations safe and efficient.
            </p>
          </div>

          {/* Hero Image */}
          <div className="relative h-96 bg-surfaceAlt rounded-lg border border-border p-8 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
            <div className="relative flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center animate-pulse-glow">
                <Droplet className="w-12 h-12 text-accent" />
              </div>
              <p className="text-center text-text font-semibold">
                Real-Time Monitoring
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-surface/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-text text-center mb-12">
            Key Features
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Droplet className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Flood Prediction
              </h4>
              <p className="text-textSecondary">
                Calculates time-to-flood based on inflow rates, pump capacity, and
                remaining sump volume. Get alerts before it's too late.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Pump Health
              </h4>
              <p className="text-textSecondary">
                Monitor pump capacity degradation and detect siltation. Get maintenance
                alerts before failures occur.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-success" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Weather Alerts
              </h4>
              <p className="text-textSecondary">
                Real-time weather forecasting with storm prediction. Prepare early
                for heavy rainfall.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card">
              <div className="w-12 h-12 bg-danger/20 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-danger" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Road Monitoring
              </h4>
              <p className="text-textSecondary">
                Track haul road conditions, detect soft spots, and monitor drainage
                cross-fall.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Real-Time Dashboard
              </h4>
              <p className="text-textSecondary">
                Control-room style interface with live status updates and actionable
                alerts.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card">
              <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <h4 className="text-xl font-bold text-text mb-2">
                Early Warnings
              </h4>
              <p className="text-textSecondary">
                Combined weather and sump data for early storm preparation triggers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border text-center text-textSecondary">
        <p>
          &copy; 2025 Mine Water Management System. Built for operational excellence by Mobashshir Zainuddin.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
