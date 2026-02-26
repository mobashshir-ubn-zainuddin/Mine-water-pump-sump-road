'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Droplet, AlertCircle, TrendingUp, MapPin, Zap, BookOpen, X, ChevronRight } from 'lucide-react';

// ============ LANDING PAGE ============
// Public homepage with feature overview and CTAs

function LandingPage() {
  const navigate = useNavigate();
  const [showUserGuide, setShowUserGuide] = useState(false);

  // ============ USER GUIDE MODAL ============
  const UserGuideModal = () => {
    if (!showUserGuide) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-surfaceAlt">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold text-text">User Guide for Pit Operations</h2>
            </div>
            <button 
              onClick={() => setShowUserGuide(false)} 
              className="p-2 hover:bg-surface rounded-lg text-textSecondary hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto p-6 space-y-8 text-text">
            {/* Section 1 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">1. Introduction</h3>
              <p className="text-textSecondary leading-relaxed">
                The Mine Water & Road Management System is a decision-support dashboard designed for surface mine operations, 
                specifically to assist Pit Foremen and Shift Engineers in managing:
              </p>
              <ul className="list-disc ml-6 mt-2 text-textSecondary space-y-1">
                <li>Sump water levels</li>
                <li>Pumping efficiency</li>
                <li>Haul road condition risks</li>
              </ul>
              <p className="text-textSecondary mt-3 leading-relaxed">
                The system provides real-time visibility, predictive warnings, and editable operational data, 
                enabling timely decisions to prevent pit floor flooding and haul road deterioration.
              </p>
              <p className="text-warning mt-3 font-medium">
                This tool is not a reporting system, but a live operational aid intended for use during active mine shifts.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">2. Dashboard Overview</h3>
              <p className="text-textSecondary mb-3">Upon logging in, the user is presented with the Mining Control Center dashboard.</p>
              <h4 className="font-semibold text-text mb-2">Key Summary Indicators</h4>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li><strong>Total Sumps</strong> – Number of sumps configured in the pit</li>
                <li><strong>Pumps</strong> – Number of pumps linked to sumps</li>
                <li><strong>Roads</strong> – Number of haul roads monitored</li>
                <li><strong>Alerts</strong> – Active warnings based on system calculations</li>
              </ul>
              <p className="text-textSecondary mt-2">These indicators update automatically as system data changes.</p>
            </section>

            {/* Section 3 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">3. Sump Management Module</h3>
              
              <h4 className="font-semibold text-text mb-2">3.1 Adding a New Sump</h4>
              <p className="text-textSecondary mb-2">Use the "Add Sump" button to register a sump. The user must enter:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Sump name</li>
                <li>Length, width, and depth (in meters)</li>
                <li>Current water height (m)</li>
                <li>Water inflow rate (m³/hr)</li>
              </ul>
              <p className="text-textSecondary mt-2">Once saved, the system calculates total sump capacity, computes current stored water volume, and initializes flood risk calculations.</p>

              <h4 className="font-semibold text-text mt-4 mb-2">3.2 Editing Sump Details</h4>
              <p className="text-textSecondary mb-2">Each sump includes edit functionality, allowing updates to reflect real field conditions. Editable parameters include:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Water height (after rainfall or pumping)</li>
                <li>Inflow rate (seasonal or groundwater changes)</li>
                <li>Geometry (if sump is enlarged or reshaped)</li>
              </ul>
              <p className="text-success mt-2 font-medium">
                Why this matters: Field conditions change continuously. Editing ensures the dashboard reflects actual pit conditions, not outdated assumptions.
              </p>

              <h4 className="font-semibold text-text mt-4 mb-2">3.3 Pump Integration and Editing</h4>
              <p className="text-textSecondary mb-2">Pumps are linked directly to sumps. For each pump, the user can:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Edit current discharge rate</li>
                <li>Update pump status (Running / Stopped / Fault)</li>
              </ul>
              <p className="text-textSecondary mt-2">
                The system automatically sums the discharge of all active pumps to compute total pumping capacity for that sump. 
                No manual entry of "total pumping rate" is required.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">4. Real-Time Flood Countdown Timer</h3>
              
              <h4 className="font-semibold text-text mb-2">4.1 What the Timer Shows</h4>
              <p className="text-textSecondary mb-2">Each sump displays a real-time countdown timer indicating time remaining before water reaches the critical pit floor level. The timer continuously updates based on:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Current water level</li>
                <li>Inflow rate</li>
                <li>Active pump discharge</li>
              </ul>

              <h4 className="font-semibold text-text mt-4 mb-2">4.2 How the Timer Is Calculated</h4>
              <p className="text-textSecondary mb-2">The system computes remaining storage volume in the sump and net inflow rate (inflow − pumping).</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li><strong>If pumping exceeds inflow:</strong> The timer switches to Safe / Stable. Flooding is not expected.</li>
                <li><strong>If inflow exceeds pumping:</strong> The countdown begins and time decreases dynamically as conditions change.</li>
              </ul>

              <h4 className="font-semibold text-text mt-4 mb-2">4.3 Alert Status Meaning</h4>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm border border-border">
                  <thead className="bg-surfaceAlt">
                    <tr>
                      <th className="px-4 py-2 text-left border-b border-border">Status</th>
                      <th className="px-4 py-2 text-left border-b border-border">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b border-border text-success font-semibold">SAFE</td>
                      <td className="px-4 py-2 border-b border-border text-textSecondary">Water level stable or falling</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-border text-warning font-semibold">WARNING</td>
                      <td className="px-4 py-2 border-b border-border text-textSecondary">Flooding possible within 6–24 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-danger font-semibold">CRITICAL</td>
                      <td className="px-4 py-2 text-textSecondary">Flooding likely within 6 hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-textSecondary mt-3">Alerts update automatically if a pump trips, discharge rate drops, or inflow increases (e.g., rainfall).</p>
            </section>

            {/* Section 5 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">5. Pump Health Monitoring</h3>
              <p className="text-textSecondary mb-2">The Pumps tab displays the health and availability of pumps. Key indicators:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Running status</li>
                <li>Current discharge rate</li>
                <li>Number of active pumps per sump</li>
              </ul>
              <p className="text-textSecondary mt-2">
                Any reduction in discharge immediately affects the flood timer, sump status, and alerts. 
                This ensures pump failures translate directly into operational risk visibility.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">6. Haul Road Monitoring Module</h3>
              
              <h4 className="font-semibold text-text mb-2">6.1 Road Configuration</h4>
              <p className="text-textSecondary mb-2">Haul roads can be added and edited with:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Road name</li>
                <li>Length</li>
                <li>Design cross-fall (for drainage)</li>
              </ul>

              <h4 className="font-semibold text-text mt-4 mb-2">6.2 Real-Time Road Condition Logic</h4>
              <p className="text-textSecondary mb-2">Road condition status is derived using:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Truck speed variations</li>
                <li>Load consistency</li>
                <li>Suspension response (where available)</li>
              </ul>
              <p className="text-textSecondary mt-2">Soft or saturated road sections are flagged automatically.</p>
              <p className="text-warning mt-2 font-medium">
                Operational insight: Road deterioration often indicates poor drainage or rising sump levels upstream.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">7. Editing & Real-Time Updates</h3>
              
              <h4 className="font-semibold text-text mb-2">7.1 Why Editing Is Enabled</h4>
              <p className="text-textSecondary mb-2">The system assumes manual readings, limited sensors, and changing pit geometry. Therefore, editing is intentional, not a weakness.</p>
              <p className="text-textSecondary">Edits immediately trigger:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Recalculation of flooding time</li>
                <li>Update of alert levels</li>
                <li>UI refresh without page reload</li>
              </ul>

              <h4 className="font-semibold text-text mt-4 mb-2">7.2 Real-Time System Behavior</h4>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Countdown timers update continuously</li>
                <li>Alerts change automatically</li>
                <li>No manual "refresh" is required</li>
              </ul>
              <p className="text-success mt-2 font-medium">
                This allows the foreman to monitor conditions during a shift and take action before failure occurs.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">8. Intended Users</h3>
              <p className="text-textSecondary mb-2">This system is designed for:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Pit Foremen</li>
                <li>Shift Engineers</li>
                <li>Pump Operators</li>
                <li>Road Maintenance Supervisors</li>
              </ul>
              <p className="text-textSecondary mt-3">It is <strong>not</strong> intended for:</p>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Corporate reporting</li>
                <li>Long-term planning</li>
                <li>Head office dashboards</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h3 className="text-lg font-bold text-accent mb-3">9. Key Operational Benefits</h3>
              <ul className="list-disc ml-6 text-textSecondary space-y-1">
                <li>Prevents emergency flooding</li>
                <li>Reduces haul road failures</li>
                <li>Improves coordination between water and road teams</li>
                <li>Supports data-backed shift decisions</li>
                <li>Reduces unplanned downtime</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section className="bg-surfaceAlt p-4 rounded-lg border border-border">
              <h3 className="text-lg font-bold text-accent mb-3">10. Final Note to Users</h3>
              <p className="text-textSecondary leading-relaxed">
                This dashboard <strong>does not replace engineering judgment</strong>. 
                It supports faster, better decisions by making hidden risks visible.
              </p>
              <p className="text-accent mt-3 font-semibold">
                If the system helps prevent one flooding incident or one road failure, it has achieved its purpose.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-surfaceAlt">
            <button 
              onClick={() => setShowUserGuide(false)} 
              className="w-full btn-primary"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-text mb-6 leading-tight">
              Mining Water
              <span className="text-accent"> Management </span>
              System
            </h2>
            <p className="text-lg text-textSecondary mb-8 leading-relaxed">
              Real-time sump monitoring, pump health tracking, and flood
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

      {/* User Guide Box */}
      <section className="px-4 max-w-6xl mx-auto -mt-4 mb-8">
        <button
          onClick={() => setShowUserGuide(true)}
          className="w-full md:w-auto flex items-center justify-between gap-4 p-4 bg-surface border-2 border-accent/30 hover:border-accent rounded-lg transition-all hover:shadow-lg hover:shadow-accent/10 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-text">User Guide for Pit Operations</h4>
              <p className="text-sm text-textSecondary">Learn how to use the system effectively</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-textSecondary group-hover:text-accent transition-colors" />
        </button>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-surface/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-text text-center mb-12">
            Key Features
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 - Flood Prediction -> Overview */}
            <div 
              onClick={() => navigate('/dashboard?tab=overview')}
              className="card cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all"
            >
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

            {/* Feature 2 - Pump Health -> Pumps */}
            <div 
              onClick={() => navigate('/dashboard?tab=pumps')}
              className="card cursor-pointer hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all"
            >
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

            {/* Feature 3 - Weather Alerts -> Overview */}
            <div 
              onClick={() => navigate('/dashboard?tab=overview')}
              className="card cursor-pointer hover:border-success/50 hover:shadow-lg hover:shadow-success/10 transition-all"
            >
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

            {/* Feature 4 - Road Monitoring -> Roads */}
            <div 
              onClick={() => navigate('/dashboard?tab=roads')}
              className="card cursor-pointer hover:border-danger/50 hover:shadow-lg hover:shadow-danger/10 transition-all"
            >
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

            {/* Feature 5 - Real-Time Dashboard -> Overview */}
            <div 
              onClick={() => navigate('/dashboard?tab=overview')}
              className="card cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all"
            >
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

            {/* Feature 6 - Early Warnings -> Overview */}
            <div 
              onClick={() => navigate('/dashboard?tab=overview')}
              className="card cursor-pointer hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all"
            >
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
          &copy; 2026 Mine Water Management System. Built for operational excellence by Mobashshir Zainuddin.
        </p>
      </footer>

      {/* User Guide Modal */}
      <UserGuideModal />
    </div>
  );
}

export default LandingPage;
