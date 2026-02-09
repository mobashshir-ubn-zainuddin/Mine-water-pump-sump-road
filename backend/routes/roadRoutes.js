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

// ============ GET ALL ROAD WARNINGS ============
// Dashboard endpoint - Get soft spot warnings for all roads
// NOTE: This must be BEFORE /:roadId routes to avoid matching "warnings" as roadId
router.get(
  '/warnings/all',
  verifyToken,
  asyncHandler(async (req, res) => {
    const roads = await HaulRoad.find({ 
      userId: req.user.userId, 
      isActive: true 
    });

    const warnings = [];

    for (const road of roads) {
      // Get aggregated soft spots from telemetry
      const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id);
      
      // Filter by severity and HIGH confidence (2+ trucks at same location)
      const criticalSpots = aggregatedSpots.filter(s => s.severity === 'CRITICAL' && s.confidence === 'HIGH');
      const confirmedSoftSpots = aggregatedSpots.filter(s => s.severity === 'SOFT' && s.confidence === 'HIGH');

      // Only show warnings when spots are confirmed by 2+ trucks (HIGH confidence)
      if (criticalSpots.length > 0 || confirmedSoftSpots.length > 0) {
        warnings.push({
          roadId: road._id,
          roadName: road.name,
          roadIdentifier: road.roadId,
          priority: road.priority,
          condition: road.condition,
          warningLevel: criticalSpots.length > 0 ? 'critical' : 'warning',
          softSpotCount: criticalSpots.length + confirmedSoftSpots.length,
          criticalCount: criticalSpots.length,
          softCount: confirmedSoftSpots.length,
          topLocations: [...criticalSpots, ...confirmedSoftSpots].slice(0, 5).map(spot => ({
            x: spot.location?.x_m,
            y: spot.location?.y_m,
            severity: spot.severity,
            confidence: spot.confidence,
            detectionCount: spot.detectionCount || 1,
            detectedByTrucks: spot.detectedByTrucks || []
          })),
          message: criticalSpots.length > 0 
            ? `CRITICAL: ${criticalSpots.length} critical spot(s) at ${road.name || road.roadId} - immediate repair required`
            : `SOFT SPOTS: ${confirmedSoftSpots.length} confirmed spot(s) at ${road.name || road.roadId} - schedule maintenance`,
          recommendation: criticalSpots.length > 0
            ? 'Restrict heavy traffic. Deploy maintenance crew immediately.'
            : 'Monitor closely. Plan maintenance before conditions worsen.'
        });
      }
    }

    res.status(200).json({
      totalRoads: roads.length,
      roadsWithWarnings: warnings.length,
      warnings: warnings.sort((a, b) => {
        // Sort by severity (critical first) then by count
        if (a.warningLevel !== b.warningLevel) {
          return a.warningLevel === 'critical' ? -1 : 1;
        }
        return b.criticalCount - a.criticalCount;
      })
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
    const { name, geometry, currentCrossFall, waterLevel, notes, requiredCrossFall, priority, linkedSumpId } = req.body;

    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Update fields
    if (name !== undefined) road.name = name;
    if (geometry !== undefined) {
      if (geometry.lengthM !== undefined) road.geometry.lengthM = geometry.lengthM;
      if (geometry.designCrossFallPercent !== undefined) road.geometry.designCrossFallPercent = geometry.designCrossFallPercent;
    }
    if (currentCrossFall !== undefined) road.currentCrossFall = currentCrossFall;
    if (requiredCrossFall !== undefined) road.requiredCrossFall = requiredCrossFall;
    if (waterLevel !== undefined) road.waterLevel = waterLevel;
    if (notes !== undefined) road.notes = notes;
    if (priority !== undefined) road.priority = priority;
    if (linkedSumpId !== undefined) road.linkedSumpId = linkedSumpId || null;

    road.condition.lastUpdated = new Date();

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
// Uses LOCAL positioning system (coordinates relative to mine origin)
// User enters data when slowdown is observed on a haul road
router.post(
  '/:roadId/telemetry',
  verifyToken,
  asyncHandler(async (req, res) => {
    const {
      truckId,
      payloadTonnes,
      averageSpeed,
      currentSpeed,
      x_m,
      y_m
    } = req.body;

    // Verify road exists
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Validate required fields
    if (!truckId || payloadTonnes === undefined || averageSpeed === undefined || 
        currentSpeed === undefined || x_m === undefined || y_m === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: truckId, payloadTonnes, averageSpeed, currentSpeed, x_m, y_m' 
      });
    }

    // Create telemetry record
    const telemetry = new TruckTelemetry({
      truckId,
      userId: req.user.userId,
      roadId: road._id,
      payloadTonnes,
      averageSpeed,
      currentSpeed,
      location: { x_m, y_m }
    });

    await telemetry.save();

    // Get aggregated soft spots to check for multi-truck confirmation
    const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id, 5);
    
    // Find if this location has high confidence (2+ trucks)
    const matchingSpot = aggregatedSpots.find(spot => 
      Math.abs(spot.location.x_m - x_m) <= 5 && 
      Math.abs(spot.location.y_m - y_m) <= 5
    );

    // Determine final result
    let result = {
      telemetryId: telemetry._id,
      speedDropPercent: telemetry.speedDropPercent,
      severity: telemetry.slowdownSeverity,
      message: 'No issue detected',
      softSpotDetected: false,
      confidence: 'LOW'
    };

    // Check if this creates a HIGH confidence spot (2+ trucks at same location)
    const isHighConfidence = matchingSpot && matchingSpot.confidence === 'HIGH';
    // Check if ANY truck at this location (including current) reported CRITICAL
    const hasCriticalAtLocation = matchingSpot?.severities?.includes('CRITICAL') || telemetry.slowdownSeverity === 'CRITICAL';

    if (telemetry.slowdownSeverity === 'CRITICAL' || telemetry.slowdownSeverity === 'SOFT') {
      result.softSpotDetected = true;
      road.softSpotDetected = true;
      
      if (isHighConfidence) {
        // 2+ trucks confirmed at this location
        if (hasCriticalAtLocation) {
          // At least one truck had ≥50% drop - mark as CRITICAL
          result.message = 'CRITICAL SPOT CONFIRMED: Multiple trucks confirmed, at least one with ≥50% speed drop';
          result.confidence = 'HIGH';
          result.trucksConfirmed = matchingSpot.detectedByTrucks.length;
          road.condition.status = 'CRITICAL';
        } else {
          // All trucks had 30-50% drop - mark as SOFT
          result.message = 'SOFT SPOT CONFIRMED: Multiple trucks reported slowdown at this location';
          result.confidence = 'HIGH';
          result.trucksConfirmed = matchingSpot.detectedByTrucks.length;
          if (road.condition.status !== 'CRITICAL') {
            road.condition.status = 'SOFT';
          }
        }
      } else {
        // Only 1 truck so far - LOW confidence, waiting for confirmation
        if (telemetry.slowdownSeverity === 'CRITICAL') {
          result.message = 'CRITICAL SLOWDOWN RECORDED: Speed drop ≥50% - awaiting 2nd truck confirmation';
        } else {
          result.message = 'SOFT SPOT DETECTED: Speed drop ≥30% recorded';
        }
        result.confidence = 'LOW';
        result.note = 'Will be confirmed when another truck reports slowdown at this location';
        
        // Don't change road status to CRITICAL with just 1 truck
        // Keep as SOFT (or GOOD) until confirmed
        if (road.condition.status === 'GOOD') {
          road.condition.status = 'SOFT';
        }
      }
    }

    // Store soft spot location if any slowdown detected (30%+)
    if (result.softSpotDetected) {
      // Check if soft spot already exists at this location
      const existingSpotIndex = road.softSpotLocations.findIndex(spot =>
        Math.abs((spot.x || spot.location?.x_m || 0) - x_m) <= 5 &&
        Math.abs((spot.y || spot.location?.y_m || 0) - y_m) <= 5
      );

      if (existingSpotIndex === -1) {
        // Add new soft spot - store as rounded integers to prevent decimal display issues
        road.softSpotLocations.push({
          x: Math.round(x_m),
          y: Math.round(y_m),
          severity: telemetry.slowdownSeverity,
          detectionCount: 1,
          confidence: result.confidence,
          firstDetected: new Date(),
          lastDetected: new Date(),
          detectedByTrucks: [truckId]
        });
      } else {
        // Update existing soft spot
        const existingSpot = road.softSpotLocations[existingSpotIndex];
        existingSpot.detectionCount = (existingSpot.detectionCount || 0) + 1;
        existingSpot.lastDetected = new Date();
        if (!existingSpot.detectedByTrucks) existingSpot.detectedByTrucks = [];
        if (!existingSpot.detectedByTrucks.includes(truckId)) {
          existingSpot.detectedByTrucks.push(truckId);
        }
        existingSpot.confidence = existingSpot.detectedByTrucks.length >= 2 ? 'HIGH' : 'LOW';
        // Upgrade severity to CRITICAL if any truck at this location had ≥50% drop
        if (telemetry.slowdownSeverity === 'CRITICAL') {
          existingSpot.severity = 'CRITICAL';
        }
      }

      road.condition.lastUpdated = new Date();
    }

    // Always save road changes if telemetry shows any slowdown
    await road.save();

    // Add aggregated spots info to response
    result.roadSoftSpots = aggregatedSpots.filter(s => s.confidence === 'HIGH');
    result.roadStatus = road.condition.status;

    res.status(201).json(result);
  })
);

// ============ BATCH SUBMIT TRUCK TELEMETRY ============
// Submit multiple telemetry readings at once (for offline sync)
router.post(
  '/:roadId/telemetry/batch',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'readings array is required' });
    }

    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    const results = [];
    let softSpotsDetected = 0;

    for (const reading of readings) {
      const telemetry = new TruckTelemetry({
        truckId: reading.truckId,
        userId: req.user.userId,
        roadId: road._id,
        payloadTonnes: reading.payloadTonnes,
        averageSpeed: reading.averageSpeed,
        currentSpeed: reading.currentSpeed,
        location: { 
          x_m: reading.x_m, 
          y_m: reading.y_m 
        },
        timestamp: reading.timestamp || new Date()
      });

      await telemetry.save();

      if (telemetry.slowdownSeverity !== 'NONE') {
        softSpotsDetected++;
        results.push({
          truckId: reading.truckId,
          severity: telemetry.slowdownSeverity,
          speedDropPercent: telemetry.speedDropPercent
        });
      }
    }

    // Get aggregated spots for final status update
    const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id, 5);
    const hasHighConfidence = aggregatedSpots.some(s => s.confidence === 'HIGH');
    const hasCritical = aggregatedSpots.some(s => s.severity === 'CRITICAL');

    if (hasCritical) {
      road.condition.status = 'CRITICAL';
      road.softSpotDetected = true;
    } else if (hasHighConfidence) {
      if (road.condition.status !== 'CRITICAL') {
        road.condition.status = 'SOFT';
      }
      road.softSpotDetected = true;
    }

    if (softSpotsDetected > 0) {
      road.condition.lastUpdated = new Date();
      await road.save();
    }

    res.status(201).json({
      message: `${readings.length} telemetry readings processed`,
      softSpotsDetected,
      roadStatus: road.condition.status,
      highConfidenceSpots: aggregatedSpots.filter(s => s.confidence === 'HIGH').length,
      results
    });
  })
);

