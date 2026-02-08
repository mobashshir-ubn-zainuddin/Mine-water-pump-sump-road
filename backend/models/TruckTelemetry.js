import mongoose from 'mongoose';

// Truck Telemetry Schema for tracking truck movement and soft spot detection
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

    // Speed metrics (km/h)
    normalSpeed: {
      type: Number,
      required: true,
      min: 0
    },
    currentSpeed: {
      type: Number,
      required: true,
      min: 0
    },

    // Payload status
    payloadConstant: {
      type: Boolean,
      default: false
    },
    payloadWeight: {
      type: Number,
      min: 0
    },

    // Suspension anomalies
    strutPressureAnomaly: {
      type: Boolean,
      default: false
    },
    strutPressureLeft: Number,
    strutPressureRight: Number,

    // GPS Location
    gpsLocation: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
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
// TTL index for automatic deletion of old records
truckTelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const TruckTelemetry = mongoose.model('TruckTelemetry', truckTelemetrySchema);

export default TruckTelemetry;
