import mongoose from 'mongoose';

// Haul Road Schema for tracking road conditions and drainage
const haulRoadSchema = new mongoose.Schema(
  {
    // Road Identification
    roadId: {
      type: String,
      required: [true, 'Road ID is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Road name is required'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Geometry
    geometry: {
      lengthM: {
        type: Number,
        required: [true, 'Road length is required'],
        min: 0
      },
      designCrossFallPercent: {
        type: Number,
        required: [true, 'Design cross-fall is required'],
        min: 0,
        max: 15
      }
    },

    // Condition status
    condition: {
      status: {
        type: String,
        enum: ['GOOD', 'SOFT', 'CRITICAL'],
        default: 'GOOD'
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },

    // Linked sump for drainage
    linkedSumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sump'
    },

    // Priority level
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },

    // Legacy cross-fall measurements (for backward compatibility)
    requiredCrossFall: {
      type: Number,
      min: 0,
      max: 45
    },
    currentCrossFall: {
      type: Number,
      min: 0,
      max: 45
    },

    // Water level on road surface (in cm)
    waterLevel: {
      type: Number,
      default: 0,
      min: 0
    },

    // Height from bottom of pit (in meters)
    heightFromPitBottom: {
      type: Number,
      min: 0
    },

    // Road dimensions (legacy)
    roadWidth: {
      type: Number,
      min: 1
    },

    // Soft spot detection
    softSpotDetected: {
      type: Boolean,
      default: false
    },
    softSpotLocations: [{
      // Local position (relative to mine origin)
      x: Number,
      y: Number,
      // Legacy lat/lng support (optional)
      lat: Number,
      lng: Number,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'SOFT', 'CRITICAL', 'NONE'],
        default: 'SOFT'
      },
      detectionCount: {
        type: Number,
        default: 1
      },
      uniqueTrucks: {
        type: Number,
        default: 1
      },
      detectedByTrucks: [{
        type: String
      }],
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high', 'LOW', 'HIGH'],
        default: 'LOW'
      },
      avgSpeedDrop: Number,
      firstDetected: Date,
      lastDetected: Date
    }],

    // Drainage assessment
    drainageRisk: {
      type: String,
      enum: ['safe', 'moderate', 'severe'],
      default: 'safe'
    },

    // Maintenance status
    requiresRegrading: {
      type: Boolean,
      default: false
    },
    maintenanceScheduled: Date,
    lastMaintenanceDate: Date,

    notes: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============ INDEXES ============
haulRoadSchema.index({ userId: 1 });
haulRoadSchema.index({ drainageRisk: 1 });
haulRoadSchema.index({ softSpotDetected: 1 });

// ============ VIRTUALS ============
// Calculate cross-fall deficiency
haulRoadSchema.virtual('crossFallDeficiency').get(function () {
  return Math.max(0, this.requiredCrossFall - this.currentCrossFall);
});

// ============ METHODS ============
// Check drainage status
haulRoadSchema.methods.assessDrainage = function () {
  const deficiency = this.crossFallDeficiency;

  if (deficiency === 0) {
    this.drainageRisk = 'safe';
    this.requiresRegrading = false;
    return {
      risk: 'safe',
      message: 'Road drainage is adequate',
      action: 'None required'
    };
  } else if (deficiency <= 1) {
    this.drainageRisk = 'moderate';
    this.requiresRegrading = true;
    return {
      risk: 'moderate',
      message: `Water will pond - deficiency: ${deficiency.toFixed(1)}°`,
      action: 'Schedule regrading before next rainfall'
    };
  } else {
    this.drainageRisk = 'severe';
    this.requiresRegrading = true;
    return {
      risk: 'severe',
      message: `Significant drainage problem - deficiency: ${deficiency.toFixed(1)}°`,
      action: 'URGENT: Regrading required immediately'
    };
  }
};