// ============ GET ROAD SOFT SPOTS ============
// Retrieve all detected soft spots for a road with telemetry aggregation
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

    // Get aggregated soft spots from telemetry data
    const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id);
    
    // Get recent telemetry records for this road
    const recentTelemetry = await TruckTelemetry.find({ roadId: road._id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      roadId: road.roadId,
      roadName: road.name,
      softSpotDetected: road.softSpotDetected || aggregatedSpots.length > 0,
      softSpotCount: Math.max(road.softSpotLocations.length, aggregatedSpots.length),
      // Stored soft spots from road document
      storedLocations: road.softSpotLocations.sort(
        (a, b) => new Date(b.lastDetected) - new Date(a.lastDetected)
      ),
      // Aggregated from live telemetry data
      telemetryAggregated: aggregatedSpots,
      // Recent telemetry records for history view
      recentTelemetry,
      summary: {
        severeCount: aggregatedSpots.filter(s => s.severity === 'CRITICAL').length,
        softCount: aggregatedSpots.filter(s => s.severity === 'SOFT').length,
        highConfidenceCount: aggregatedSpots.filter(s => s.confidence === 'HIGH').length
      }
    });
  })
);

// ============ DELETE TELEMETRY RECORD ============
// Delete a single telemetry record
router.delete(
  '/telemetry/:telemetryId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const telemetry = await TruckTelemetry.findOne({
      _id: req.params.telemetryId,
      userId: req.user.userId
    });

    if (!telemetry) {
      return res.status(404).json({ error: 'Telemetry record not found' });
    }

    await TruckTelemetry.deleteOne({ _id: req.params.telemetryId });

    // Recalculate road status
    const road = await HaulRoad.findById(telemetry.roadId);
    if (road) {
      const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id, 5);
      const hasCritical = aggregatedSpots.some(s => s.severity === 'CRITICAL');
      const hasHighConfidenceSoft = aggregatedSpots.some(s => s.severity === 'SOFT' && s.confidence === 'HIGH');
      
      if (hasCritical) {
        road.condition.status = 'CRITICAL';
        road.softSpotDetected = true;
      } else if (hasHighConfidenceSoft) {
        road.condition.status = 'SOFT';
        road.softSpotDetected = true;
      } else {
        road.condition.status = 'GOOD';
        road.softSpotDetected = aggregatedSpots.length > 0;
      }
      
      road.condition.lastUpdated = new Date();
      await road.save();
    }

    res.status(200).json({ message: 'Telemetry record deleted successfully' });
  })
);

