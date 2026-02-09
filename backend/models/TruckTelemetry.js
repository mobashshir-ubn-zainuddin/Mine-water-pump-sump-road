import mongoose from 'mongoose';

// Truck Telemetry Schema for tracking truck movement and soft spot detection
// Uses LOCAL positioning system (coordinates relative to mine origin)
// User manually enters telemetry data when slowdown is observed
const truckTelemetrySchema = new mongoose.Schema(
  {
    // Truck Identification
    truckId: {
      type: String,
      required: [true, 'Truck ID is required'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HaulRoad',
      required: true
    },

    // Payload (tonnes)
    payloadTonnes: {
      type: Number,
      required: [true, 'Payload is required'],
      min: 0
    },

    // Speed metrics (km/h)
    averageSpeed: {
      type: Number,
      required: [true, 'Average speed is required'],
      min: 0
    },
    currentSpeed: {
      type: Number,
      required: [true, 'Current speed is required'],
      min: 0
    },

    // Speed drop calculation (system-calculated)
    speedDropPercent: {
      type: Number,
      default: 0
    },

    // Slowdown severity (system-calculated)
    slowdownSeverity: {
      type: String,
      enum: ['NONE', 'SOFT', 'CRITICAL'],
      default: 'NONE'
    },

    // LOCAL Position (relative to mine origin, not global GPS)
    // This uses a local coordinate system specific to the mine
    location: {
      x_m: {
        type: Number,
        required: [true, 'X coordinate is required'],
        default: 0
      },
      y_m: {
        type: Number,
        required: [true, 'Y coordinate is required'],
        default: 0
      }
    },

    // Telemetry timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      expires: 2592000 // 30 days TTL for old telemetry
    }
  },
  { timestamps: true }
);

// ============ INDEXES ============
// Index for fast lookups by truck and road
truckTelemetrySchema.index({ truckId: 1, roadId: 1 });
// Index for soft spot aggregation by location
truckTelemetrySchema.index({ roadId: 1, 'location.x_m': 1, 'location.y_m': 1 });
// Index for soft spot queries
truckTelemetrySchema.index({ roadId: 1, slowdownSeverity: 1 });
// TTL index for automatic deletion of old records
truckTelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// ============ PRE-SAVE MIDDLEWARE ============
// Calculate speed drop and severity before saving
truckTelemetrySchema.pre('save', function(next) {
  // Calculate speed drop percentage
  // Speed Drop (%) = ((average_speed − current_speed) / average_speed) × 100
  if (this.averageSpeed > 0) {
    this.speedDropPercent = ((this.averageSpeed - this.currentSpeed) / this.averageSpeed) * 100;
  } else {
    this.speedDropPercent = 0;
  }

  // Determine slowdown severity based on speed drop
  // CRITICAL: Speed drop ≥ 50%
  // SOFT: Speed drop ≥ 30% (but requires 2+ trucks for confirmation - handled at road level)
  // NONE: Speed drop < 30%
  
  if (this.speedDropPercent >= 50) {
    this.slowdownSeverity = 'CRITICAL';
  } else if (this.speedDropPercent >= 30) {
    this.slowdownSeverity = 'SOFT';  // Pending confirmation from multiple trucks
  } else {
    this.slowdownSeverity = 'NONE';
  }

  next();
});

// ============ STATIC METHODS ============
// Aggregate soft spots for a road from multiple trucks
// Returns locations where 2+ trucks have flagged slowdowns (high confidence)
truckTelemetrySchema.statics.aggregateSoftSpots = async function(roadId, toleranceMeters = 5) {
  // Grid size based on tolerance - spots within this radius are grouped
  const gridSize = toleranceMeters * 2;
  
  const results = await this.aggregate([
    { 
      $match: { 
        roadId: new mongoose.Types.ObjectId(roadId), 
        slowdownSeverity: { $in: ['SOFT', 'CRITICAL'] }
      } 
    },
    {
      $group: {
        _id: {
          // Grid-based grouping - round positions to nearest gridSize
          gridX: { $multiply: [{ $floor: { $divide: ['$location.x_m', gridSize] } }, gridSize] },
          gridY: { $multiply: [{ $floor: { $divide: ['$location.y_m', gridSize] } }, gridSize] }
        },
        count: { $sum: 1 },
        avgSpeedDrop: { $avg: '$speedDropPercent' },
        maxSpeedDrop: { $max: '$speedDropPercent' },
        truckIds: { $addToSet: '$truckId' },
        // Use $first to keep the first reported coordinate (not average which causes 100→99.7)
        firstX: { $first: '$location.x_m' },
        firstY: { $first: '$location.y_m' },
        firstDetected: { $min: '$timestamp' },
        lastDetected: { $max: '$timestamp' },
        severities: { $push: '$slowdownSeverity' }
      }
    },
    {
      $project: {
        _id: 0,
        gridX: '$_id.gridX',
        gridY: '$_id.gridY',
        // Use first reported coordinates rounded to integers for clean display
        location: { 
          x_m: { $round: ['$firstX', 0] }, 
          y_m: { $round: ['$firstY', 0] } 
        },
        detectionCount: '$count',
        uniqueTrucks: { $size: '$truckIds' },
        detectedByTrucks: '$truckIds',
        avgSpeedDrop: { $round: ['$avgSpeedDrop', 1] },
        maxSpeedDrop: { $round: ['$maxSpeedDrop', 1] },
        firstDetected: 1,
        lastDetected: 1,
        severities: 1
      }
    },
    { $sort: { uniqueTrucks: -1, detectionCount: -1 } }
  ]);

  // Calculate final severity and confidence based on aggregated data
  return results.map(spot => {
    // Severity: CRITICAL if ANY truck at this location reported ≥50% drop
    // This handles mixed severity case (one truck 35%, another 55% → CRITICAL)
    const hasCritical = spot.severities.includes('CRITICAL');
    const severity = hasCritical ? 'CRITICAL' : 'SOFT';
    
    // Confidence: HIGH only if 2+ unique trucks flagged the same location
    // Both SOFT and CRITICAL require 2+ trucks for HIGH confidence
    const confidence = spot.uniqueTrucks >= 2 ? 'HIGH' : 'LOW';
    
    return {
      location: spot.location,
      severity,
      detectedByTrucks: spot.detectedByTrucks,
      detectionCount: spot.detectionCount,
      confidence,
      avgSpeedDrop: spot.avgSpeedDrop,
      maxSpeedDrop: spot.maxSpeedDrop,
      firstDetectedAt: spot.firstDetected,
      lastDetectedAt: spot.lastDetected,
      status: 'OPEN'
    };
  });
};

const TruckTelemetry = mongoose.model('TruckTelemetry', truckTelemetrySchema);

export default TruckTelemetry;