// Detect soft spots from truck telemetry
// Uses LOCAL positioning system (coordinates relative to mine origin)
haulRoadSchema.methods.detectSoftSpots = function (truckData) {
  // Soft spot detection criteria:
  // - Speed drops consistently (>20%) while loaded
  // - OR Strut pressure increases abnormally
  // - OR Speed drops severely (>50%) regardless

  const speedDropPercent = truckData.normalSpeed > 0 
    ? ((truckData.normalSpeed - truckData.currentSpeed) / truckData.normalSpeed) * 100 
    : 0;

  const significantSpeedDrop = speedDropPercent >= 20;
  const severeSpeedDrop = speedDropPercent >= 50;
  const loadedTruck = truckData.payloadConstant && (truckData.payloadWeight > 0 || truckData.payloadConstant);

  // Check if this qualifies as soft spot detection
  if (severeSpeedDrop || (significantSpeedDrop && loadedTruck) || 
      (significantSpeedDrop && truckData.strutPressureAnomaly)) {
    
    const severity = this.calculateSeverity(speedDropPercent, truckData.strutPressureAnomaly);
    
    // Get position (prefer local coordinates, fall back to GPS)
    const position = truckData.localPosition || truckData.gpsLocation || { x: 0, y: 0 };
    const x = position.x !== undefined ? position.x : position.lat;
    const y = position.y !== undefined ? position.y : position.lng;
    
    // Find existing spot within 10 units (meters) radius
    const gridTolerance = 10;
    const existingSpot = this.softSpotLocations.find(
      spot => {
        const spotX = spot.x !== undefined ? spot.x : spot.lat;
        const spotY = spot.y !== undefined ? spot.y : spot.lng;
        return Math.abs(spotX - x) < gridTolerance && Math.abs(spotY - y) < gridTolerance;
      }
    );

    if (!existingSpot) {
      // New soft spot detected
      this.softSpotLocations.push({
        x: x,
        y: y,
        lat: x, // Legacy compatibility
        lng: y, // Legacy compatibility
        severity,
        detectionCount: 1,
        uniqueTrucks: 1,
        confidence: 'low',
        avgSpeedDrop: speedDropPercent,
        lastDetected: new Date()
      });
    } else {
      // Update existing spot with new detection
      existingSpot.detectionCount = (existingSpot.detectionCount || 1) + 1;
      existingSpot.avgSpeedDrop = existingSpot.avgSpeedDrop 
        ? (existingSpot.avgSpeedDrop + speedDropPercent) / 2 
        : speedDropPercent;
      existingSpot.lastDetected = new Date();
      
      // Upgrade severity if this detection is worse
      if (severity === 'severe' || 
          (severity === 'moderate' && existingSpot.severity === 'mild')) {
        existingSpot.severity = severity;
      }
      
      // Update confidence based on detection count
      if (existingSpot.detectionCount >= 5) {
        existingSpot.confidence = 'high';
      } else if (existingSpot.detectionCount >= 2) {
        existingSpot.confidence = 'medium';
      }
    }

    this.softSpotDetected = true;
    this.updateConditionStatus();

    return {
      softSpotDetected: true,
      severity,
      speedDropPercent: Math.round(speedDropPercent),
      location: { x, y },
      message: `Soft spot detected - ${severity} road surface compromise`,
      recommendation: severity === 'severe' 
        ? 'URGENT: Immediate inspection required. Restrict heavy traffic.'
        : 'Inspect drainage and schedule maintenance'
    };
  }

  return {
    softSpotDetected: false,
    speedDropPercent: Math.round(speedDropPercent),
    message: 'No soft spot detected - road condition normal'
  };
};

// Update condition status based on soft spots and drainage
haulRoadSchema.methods.updateConditionStatus = function () {
  const hasSevereSpots = this.softSpotLocations.some(s => s.severity === 'severe');
  const hasModerateSpots = this.softSpotLocations.some(s => s.severity === 'moderate');

  if (hasSevereSpots || this.drainageRisk === 'severe') {
    this.condition.status = 'CRITICAL';
  } else if (hasModerateSpots || this.softSpotDetected || this.drainageRisk === 'moderate') {
    this.condition.status = 'SOFT';
  } else {
    this.condition.status = 'GOOD';
  }
  this.condition.lastUpdated = new Date();
  
  return this.condition.status;
};

// Calculate soft spot severity based on speed drop and strut anomaly
haulRoadSchema.methods.calculateSeverity = function (speedDropPercent, strutAnomaly = false) {
  if (speedDropPercent >= 50 || (strutAnomaly && speedDropPercent >= 40)) return 'severe';
  if (speedDropPercent >= 35 || strutAnomaly) return 'moderate';
  return 'mild';
};

// Get comprehensive road status
haulRoadSchema.methods.getRoadStatus = function () {
  const drainageStatus = this.assessDrainage();
  this.updateConditionStatus();

  return {
    roadId: this.roadId,
    name: this.name,
    priority: this.priority,
    geometry: this.geometry,
    condition: this.condition,
    crossFallDeficiency: this.crossFallDeficiency,
    drainageStatus,
    softSpotDetected: this.softSpotDetected,
    softSpotCount: this.softSpotLocations.length,
    softSpotLocations: this.softSpotLocations,
    maintenanceRequired: this.requiresRegrading || this.softSpotDetected,
    linkedSumpId: this.linkedSumpId,
    overallRisk: this.calculateOverallRisk()
  };
};

// Calculate overall risk level for the road
haulRoadSchema.methods.calculateOverallRisk = function () {
  const risks = [];

  if (this.drainageRisk === 'severe') risks.push('drainage');
  if (this.softSpotDetected) risks.push('softspot');
  if (this.waterLevel > 10) risks.push('standing_water');

  if (risks.length === 0) return 'low';
  if (risks.length === 1) return 'medium';
  return 'high';
};

const HaulRoad = mongoose.model('HaulRoad', haulRoadSchema);

export default HaulRoad;
