import express from 'express';
import HaulRoad from '../models/HaulRoad.js';
import TruckTelemetry from '../models/TruckTelemetry.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validateHaulRoadCreation,
  handleValidationErrors
} from '../middleware/validation.js';

const router = express.Router();

// ============ GET ALL HAUL ROADS (FOR CURRENT USER) ============
// Retrieve all haul roads with status
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const roads = await HaulRoad.find({ userId: req.user.userId, isActive: true })
      .sort({ priority: -1, createdAt: -1 });

    // Enrich with current status
    const enrichedRoads = roads.map((road) => ({
      ...road.toObject(),
      roadStatus: road.getRoadStatus()
    }));

    res.status(200).json({
      count: enrichedRoads.length,
      roads: enrichedRoads
    });
  })
);

// ============ CREATE HAUL ROAD ============
// Add new haul road with drainage parameters
router.post(
  '/',
  verifyToken,
  validateHaulRoadCreation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { 
      roadId, 
      name,
      priority, 
      geometry,
      linkedSumpId,
      requiredCrossFall, 
      currentCrossFall, 
      heightFromPitBottom, 
      roadWidth, 
      waterLevel 
    } = req.body;

    // Check for duplicate road ID
    const existingRoad = await HaulRoad.findOne({ roadId });
    if (existingRoad) {
      return res.status(400).json({ error: 'Road ID already exists' });
    }

    const road = new HaulRoad({
      userId: req.user.userId,
      roadId,
      name: name || roadId,
      priority: priority || 'medium',
      geometry: geometry || {
        lengthM: 0,
        designCrossFallPercent: requiredCrossFall || 3
      },
      linkedSumpId,
      requiredCrossFall: requiredCrossFall || geometry?.designCrossFallPercent || 3,
      currentCrossFall: currentCrossFall || geometry?.designCrossFallPercent || 3,
      heightFromPitBottom: heightFromPitBottom || 0,
      roadWidth: roadWidth || 20,
      waterLevel: waterLevel || 0,
      condition: {
        status: 'GOOD',
        lastUpdated: new Date()
      }
    });

    // Assess drainage on creation
    road.assessDrainage();
    road.updateConditionStatus();

    await road.save();

    res.status(201).json({
      message: 'Haul road created successfully',
      road: {
        ...road.toObject(),
        roadStatus: road.getRoadStatus()
      }
    });
  })
);

// ============ GET SINGLE HAUL ROAD ============
// Retrieve specific road with full analysis
router.get(
  '/:roadId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Get soft spot telemetry data
    const softSpots = await TruckTelemetry.find({
      roadId: road._id
    }).limit(100);

    res.status(200).json({
      road: {
        ...road.toObject(),
        roadStatus: road.getRoadStatus(),
        recentTelemetry: softSpots
      }
    });
  })
);

// ============ UPDATE HAUL ROAD ============
// Update road parameters and water level
router.put(
  '/:roadId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { currentCrossFall, waterLevel, notes, requiredCrossFall } = req.body;

    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Update fields
    if (currentCrossFall !== undefined) road.currentCrossFall = currentCrossFall;
    if (requiredCrossFall !== undefined) road.requiredCrossFall = requiredCrossFall;
    if (waterLevel !== undefined) road.waterLevel = waterLevel;
    if (notes !== undefined) road.notes = notes;

    // Re-assess drainage
    road.assessDrainage();

    await road.save();

    res.status(200).json({
      message: 'Road updated successfully',
      road: {
        ...road.toObject(),
        roadStatus: road.getRoadStatus()
      }
    });
  })
);

// ============ DELETE HAUL ROAD ============
// Soft delete a haul road
router.delete(
  '/:roadId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    road.isActive = false;
    await road.save();

    res.status(200).json({ message: 'Road deleted successfully' });
  })
);

// ============ SUBMIT TRUCK TELEMETRY ============
// Receive telemetry data for soft spot detection
router.post(
  '/:roadId/telemetry',
  verifyToken,
  asyncHandler(async (req, res) => {
    const {
      truckId,
      normalSpeed,
      currentSpeed,
      payloadConstant,
      payloadWeight,
      strutPressureAnomaly,
      strutPressureLeft,
      strutPressureRight,
      gpsLocation
    } = req.body;

    // Verify road exists
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Create telemetry record
    const telemetry = new TruckTelemetry({
      truckId,
      userId: req.user.userId,
      roadId: road._id,
      normalSpeed,
      currentSpeed,
      payloadConstant,
      payloadWeight,
      strutPressureAnomaly,
      strutPressureLeft,
      strutPressureRight,
      gpsLocation
    });

    await telemetry.save();

    // Check for soft spots
    const truckData = {
      currentSpeed,
      normalSpeed,
      payloadConstant,
      strutPressureAnomaly,
      gpsLocation
    };

    const softSpotDetection = road.detectSoftSpots(truckData);

    if (softSpotDetection.softSpotDetected) {
      // Add to soft spot locations
      road.softSpotDetected = true;
      road.softSpotLocations.push({
        lat: softSpotDetection.location.lat,
        lng: softSpotDetection.location.lng,
        severity: softSpotDetection.severity,
        lastDetected: new Date()
      });
      await road.save();
    }

    res.status(201).json({
      message: 'Telemetry recorded',
      softSpotDetected: softSpotDetection.softSpotDetected,
      details: softSpotDetection
    });
  })
);

// ============ GET ROAD SOFT SPOTS ============
// Retrieve all detected soft spots for a road
router.get(
  '/:roadId/softspots',
  verifyToken,
  asyncHandler(async (req, res) => {
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    res.status(200).json({
      roadId: road.roadId,
      softSpotDetected: road.softSpotDetected,
      softSpotCount: road.softSpotLocations.length,
      locations: road.softSpotLocations.sort(
        (a, b) => b.lastDetected - a.lastDetected
      )
    });
  })
);

// ============ GET ROAD DRAINAGE STATUS ============
// Get comprehensive drainage assessment
router.get(
  '/:roadId/drainage-assessment',
  verifyToken,
  asyncHandler(async (req, res) => {
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    const drainageStatus = road.assessDrainage();

    res.status(200).json({
      roadId: road.roadId,
      crossFallAnalysis: {
        required: road.requiredCrossFall,
        current: road.currentCrossFall,
        deficiency: road.crossFallDeficiency
      },
      drainageStatus,
      waterLevel: road.waterLevel,
      priorityLevel: road.priority,
      maintenanceScheduled: road.maintenanceScheduled,
      lastMaintenance: road.lastMaintenanceDate
    });
  })
);

export default router;
