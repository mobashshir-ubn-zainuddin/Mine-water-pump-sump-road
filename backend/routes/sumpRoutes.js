import express from 'express';
import Sump from '../models/Sump.js';
import Pump from '../models/Pump.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validateSumpCreation,
  validateSumpUpdate,
  handleValidationErrors
} from '../middleware/validation.js';

const router = express.Router();

// ============ GET ALL SUMPS (FOR CURRENT USER) ============
// Retrieve all sumps created by the authenticated user
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const sumps = await Sump.find({ userId: req.user.userId, isActive: true })
      .populate('connectedPumps')
      .sort({ createdAt: -1 });

    // Enrich sump data with pump capacity calculations
    const enrichedSumps = await Promise.all(
      sumps.map(async (sump) => {
        // Only running pumps contribute to total pumping capacity
        const activePumps = sump.connectedPumps.filter(p => p.status === 'RUNNING' || !p.status);
        const totalPumpingCapacity = activePumps.reduce(
          (total, pump) => total + (pump.currentDischarge || pump.currentCapacity || 0),
          0
        );

        const floodAnalysis = sump.calculateTimeToFlood(totalPumpingCapacity);
        
        // Update sump status based on flood analysis
        sump.status = floodAnalysis.status;
        await sump.save();

        return {
          ...sump.toObject(),
          activePumps: activePumps.length,
          totalPumps: sump.connectedPumps.length,
          totalPumpingCapacity,
          floodAnalysis
        };
      })
    );

    res.status(200).json({
      count: enrichedSumps.length,
      sumps: enrichedSumps
    });
  })
);

// ============ CREATE SUMP ============
// Create a new sump with dimensions and water level
router.post(
  '/',
  verifyToken,
  validateSumpCreation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, length, width, depth, currentWaterHeight, inflowRate, location } =
      req.body;

    // Validate water height doesn't exceed depth
    if (currentWaterHeight > depth) {
      return res.status(400).json({
        error: 'Current water height cannot exceed sump depth'
      });
    }

    const sump = new Sump({
      userId: req.user.userId,
      name,
      length,
      width,
      depth,
      currentWaterHeight,
      inflowRate,
      location
    });

    await sump.save();

    res.status(201).json({
      message: 'Sump created successfully',
      sump: sump.toObject()
    });
  })
);

// ============ GET SINGLE SUMP ============
// Retrieve specific sump with flood analysis
router.get(
  '/:sumpId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const sump = await Sump.findOne({
      _id: req.params.sumpId,
      userId: req.user.userId
    }).populate('connectedPumps');

    if (!sump) {
      return res.status(404).json({ error: 'Sump not found' });
    }

    // Only running pumps contribute to total pumping capacity
    const activePumps = sump.connectedPumps.filter(p => p.status === 'RUNNING' || !p.status);
    const totalPumpingCapacity = activePumps.reduce(
      (total, pump) => total + (pump.currentDischarge || pump.currentCapacity || 0),
      0
    );

    const floodAnalysis = sump.calculateTimeToFlood(totalPumpingCapacity);

    res.status(200).json({
      sump: {
        ...sump.toObject(),
        activePumps: activePumps.length,
        totalPumps: sump.connectedPumps.length,
        totalPumpingCapacity,
        floodAnalysis
      }
    });
  })
);

// ============ UPDATE SUMP ============
// Update sump details including dimensions and water levels
router.put(
  '/:sumpId',
  verifyToken,
  validateSumpUpdate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, length, width, depth, currentWaterHeight, inflowRate, notes } = req.body;

    const sump = await Sump.findOne({
      _id: req.params.sumpId,
      userId: req.user.userId
    });

    if (!sump) {
      return res.status(404).json({ error: 'Sump not found' });
    }

    // Update dimensions if provided
    if (name !== undefined) sump.name = name;
    if (length !== undefined) sump.length = length;
    if (width !== undefined) sump.width = width;
    if (depth !== undefined) sump.depth = depth;

    // Recalculate max volume if dimensions changed
    if (length !== undefined || width !== undefined || depth !== undefined) {
      sump.maxVolume = sump.length * sump.width * sump.depth;
    }

    // Validate water height
    if (currentWaterHeight !== undefined && currentWaterHeight > sump.depth) {
      return res.status(400).json({
        error: 'Water height cannot exceed sump depth'
      });
    }

    // Update water level fields
    if (currentWaterHeight !== undefined) {
      sump.currentWaterHeight = currentWaterHeight;
      sump.currentVolume = sump.length * sump.width * currentWaterHeight;
    }
    if (inflowRate !== undefined) sump.inflowRate = inflowRate;
    if (notes !== undefined) sump.notes = notes;

    await sump.save();

    // Get updated flood analysis
    const pumps = await Pump.find({ sumpId: sump._id });
    const totalCapacity = pumps.reduce((total, p) => total + p.currentCapacity, 0);
    const floodAnalysis = sump.calculateTimeToFlood(totalCapacity);

    res.status(200).json({
      message: 'Sump updated successfully',
      sump: {
        ...sump.toObject(),
        floodAnalysis
      }
    });
  })
);

// ============ DELETE SUMP ============
// Soft delete a sump (mark as inactive)
router.delete(
  '/:sumpId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const sump = await Sump.findOne({
      _id: req.params.sumpId,
      userId: req.user.userId
    });

    if (!sump) {
      return res.status(404).json({ error: 'Sump not found' });
    }

    sump.isActive = false;
    await sump.save();

    res.status(200).json({ message: 'Sump deleted successfully' });
  })
);

// ============ GET SUMP ANALYSIS ============
// Get detailed flood prediction and pump analysis for a sump
router.get(
  '/:sumpId/analysis',
  verifyToken,
  asyncHandler(async (req, res) => {
    const sump = await Sump.findOne({
      _id: req.params.sumpId,
      userId: req.user.userId
    }).populate('connectedPumps');

    if (!sump) {
      return res.status(404).json({ error: 'Sump not found' });
    }

    // Calculate total pumping capacity
    const totalPumpingCapacity = sump.connectedPumps.reduce(
      (total, pump) => total + pump.currentCapacity,
      0
    );

    // Get flood analysis
    const floodAnalysis = sump.calculateTimeToFlood(totalPumpingCapacity);

    // Get individual pump health status
    const pumpStatus = sump.connectedPumps.map((pump) => pump.getHealthStatus());

    // Check for siltation issues
    const siltationIssues = sump.connectedPumps.filter((p) => p.siltationSuspected);

    res.status(200).json({
      sumpId: sump._id,
      sumpName: sump.name,
      dimensions: {
        length: sump.length,
        width: sump.width,
        depth: sump.depth,
        maxVolume: sump.maxVolume
      },
      waterStatus: {
        currentHeight: sump.currentWaterHeight,
        currentVolume: sump.currentVolume,
        remainingCapacity: sump.remainingCapacity,
        capacityPercent: sump.capacityPercent
      },
      inflowOutflow: {
        inflowRate: sump.inflowRate,
        totalPumpingCapacity,
        netInflow: floodAnalysis.netInflow
      },
      floodAnalysis,
      pumpStatus,
      siltationAlert: siltationIssues.length > 0 ? {
        detected: true,
        affectedPumps: siltationIssues.map((p) => p.pumpId)
      } : { detected: false }
    });
  })
);

export default router;