// ============ UPDATE TELEMETRY RECORD ============
// Edit an existing telemetry record
router.put(
  '/telemetry/:telemetryId',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { truckId, payloadTonnes, averageSpeed, currentSpeed, x_m, y_m } = req.body;
    
    const telemetry = await TruckTelemetry.findOne({
      _id: req.params.telemetryId,
      userId: req.user.userId
    });

    if (!telemetry) {
      return res.status(404).json({ error: 'Telemetry record not found' });
    }

    // Update fields if provided
    if (truckId) telemetry.truckId = truckId;
    if (payloadTonnes !== undefined) telemetry.payloadTonnes = payloadTonnes;
    if (averageSpeed !== undefined) telemetry.averageSpeed = averageSpeed;
    if (currentSpeed !== undefined) telemetry.currentSpeed = currentSpeed;
    if (x_m !== undefined) telemetry.location.x_m = x_m;
    if (y_m !== undefined) telemetry.location.y_m = y_m;

    // Recalculate speed drop and severity
    const speedDrop = ((telemetry.averageSpeed - telemetry.currentSpeed) / telemetry.averageSpeed) * 100;
    telemetry.speedDropPercent = Math.max(0, speedDrop);
    
    if (speedDrop >= 50) {
      telemetry.slowdownSeverity = 'CRITICAL';
    } else if (speedDrop >= 30) {
      telemetry.slowdownSeverity = 'SOFT';
    } else {
      telemetry.slowdownSeverity = 'NONE';
    }

    await telemetry.save();

    // Recalculate road status
    const road = await HaulRoad.findById(telemetry.roadId);
    if (road) {
      const aggregatedSpots = await TruckTelemetry.aggregateSoftSpots(road._id, 5);
      const hasCritical = aggregatedSpots.some(s => s.severity === 'CRITICAL');
      const hasHighConfidenceSoft = aggregatedSpots.some(s => s.severity === 'SOFT' && s.confidence === 'HIGH');
      
      // Update road soft spot locations
      road.softSpotLocations = aggregatedSpots.map(spot => ({
        x: spot.location.x_m,
        y: spot.location.y_m,
        severity: spot.severity,
        confidence: spot.confidence,
        detectionCount: spot.detectionCount,
        detectedByTrucks: spot.detectedByTrucks,
        lastDetected: spot.lastDetectedAt
      }));
      
      if (hasCritical) {
        road.condition.status = 'CRITICAL';
        road.softSpotDetected = true;
      } else if (hasHighConfidenceSoft) {
        road.condition.status = 'SOFT';
        road.softSpotDetected = true;
      } else if (aggregatedSpots.length > 0) {
        road.condition.status = 'SOFT';
        road.softSpotDetected = true;
      } else {
        road.condition.status = 'GOOD';
        road.softSpotDetected = false;
      }
      
      road.condition.lastUpdated = new Date();
      await road.save();
    }

    res.status(200).json({ 
      message: 'Telemetry record updated successfully',
      telemetry,
      newSeverity: telemetry.slowdownSeverity,
      speedDropPercent: telemetry.speedDropPercent
    });
  })
);

