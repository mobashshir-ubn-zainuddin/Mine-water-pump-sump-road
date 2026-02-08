import express from 'express';
import Pump from '../models/Pump.js';
import Sump from '../models/Sump.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validatePumpCreation,
  handleValidationErrors
} from '../middleware/validation.js';

const router = express.Router();

// ============ GET ALL PUMPS (FOR CURRENT USER) ============
// Retrieve all pumps with health status
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const pumps = await Pump.find({ userId: req.user.userId, isActive: true })
      .populate('sumpId', 'name')
      .sort({ createdAt: -1 });

    // Enrich with health information
    const enrichedPumps = pumps.map((pump) => ({
      ...pump.toObject(),
      healthStatus: pump.getHealthStatus()
    }));

    res.status(200).json({
      count: enrichedPumps.length,
      pumps: enrichedPumps
    });
  })
);

// ============ CREATE PUMP ============
// Add pump to a sump
router.post(
  '/',
  verifyToken,
  validatePumpCreation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { 
      pumpId, 
      sumpId, 
      ratedDischarge,
      currentDischarge,
      originalCapacity, 
      currentCapacity,
      motor,
      status
    } = req.body;

    // Verify sump exists and belongs to user
    const sump = await Sump.findOne({
      _id: sumpId,
      userId: req.user.userId
    });

    if (!sump) {
      return res.status(404).json({ error: 'Sump not found' });
    }

    // Verify pump ID is unique
    const existingPump = await Pump.findOne({ pumpId });
    if (existingPump) {
      return res.status(400).json({ error: 'Pump ID already exists' });
    }

    // Use new schema fields with fallback to legacy
    const rated = ratedDischarge || originalCapacity;
    const current = currentDischarge || currentCapacity;

    // Validate capacity
    if (current > rated) {
      return res.status(400).json({
        error: 'Current discharge cannot exceed rated discharge'
      });
    }

    const pump = new Pump({
      userId: req.user.userId,
      pumpId,
      sumpId,
      ratedDischarge: rated,
      currentDischarge: current,
      originalCapacity: rated,
      currentCapacity: current,
      motor: motor || { powerKw: 0, torqueNm: 0, currentTorqueNm: 0 },
      status: status || 'STOPPED'
    });

    // Update health status
    pump.updateHealth();

    await pump.save();

    // Add pump to sump's connected pumps
    sump.connectedPumps.push(pump._id);
    await sump.save();

    res.status(201).json({
      message: 'Pump created successfully',
      pump: {
        ...pump.toObject(),
        healthStatus: pump.getHealthStatus()
      }
    });
  })
);

// ============ GET SINGLE PUMP ============
// Retrieve pump with detailed health analysis
router.get(
  '/:pumpId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const pump = await Pump.findOne({
      _id: req.params.pumpId,
      userId: req.user.userId
    }).populate('sumpId');

    if (!pump) {
      return res.status(404).json({ error: 'Pump not found' });
    }

    res.status(200).json({
      pump: {
        ...pump.toObject(),
        healthStatus: pump.getHealthStatus()
      }
    });
  })
);

// ============ UPDATE PUMP ============
// Update pump capacity, status, and health indicators
router.put(
  '/:pumpId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { 
      currentDischarge,
      currentCapacity, 
      status,
      motor,
      healthIndicators,
      motorTorqueTrend, 
      dischargeTrend, 
      operatingHours, 
      notes 
    } = req.body;

    const pump = await Pump.findOne({
      _id: req.params.pumpId,
      userId: req.user.userId
    });

    if (!pump) {
      return res.status(404).json({ error: 'Pump not found' });
    }

    const rated = pump.ratedDischarge || pump.originalCapacity;

    // Validate and update discharge
    const newDischarge = currentDischarge !== undefined ? currentDischarge : currentCapacity;
    if (newDischarge !== undefined) {
      if (newDischarge > rated) {
        return res.status(400).json({
          error: 'Current discharge cannot exceed rated discharge'
        });
      }
      pump.currentDischarge = newDischarge;
      pump.currentCapacity = newDischarge;
    }

    // Update status
    if (status) pump.status = status;

    // Update motor data
    if (motor) {
      pump.motor = { ...pump.motor, ...motor };
    }

    // Update health indicators (new schema)
    if (healthIndicators) {
      pump.healthIndicators = { ...pump.healthIndicators, ...healthIndicators };
    }

    // Update legacy fields
    if (motorTorqueTrend) pump.motorTorqueTrend = motorTorqueTrend;
    if (dischargeTrend) pump.dischargeTrend = dischargeTrend;
    if (operatingHours !== undefined) pump.operatingHours = operatingHours;
    if (notes) pump.maintenanceNotes = notes;

    // Update health status (will also check siltation)
    pump.updateHealth();

    await pump.save();

    res.status(200).json({
      message: 'Pump updated successfully',
      pump: {
        ...pump.toObject(),
        healthStatus: pump.getHealthStatus()
      }
    });
  })
);

// ============ DELETE PUMP ============
// Remove pump from sump
router.delete(
  '/:pumpId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const pump = await Pump.findOne({
      _id: req.params.pumpId,
      userId: req.user.userId
    });

    if (!pump) {
      return res.status(404).json({ error: 'Pump not found' });
    }

    // Remove from sump's connected pumps
    await Sump.findByIdAndUpdate(pump.sumpId, {
      $pull: { connectedPumps: pump._id }
    });

    pump.isActive = false;
    await pump.save();

    res.status(200).json({ message: 'Pump deleted successfully' });
  })
);

// ============ GET ALL PUMP HEALTH STATUS ============
// Get health summary for all pumps
router.get(
  '/user/health-summary',
  verifyToken,
  asyncHandler(async (req, res) => {
    const pumps = await Pump.find({
      userId: req.user.userId,
      isActive: true
    });

    const healthSummary = {
      totalPumps: pumps.length,
      runningPumps: pumps.filter((p) => p.status === 'RUNNING').length,
      stoppedPumps: pumps.filter((p) => p.status === 'STOPPED').length,
      faultPumps: pumps.filter((p) => p.status === 'FAULT').length,
      healthy: pumps.filter((p) => p.health === 'green').length,
      warning: pumps.filter((p) => p.health === 'yellow').length,
      critical: pumps.filter((p) => p.health === 'red').length,
      siltationIssues: pumps.filter((p) => p.siltationSuspected || p.healthIndicators?.siltationFlag).length,
      totalActiveDischarge: pumps
        .filter(p => p.status === 'RUNNING')
        .reduce((sum, p) => sum + (p.currentDischarge || p.currentCapacity || 0), 0),
      pumpDetails: pumps.map((p) => ({
        pumpId: p.pumpId,
        status: p.status,
        health: p.health,
        ratedDischarge: p.ratedDischarge || p.originalCapacity,
        currentDischarge: p.currentDischarge || p.currentCapacity,
        capacityPercent: Math.round(((p.currentDischarge || p.currentCapacity) / (p.ratedDischarge || p.originalCapacity)) * 100),
        siltationDetected: p.siltationSuspected || p.healthIndicators?.siltationFlag
      }))
    };

    res.status(200).json(healthSummary);
  })
);

export default router;
