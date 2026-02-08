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
      lat: Number,
      lng: Number,
      severity: String, // mild, moderate, severe
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
haulRoadSchema.methods.detectSoftSpots = function (truckData) {
  // Soft spot detection criteria:
  // - Payload is approximately constant (loaded truck)
  // - Speed drops consistently over same road segment
  // - Strut pressure increases abnormally

  const speedPercent = (truckData.currentSpeed / truckData.normalSpeed) * 100;

  // Check if this qualifies as soft spot detection
  if (
    speedPercent <= 50 &&
    truckData.payloadConstant &&
    truckData.strutPressureAnomaly
  ) {
    const severity = this.calculateSeverity(speedPercent);
    
    // Add to soft spot locations
    const existingSpot = this.softSpotLocations.find(
      spot => Math.abs(spot.lat - truckData.gpsLocation.lat) < 0.0001 && 
              Math.abs(spot.lng - truckData.gpsLocation.lng) < 0.0001
    );

    if (!existingSpot) {
      this.softSpotLocations.push({
        lat: truckData.gpsLocation.lat,
        lng: truckData.gpsLocation.lng,
        severity,
        lastDetected: new Date()
      });
    } else {
      existingSpot.severity = severity;
      existingSpot.lastDetected = new Date();
    }

    this.softSpotDetected = true;
    this.updateConditionStatus();

    return {
      softSpotDetected: true,
      severity,
      location: {
        lat: truckData.gpsLocation.lat,
        lng: truckData.gpsLocation.lng
      },
      message: 'Soft spot detected - road surface compromise suspected',
      recommendation: 'Inspect drainage and schedule maintenance'
    };
  }

  return {
    softSpotDetected: false,
    message: 'No soft spot detected'
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

// Calculate soft spot severity
haulRoadSchema.methods.calculateSeverity = function (speedPercent) {
  if (speedPercent <= 30) return 'severe';
  if (speedPercent <= 40) return 'moderate';
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