// ============ CLEAR ROAD SOFT SPOTS ============
// Mark road as repaired - clears all soft spots and resets status
router.post(
  '/:roadId/clear-softspots',
  verifyToken,
  asyncHandler(async (req, res) => {
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Delete all telemetry records for this road
    const deletedTelemetry = await TruckTelemetry.deleteMany({ 
      roadId: road._id,
      userId: req.user.userId 
    });

    // Clear soft spots from road document
    road.softSpotLocations = [];
    road.softSpotDetected = false;
    road.condition.status = 'GOOD';
    road.condition.lastUpdated = new Date();
    road.lastMaintenanceDate = new Date();
    
    await road.save();

    res.status(200).json({ 
      message: 'Road marked as repaired. All soft spots cleared.',
      deletedTelemetryCount: deletedTelemetry.deletedCount,
      roadStatus: road.condition.status
    });
  })
);

// ============ CLEAR SPECIFIC SOFT SPOT ============
// Mark a specific coordinate location as repaired
router.post(
  '/:roadId/clear-softspot',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { x, y } = req.body;
    const toleranceMeters = 5; // Same tolerance as aggregation
    
    const road = await HaulRoad.findOne({
      _id: req.params.roadId,
      userId: req.user.userId
    });

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    // Delete telemetry records at this specific location
    const deletedTelemetry = await TruckTelemetry.deleteMany({ 
      roadId: road._id,
      userId: req.user.userId,
      'location.x_m': { $gte: x - toleranceMeters, $lte: x + toleranceMeters },
      'location.y_m': { $gte: y - toleranceMeters, $lte: y + toleranceMeters }
    });

    // Remove this soft spot from road's softSpotLocations array
    road.softSpotLocations = road.softSpotLocations.filter(spot => {
      const spotX = spot.x || spot.location?.x_m || 0;
      const spotY = spot.y || spot.location?.y_m || 0;
      return Math.abs(spotX - x) > toleranceMeters || Math.abs(spotY - y) > toleranceMeters;
    });
    
    // Recalculate road status based on remaining spots
    if (road.softSpotLocations.length === 0) {
      road.softSpotDetected = false;
      road.condition.status = 'GOOD';
    } else {
      const hasCritical = road.softSpotLocations.some(s => s.severity === 'CRITICAL' && s.confidence === 'HIGH');
      const hasSoft = road.softSpotLocations.some(s => s.severity === 'SOFT' && s.confidence === 'HIGH');
      road.condition.status = hasCritical ? 'CRITICAL' : (hasSoft ? 'SOFT' : 'GOOD');
    }
    
    road.condition.lastUpdated = new Date();
    await road.save();

    res.status(200).json({ 
      message: `Soft spot at (${x}m, ${y}m) marked as repaired.`,
      deletedTelemetryCount: deletedTelemetry.deletedCount,
      remainingSoftSpots: road.softSpotLocations.length,
      roadStatus: road.condition.status
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
