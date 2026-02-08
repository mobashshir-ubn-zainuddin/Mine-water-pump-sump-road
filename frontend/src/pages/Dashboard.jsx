'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../stores/authStore';
import {
  Droplet,
  Zap,
  AlertTriangle,
  MapPin,
  Cloud,
  TrendingUp,
  Plus,
  Eye,
  Loader,
  Activity,
  Truck,
  Edit,
  X
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ============ DASHBOARD PAGE ============
// Main control center for mining water management
// Shows sumps, pumps, roads, weather, and real-time alerts

function Dashboard() {
  const { user, locationPermission } = useAuthStore();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sumps, setSumps] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [roads, setRoads] = useState([]);
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSumpForm, setShowSumpForm] = useState(false);
  const [showPumpForm, setShowPumpForm] = useState(false);
  const [showRoadForm, setShowRoadForm] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  // Edit state
  const [editingSump, setEditingSump] = useState(null);
  const [editingPump, setEditingPump] = useState(null);
  const [dataFetchedAt, setDataFetchedAt] = useState(Date.now());
  const [tickCount, setTickCount] = useState(0);

  // Update tab from URL when navigating from landing page
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['overview', 'pumps', 'roads'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Fetch initial data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Calculate alerts from data
  useEffect(() => {
    const newAlerts = [];
    
    // Check sumps for critical/warning status
    sumps.forEach(sump => {
      if (sump.floodAnalysis?.status === 'critical') {
        newAlerts.push({
          type: 'critical',
          source: 'sump',
          message: `Sump "${sump.name}": ${sump.floodAnalysis.message}`,
          id: sump._id
        });
      } else if (sump.floodAnalysis?.status === 'warning') {
        newAlerts.push({
          type: 'warning',
          source: 'sump',
          message: `Sump "${sump.name}": ${sump.floodAnalysis.message}`,
          id: sump._id
        });
      }
    });
    
    // Check pumps for siltation
    pumps.forEach(pump => {
      if (pump.siltationSuspected || pump.healthIndicators?.siltationFlag) {
        newAlerts.push({
          type: 'warning',
          source: 'pump',
          message: `Pump "${pump.pumpId}": Siltation detected - desilting required`,
          id: pump._id
        });
      }
      if (pump.status === 'FAULT') {
        newAlerts.push({
          type: 'critical',
          source: 'pump',
          message: `Pump "${pump.pumpId}": FAULT - requires immediate attention`,
          id: pump._id
        });
      }
    });
    
    // Check roads for soft spots
    roads.forEach(road => {
      if (road.softSpotDetected) {
        newAlerts.push({
          type: 'warning',
          source: 'road',
          message: `Road "${road.name || road.roadId}": Soft spots detected (${road.softSpotLocations?.length || 0})`,
          id: road._id
        });
      }
      if (road.condition?.status === 'CRITICAL' || road.drainageRisk === 'severe') {
        newAlerts.push({
          type: 'critical',
          source: 'road',
          message: `Road "${road.name || road.roadId}": Critical condition - maintenance required`,
          id: road._id
        });
      }
    });
    
    setAlerts(newAlerts);
  }, [sumps, pumps, roads]);

  // Real-time countdown timer - updates every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTickCount(prev => prev + 1); // Force re-render every minute
    }, 60000); // Update every 60 seconds (1 minute)
    
    return () => clearInterval(intervalId);
  }, []);

  // Calculate elapsed time in hours since data was fetched
  const getElapsedHours = () => {
    return (Date.now() - dataFetchedAt) / (1000 * 60 * 60);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [sumpsRes, pumpsRes, roadsRes] = await Promise.all([
        apiClient.get('/api/sumps'),
        apiClient.get('/api/pumps'),
        apiClient.get('/api/roads')
      ]);

      setSumps(sumpsRes.data.sumps || []);
      setPumps(pumpsRes.data.pumps || []);
      setRoads(roadsRes.data.roads || []);
      setDataFetchedAt(Date.now()); // Track when data was fetched for countdown

      // Fetch weather if location permission is granted
      if (locationPermission) {
        fetchWeather();
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      const location = JSON.parse(localStorage.getItem('userLocation') || '{}');
      if (location.lat && location.lng) {
        const res = await apiClient.get('/api/weather/forecast', {
          params: { lat: location.lat, lng: location.lng }
        });
        setWeather(res.data);
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
    }
  };

  // ============ STATUS BADGE COMPONENT ============
  const StatusBadge = ({ status }) => {
    const styles = {
      safe: 'badge-safe',
      warning: 'badge-warning',
      critical: 'badge-critical',
      GOOD: 'badge-safe',
      SOFT: 'badge-warning',
      CRITICAL: 'badge-critical',
      RUNNING: 'badge-safe',
      STOPPED: 'badge-warning',
      FAULT: 'badge-critical'
    };
    const labels = {
      safe: '🟢 Safe',
      warning: '🟠 Warning',
      critical: '🔴 Critical',
      GOOD: '🟢 Good',
      SOFT: '🟠 Soft',
      CRITICAL: '🔴 Critical',
      RUNNING: '🟢 Running',
      STOPPED: '🟡 Stopped',
      FAULT: '🔴 Fault'
    };
    return <span className={styles[status] || 'badge-safe'}>{labels[status] || status}</span>;
  };

  // ============ SUMP FORM MODAL ============
  const SumpFormModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      length: '',
      width: '',
      depth: '',
      currentWaterHeight: '',
      inflowRate: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.post('/api/sumps', {
          ...formData,
          length: parseFloat(formData.length),
          width: parseFloat(formData.width),
          depth: parseFloat(formData.depth),
          currentWaterHeight: parseFloat(formData.currentWaterHeight),
          inflowRate: parseFloat(formData.inflowRate)
        });
        setShowSumpForm(false);
        fetchAllData();
      } catch (err) {
        alert('Failed to create sump: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!showSumpForm) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-text mb-4">Add Sump</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Sump Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Length (m)"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Width (m)"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Depth (m)"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            <input
              type="number"
              step="0.1"
              placeholder="Water Height (m)"
              value={formData.currentWaterHeight}
              onChange={(e) => setFormData({ ...formData, currentWaterHeight: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Inflow Rate (m³/hr)"
              value={formData.inflowRate}
              onChange={(e) => setFormData({ ...formData, inflowRate: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                {isSubmitting ? 'Creating...' : 'Create Sump'}
              </button>
              <button
                type="button"
                onClick={() => setShowSumpForm(false)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ EDIT SUMP MODAL ============
  const EditSumpModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      length: '',
      width: '',
      depth: '',
      currentWaterHeight: '',
      inflowRate: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill form when editingSump changes
    useEffect(() => {
      if (editingSump) {
        setFormData({
          name: editingSump.name || '',
          length: editingSump.length || '',
          width: editingSump.width || '',
          depth: editingSump.depth || '',
          currentWaterHeight: editingSump.currentWaterHeight || '',
          inflowRate: editingSump.inflowRate || ''
        });
      }
    }, [editingSump]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.put(`/api/sumps/${editingSump._id}`, {
          ...formData,
          length: parseFloat(formData.length),
          width: parseFloat(formData.width),
          depth: parseFloat(formData.depth),
          currentWaterHeight: parseFloat(formData.currentWaterHeight),
          inflowRate: parseFloat(formData.inflowRate)
        });
        setEditingSump(null);
        fetchAllData(); // Refresh data & reset countdown timer
      } catch (err) {
        alert('Failed to update sump: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!editingSump) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text">Edit Sump</h3>
            <button onClick={() => setEditingSump(null)} className="text-textSecondary hover:text-text">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Sump Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Length (m)"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Width (m)"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Depth (m)"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            <input
              type="number"
              step="0.1"
              placeholder="Water Height (m)"
              value={formData.currentWaterHeight}
              onChange={(e) => setFormData({ ...formData, currentWaterHeight: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Inflow Rate (m³/hr)"
              value={formData.inflowRate}
              onChange={(e) => setFormData({ ...formData, inflowRate: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            <div className="mt-2 p-2 bg-surfaceAlt rounded text-xs text-textSecondary">
              <p>📊 After saving, time-to-flood will recalculate based on new values.</p>
              <p>⏱️ The countdown timer will restart from the new calculated time.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingSump(null)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ PUMP FORM MODAL ============
  const PumpFormModal = () => {
    const [formData, setFormData] = useState({
      pumpId: '',
      sumpId: '',
      ratedDischarge: '',
      currentDischarge: '',
      motorPowerKw: '',
      motorTorqueNm: '',
      status: 'STOPPED'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.post('/api/pumps', {
          pumpId: formData.pumpId,
          sumpId: formData.sumpId,
          ratedDischarge: parseFloat(formData.ratedDischarge),
          currentDischarge: parseFloat(formData.currentDischarge),
          motor: {
            powerKw: parseFloat(formData.motorPowerKw) || 0,
            torqueNm: parseFloat(formData.motorTorqueNm) || 0
          },
          status: formData.status
        });
        setShowPumpForm(false);
        setFormData({
          pumpId: '',
          sumpId: '',
          ratedDischarge: '',
          currentDischarge: '',
          motorPowerKw: '',
          motorTorqueNm: '',
          status: 'STOPPED'
        });
        fetchAllData();
      } catch (err) {
        alert('Failed to create pump: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!showPumpForm) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-text mb-4">Add Pump</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Pump ID (e.g., PUMP-001)"
              value={formData.pumpId}
              onChange={(e) => setFormData({ ...formData, pumpId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            
            <select
              value={formData.sumpId}
              onChange={(e) => setFormData({ ...formData, sumpId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="">Select Connected Sump</option>
              {sumps.map(sump => (
                <option key={sump._id} value={sump._id}>{sump.name}</option>
              ))}
            </select>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Rated Discharge (m³/hr)"
                value={formData.ratedDischarge}
                onChange={(e) => setFormData({ ...formData, ratedDischarge: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Current Discharge (m³/hr)"
                value={formData.currentDischarge}
                onChange={(e) => setFormData({ ...formData, currentDischarge: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Motor Power (kW)"
                value={formData.motorPowerKw}
                onChange={(e) => setFormData({ ...formData, motorPowerKw: e.target.value })}
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Motor Torque (Nm)"
                value={formData.motorTorqueNm}
                onChange={(e) => setFormData({ ...formData, motorTorqueNm: e.target.value })}
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="STOPPED">Stopped</option>
              <option value="RUNNING">Running</option>
              <option value="FAULT">Fault</option>
            </select>
            
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                {isSubmitting ? 'Creating...' : 'Create Pump'}
              </button>
              <button
                type="button"
                onClick={() => setShowPumpForm(false)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ EDIT PUMP MODAL ============
  const EditPumpModal = () => {
    const [formData, setFormData] = useState({
      pumpId: '',
      sumpId: '',
      ratedDischarge: '',
      currentDischarge: '',
      motorPowerKw: '',
      motorTorqueNm: '',
      status: 'STOPPED',
      torqueTrend: 'STABLE',
      dischargeTrend: 'STABLE'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill form when editingPump changes
    useEffect(() => {
      if (editingPump) {
        setFormData({
          pumpId: editingPump.pumpId || '',
          sumpId: editingPump.sumpId?._id || editingPump.sumpId || '',
          ratedDischarge: editingPump.ratedDischarge || editingPump.originalCapacity || '',
          currentDischarge: editingPump.currentDischarge || editingPump.currentCapacity || '',
          motorPowerKw: editingPump.motor?.powerKw || '',
          motorTorqueNm: editingPump.motor?.torqueNm || '',
          status: editingPump.status || 'STOPPED',
          torqueTrend: editingPump.healthIndicators?.torqueTrend || 'STABLE',
          dischargeTrend: editingPump.healthIndicators?.dischargeTrend || 'STABLE'
        });
      }
    }, [editingPump]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.put(`/api/pumps/${editingPump._id}`, {
          pumpId: formData.pumpId,
          sumpId: formData.sumpId,
          ratedDischarge: parseFloat(formData.ratedDischarge),
          currentDischarge: parseFloat(formData.currentDischarge),
          motor: {
            powerKw: parseFloat(formData.motorPowerKw) || 0,
            torqueNm: parseFloat(formData.motorTorqueNm) || 0
          },
          status: formData.status,
          healthIndicators: {
            torqueTrend: formData.torqueTrend,
            dischargeTrend: formData.dischargeTrend
          }
        });
        setEditingPump(null);
        fetchAllData(); // Refresh data & recalculate all sump flood times
      } catch (err) {
        alert('Failed to update pump: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!editingPump) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text">Edit Pump</h3>
            <button onClick={() => setEditingPump(null)} className="text-textSecondary hover:text-text">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Pump ID (e.g., PUMP-001)"
              value={formData.pumpId}
              onChange={(e) => setFormData({ ...formData, pumpId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            
            <select
              value={formData.sumpId}
              onChange={(e) => setFormData({ ...formData, sumpId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="">Select Connected Sump</option>
              {sumps.map(sump => (
                <option key={sump._id} value={sump._id}>{sump.name}</option>
              ))}
            </select>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Rated Discharge (m³/hr)"
                value={formData.ratedDischarge}
                onChange={(e) => setFormData({ ...formData, ratedDischarge: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Current Discharge (m³/hr)"
                value={formData.currentDischarge}
                onChange={(e) => setFormData({ ...formData, currentDischarge: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Motor Power (kW)"
                value={formData.motorPowerKw}
                onChange={(e) => setFormData({ ...formData, motorPowerKw: e.target.value })}
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Motor Torque (Nm)"
                value={formData.motorTorqueNm}
                onChange={(e) => setFormData({ ...formData, motorTorqueNm: e.target.value })}
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="STOPPED">Stopped</option>
              <option value="RUNNING">Running</option>
              <option value="FAULT">Fault</option>
            </select>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-textSecondary block mb-1">Torque Trend</label>
                <select
                  value={formData.torqueTrend}
                  onChange={(e) => setFormData({ ...formData, torqueTrend: e.target.value })}
                  className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
                >
                  <option value="STABLE">Stable</option>
                  <option value="RISING">Rising (⚠️)</option>
                  <option value="FALLING">Falling</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-textSecondary block mb-1">Discharge Trend</label>
                <select
                  value={formData.dischargeTrend}
                  onChange={(e) => setFormData({ ...formData, dischargeTrend: e.target.value })}
                  className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
                >
                  <option value="STABLE">Stable</option>
                  <option value="RISING">Rising</option>
                  <option value="FALLING">Falling (⚠️)</option>
                </select>
              </div>
            </div>
            
            {formData.torqueTrend === 'RISING' && formData.dischargeTrend === 'FALLING' && (
              <div className="p-2 bg-danger/10 border border-danger/50 rounded text-sm text-danger">
                ⚠️ Siltation pattern detected! Rising torque + falling discharge indicates pump blockage.
              </div>
            )}
            
            <div className="mt-2 p-2 bg-surfaceAlt rounded text-xs text-textSecondary">
              <p>📊 Changing pump status/discharge affects connected sump's time-to-flood.</p>
              <p>⏱️ Countdown timer resets after saving.</p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingPump(null)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ ROAD FORM MODAL ============
  const RoadFormModal = () => {
    const [formData, setFormData] = useState({
      roadId: '',
      name: '',
      lengthM: '',
      designCrossFallPercent: '3',
      priority: 'medium',
      linkedSumpId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await apiClient.post('/api/roads', {
          roadId: formData.roadId,
          name: formData.name || formData.roadId,
          geometry: {
            lengthM: parseFloat(formData.lengthM),
            designCrossFallPercent: parseFloat(formData.designCrossFallPercent)
          },
          priority: formData.priority,
          linkedSumpId: formData.linkedSumpId || undefined,
          requiredCrossFall: parseFloat(formData.designCrossFallPercent),
          currentCrossFall: parseFloat(formData.designCrossFallPercent)
        });
        setShowRoadForm(false);
        setFormData({
          roadId: '',
          name: '',
          lengthM: '',
          designCrossFallPercent: '3',
          priority: 'medium',
          linkedSumpId: ''
        });
        fetchAllData();
      } catch (err) {
        alert('Failed to create road: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!showRoadForm) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-text mb-4">Add Haul Road</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Road ID (e.g., ROAD-001)"
              value={formData.roadId}
              onChange={(e) => setFormData({ ...formData, roadId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            
            <input
              type="text"
              placeholder="Road Name (e.g., Main Haul Road)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="1"
                placeholder="Length (m)"
                value={formData.lengthM}
                onChange={(e) => setFormData({ ...formData, lengthM: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Cross-fall (%)"
                value={formData.designCrossFallPercent}
                onChange={(e) => setFormData({ ...formData, designCrossFallPercent: e.target.value })}
                required
                className="px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
              />
            </div>
            
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            
            <select
              value={formData.linkedSumpId}
              onChange={(e) => setFormData({ ...formData, linkedSumpId: e.target.value })}
              className="w-full px-3 py-2 bg-surfaceAlt border border-border rounded text-text text-sm"
            >
              <option value="">Link to Sump (optional)</option>
              {sumps.map(sump => (
                <option key={sump._id} value={sump._id}>{sump.name}</option>
              ))}
            </select>
            
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                {isSubmitting ? 'Creating...' : 'Create Road'}
              </button>
              <button
                type="button"
                onClick={() => setShowRoadForm(false)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============ FORMAT TIME HELPER ============
  const formatTimeToFlood = (floodAnalysis, includeCountdown = true) => {
    if (!floodAnalysis) return 'N/A';
    if (floodAnalysis.timeToFlood === Infinity || floodAnalysis.netInflow <= 0) {
      return '∞ (Stable)';
    }
    let hours = floodAnalysis.timeToFloodHours || floodAnalysis.timeToFlood;
    
    // Subtract elapsed time since data was fetched (real-time countdown)
    if (includeCountdown) {
      const elapsed = getElapsedHours();
      hours = Math.max(0, hours - elapsed);
    }
    
    if (hours <= 0) return '⚠️ FLOODING NOW';
    if (hours > 48) return `${Math.round(hours)} hours`;
    if (hours > 1) return `${hours.toFixed(1)} hours`;
    return `${Math.round(hours * 60)} minutes`;
  };
  
  // Get adjusted time to flood accounting for elapsed time
  const getAdjustedTimeToFlood = (sump) => {
    if (!sump.floodAnalysis) return null;
    if (sump.floodAnalysis.timeToFlood === Infinity || sump.floodAnalysis.netInflow <= 0) {
      return Infinity;
    }
    const hours = sump.floodAnalysis.timeToFloodHours || sump.floodAnalysis.timeToFlood;
    const elapsed = getElapsedHours();
    return Math.max(0, hours - elapsed);
  };

  // ============ RENDER OVERVIEW TAB ============
  const renderOverviewTab = () => {
    const runningPumps = pumps.filter(p => p.status === 'RUNNING').length;
    const roadsAtRisk = roads.filter(r => r.softSpotDetected || r.condition?.status !== 'GOOD').length;
    
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm">Total Sumps</p>
                <p className="text-3xl font-bold text-text">{sumps.length}</p>
              </div>
              <Droplet className="w-8 h-8 text-accent opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm">Active Pumps</p>
                <p className="text-3xl font-bold text-text">{runningPumps}<span className="text-lg text-textSecondary">/{pumps.length}</span></p>
              </div>
              <Zap className="w-8 h-8 text-warning opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm">Roads at Risk</p>
                <p className="text-3xl font-bold text-text">{roadsAtRisk}<span className="text-lg text-textSecondary">/{roads.length}</span></p>
              </div>
              <MapPin className="w-8 h-8 text-success opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm">Active Alerts</p>
                <p className={`text-3xl font-bold ${alerts.length > 0 ? 'text-danger' : 'text-success'}`}>
                  {alerts.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-danger opacity-20" />
            </div>
          </div>
        </div>

        {/* Active Alerts Section */}
        {alerts.length > 0 && (
          <div className="card border-2 border-danger/50 bg-danger/5">
            <h3 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded border ${
                    alert.type === 'critical' 
                      ? 'bg-danger/10 border-danger/50 text-danger' 
                      : 'bg-warning/10 border-warning/50 text-warning'
                  }`}
                >
                  <span className="mr-2">{alert.type === 'critical' ? '🔴' : '🟠'}</span>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sumps Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text">Sumps</h3>
            <button
              onClick={() => setShowSumpForm(true)}
              className="flex items-center gap-2 btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Sump
            </button>
          </div>

          {sumps.length === 0 ? (
            <p className="text-textSecondary text-center py-8">
              No sumps created yet. Add your first sump to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {sumps.map((sump) => (
                <div key={sump._id} className="border border-border rounded-lg p-4 bg-surfaceAlt/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-text">{sump.name}</h4>
                      <p className="text-sm text-textSecondary">
                        Capacity: {sump.capacityPercent}% | Water: {sump.currentWaterHeight}m / {sump.depth}m
                      </p>
                      <p className="text-sm text-textSecondary">
                        Total Vol: {sump.maxVolume?.toFixed(1)} m³ | Current: {sump.currentVolume?.toFixed(1)} m³
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingSump(sump)}
                        className="p-1.5 hover:bg-surfaceAlt rounded text-textSecondary hover:text-accent transition-colors"
                        title="Edit Sump"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <StatusBadge status={sump.floodAnalysis?.status || sump.status} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-textSecondary">Inflow Rate:</span>
                      <span className="ml-2 text-text">{sump.inflowRate} m³/hr</span>
                    </div>
                    <div>
                      <span className="text-textSecondary">Pumping Rate:</span>
                      <span className="ml-2 text-text">{sump.totalPumpingCapacity || 0} m³/hr</span>
                    </div>
                    <div>
                      <span className="text-textSecondary">Net Inflow:</span>
                      <span className={`ml-2 ${(sump.floodAnalysis?.netInflow || 0) > 0 ? 'text-warning' : 'text-success'}`}>
                        {(sump.floodAnalysis?.netInflow || 0).toFixed(1)} m³/hr
                      </span>
                    </div>
                    <div>
                      <span className="text-textSecondary">Time to Flood:</span>
                      <span className="ml-2 text-text">{formatTimeToFlood(sump.floodAnalysis)}</span>
                    </div>
                  </div>
                  
                  {sump.floodAnalysis && (
                    <div className="mt-3 text-sm">
                      <p className={`${
                        sump.floodAnalysis.status === 'critical' ? 'text-danger' :
                        sump.floodAnalysis.status === 'warning' ? 'text-warning' : 'text-success'
                      }`}>
                        {sump.floodAnalysis.message}
                      </p>
                      <p className="text-textSecondary mt-1">
                        Connected Pumps: {sump.activePumps || 0} active / {sump.totalPumps || 0} total
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather Alert */}
        {locationPermission && weather && (
          <div className="card border-2 border-warning/50 bg-warning/5">
            <div className="flex items-start gap-3">
              <Cloud className="w-6 h-6 text-warning flex-shrink-0" />
              <div>
                <h3 className="font-bold text-text">Weather Forecast</h3>
                <p className="text-sm text-textSecondary mt-1">
                  {weather.stormAnalysis?.riskLevel === 'high'
                    ? 'High storm risk - Prepare for heavy rainfall'
                    : 'Normal weather conditions'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER PUMPS TAB ============
  const renderPumpsTab = () => {
    const healthySumps = pumps.filter(p => p.health === 'green').length;
    const warningPumps = pumps.filter(p => p.health === 'yellow').length;
    const criticalPumps = pumps.filter(p => p.health === 'red').length;
    const siltationPumps = pumps.filter(p => p.siltationSuspected || p.healthIndicators?.siltationFlag).length;
    
    return (
      <div className="space-y-6">
        {/* Pump Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-textSecondary text-sm">Healthy</p>
            <p className="text-2xl font-bold text-success">{healthySumps}</p>
          </div>
          <div className="card">
            <p className="text-textSecondary text-sm">Warning</p>
            <p className="text-2xl font-bold text-warning">{warningPumps}</p>
          </div>
          <div className="card">
            <p className="text-textSecondary text-sm">Critical</p>
            <p className="text-2xl font-bold text-danger">{criticalPumps}</p>
          </div>
          <div className="card">
            <p className="text-textSecondary text-sm">Siltation Issues</p>
            <p className="text-2xl font-bold text-warning">{siltationPumps}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text">Pump Health</h3>
            <button
              onClick={() => setShowPumpForm(true)}
              className="flex items-center gap-2 btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Pump
            </button>
          </div>

          {sumps.length === 0 ? (
            <p className="text-textSecondary text-center py-8">
              Create a sump first before adding pumps.
            </p>
          ) : pumps.length === 0 ? (
            <p className="text-textSecondary text-center py-8">
              No pumps configured yet. Add a pump to monitor pump health.
            </p>
          ) : (
            <div className="space-y-4">
              {pumps.map((pump) => {
                const rated = pump.ratedDischarge || pump.originalCapacity || 1;
                const current = pump.currentDischarge || pump.currentCapacity || 0;
                const capacityPercent = Math.round((current / rated) * 100);
                
                return (
                  <div key={pump._id} className="border border-border rounded-lg p-4 bg-surfaceAlt/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-text flex items-center gap-2">
                          {pump.pumpId}
                          <StatusBadge status={pump.status || 'STOPPED'} />
                        </h4>
                        <p className="text-sm text-textSecondary">
                          Discharge: {current} / {rated} m³/hr ({capacityPercent}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingPump(pump)}
                          className="p-1.5 hover:bg-surfaceAlt rounded text-textSecondary hover:text-accent transition-colors"
                          title="Edit Pump"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <span className={
                          pump.health === 'green'
                            ? 'badge-safe'
                            : pump.health === 'yellow'
                              ? 'badge-warning'
                              : 'badge-critical'
                        }>
                          {pump.health === 'green' ? '🟢 Healthy' : pump.health === 'yellow' ? '🟡 Warning' : '🔴 Critical'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-textSecondary">Motor Power:</span>
                        <span className="ml-2 text-text">{pump.motor?.powerKw || 0} kW</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Motor Torque:</span>
                        <span className="ml-2 text-text">{pump.motor?.torqueNm || 0} Nm</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Torque Trend:</span>
                        <span className={`ml-2 ${pump.healthIndicators?.torqueTrend === 'RISING' ? 'text-warning' : 'text-success'}`}>
                          {pump.healthIndicators?.torqueTrend || pump.motorTorqueTrend || 'Normal'}
                        </span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Discharge Trend:</span>
                        <span className={`ml-2 ${pump.healthIndicators?.dischargeTrend === 'FALLING' ? 'text-warning' : 'text-success'}`}>
                          {pump.healthIndicators?.dischargeTrend || pump.dischargeTrend || 'Normal'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Capacity Bar */}
                    <div className="w-full bg-surfaceAlt rounded-full h-2 mb-3">
                      <div 
                        className={`h-2 rounded-full ${
                          capacityPercent >= 70 ? 'bg-success' :
                          capacityPercent >= 60 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                      />
                    </div>
                    
                    {(pump.siltationSuspected || pump.healthIndicators?.siltationFlag) && (
                      <div className="mt-2 p-2 bg-danger/10 border border-danger/50 rounded text-sm text-danger">
                        ⚠️ Siltation detected - Motor torque rising while discharge falling. Deploy vacuum truck for desilting.
                      </div>
                    )}
                    
                    {pump.healthStatus?.message && (
                      <p className="text-sm text-textSecondary mt-2">{pump.healthStatus.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ RENDER ROADS TAB ============
  const renderRoadsTab = () => {
    const goodRoads = roads.filter(r => r.condition?.status === 'GOOD' && !r.softSpotDetected).length;
    const softRoads = roads.filter(r => r.condition?.status === 'SOFT' || r.softSpotDetected).length;
    const criticalRoads = roads.filter(r => r.condition?.status === 'CRITICAL' || r.drainageRisk === 'severe').length;
    
    return (
      <div className="space-y-6">
        {/* Road Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-textSecondary text-sm">Good Condition</p>
            <p className="text-2xl font-bold text-success">{goodRoads}</p>
          </div>
          <div className="card">
            <p className="text-textSecondary text-sm">Soft Spots Detected</p>
            <p className="text-2xl font-bold text-warning">{softRoads}</p>
          </div>
          <div className="card">
            <p className="text-textSecondary text-sm">Critical</p>
            <p className="text-2xl font-bold text-danger">{criticalRoads}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text">Haul Roads</h3>
            <button
              onClick={() => setShowRoadForm(true)}
              className="flex items-center gap-2 btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Road
            </button>
          </div>

          {roads.length === 0 ? (
            <p className="text-textSecondary text-center py-8">
              No roads configured yet. Add a haul road to monitor road conditions.
            </p>
          ) : (
            <div className="space-y-4">
              {roads.map((road) => {
                const linkedSump = sumps.find(s => s._id === road.linkedSumpId);
                
                return (
                  <div key={road._id} className="border border-border rounded-lg p-4 bg-surfaceAlt/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-text">{road.name || road.roadId}</h4>
                        <p className="text-sm text-textSecondary">
                          ID: {road.roadId} | Priority: {road.priority?.toUpperCase()}
                        </p>
                      </div>
                      <StatusBadge status={road.condition?.status || 'GOOD'} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-textSecondary">Length:</span>
                        <span className="ml-2 text-text">{road.geometry?.lengthM || 0} m</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Cross-fall:</span>
                        <span className="ml-2 text-text">
                          {road.currentCrossFall || road.geometry?.designCrossFallPercent || 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Drainage Risk:</span>
                        <span className={`ml-2 ${
                          road.drainageRisk === 'severe' ? 'text-danger' :
                          road.drainageRisk === 'moderate' ? 'text-warning' : 'text-success'
                        }`}>
                          {road.drainageRisk?.toUpperCase() || 'SAFE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-textSecondary">Last Updated:</span>
                        <span className="ml-2 text-text">
                          {road.condition?.lastUpdated 
                            ? new Date(road.condition.lastUpdated).toLocaleDateString() 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {linkedSump && (
                      <div className="text-sm mb-3 p-2 bg-surfaceAlt rounded">
                        <span className="text-textSecondary">Linked Sump:</span>
                        <span className="ml-2 text-text">{linkedSump.name}</span>
                        <span className="ml-2">
                          <StatusBadge status={linkedSump.floodAnalysis?.status || linkedSump.status} />
                        </span>
                      </div>
                    )}
                    
                    {road.softSpotDetected && (
                      <div className="mt-2 p-2 bg-warning/10 border border-warning/50 rounded text-sm text-warning">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="w-4 h-4" />
                          <span className="font-semibold">Soft Spots Detected ({road.softSpotLocations?.length || 0})</span>
                        </div>
                        <p>Road surface compromise detected via truck telemetry. Inspect drainage and schedule maintenance.</p>
                        {road.softSpotLocations?.slice(0, 3).map((spot, idx) => (
                          <div key={idx} className="ml-6 text-xs mt-1">
                            • Location: ({spot.lat?.toFixed(4)}, {spot.lng?.toFixed(4)}) - Severity: {spot.severity}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {road.requiresRegrading && (
                      <div className="mt-2 p-2 bg-danger/10 border border-danger/50 rounded text-sm text-danger">
                        ⚠️ Regrading required - {road.roadStatus?.drainageStatus?.action || 'Schedule maintenance'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Telemetry Info */}
        <div className="card border border-border/50">
          <div className="flex items-start gap-3">
            <Truck className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <h3 className="font-bold text-text">Truck Telemetry Detection</h3>
              <p className="text-sm text-textSecondary mt-1">
                Soft spots are automatically detected when truck telemetry shows:
              </p>
              <ul className="text-sm text-textSecondary mt-2 list-disc ml-4">
                <li>Speed drops consistently while payload remains constant</li>
                <li>Strut pressure increases abnormally</li>
                <li>Same location flagged by multiple trucks</li>
              </ul>
              <p className="text-sm text-textSecondary mt-2">
                Submit telemetry data via API: POST /api/roads/:roadId/telemetry
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text">
              Mining Control Center
            </h1>
            <p className="text-textSecondary mt-2">
              Welcome, {user?.name}. Monitor your mining operations in real-time.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/50 rounded-lg text-danger">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-2 mb-6 border-b border-border">
                {['overview', 'pumps', 'roads'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 font-semibold transition-colors capitalize ${
                      activeTab === tab
                        ? 'text-accent border-b-2 border-accent'
                        : 'text-textSecondary hover:text-text'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'pumps' && renderPumpsTab()}
                {activeTab === 'roads' && renderRoadsTab()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <SumpFormModal />
      <PumpFormModal />
      <RoadFormModal />
      <EditSumpModal />
      <EditPumpModal />
    </div>
  );
}

export default Dashboard;
