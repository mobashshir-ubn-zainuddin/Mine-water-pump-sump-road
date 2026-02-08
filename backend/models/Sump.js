import mongoose from 'mongoose';

// Sump (water collection pit) Schema
const sumpSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Sump name is required'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Dimensions (in meters)
    length: {
      type: Number,
      required: [true, 'Length is required'],
      min: 0.1
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
      min: 0.1
    },
    depth: {
      type: Number,
      required: [true, 'Depth is required'],
      min: 0.1
    },

    // Water Level (in meters from bottom)
    currentWaterHeight: {
      type: Number,
      required: [true, 'Current water height is required'],
      min: 0
    },

    // Inflow Rate (m³/hr)
    inflowRate: {
      type: Number,
      required: [true, 'Inflow rate is required'],
      min: 0
    },

    // Location for weather integration
    location: {
      lat: {
        type: Number,
        required: false
      },
      lng: {
        type: Number,
        required: false
      }
    },

    // Pump References
    connectedPumps: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pump'
    }],

    // Status tracking
    status: {
      type: String,
      enum: ['safe', 'warning', 'critical'],
      default: 'safe'
    },

    // Alerts and notes
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
sumpSchema.index({ userId: 1 });
sumpSchema.index({ status: 1 });

// ============ VIRTUALS ============
// Calculate maximum volume (length × width × depth)
sumpSchema.virtual('maxVolume').get(function () {
  return this.length * this.width * this.depth;
});

// Calculate current water volume
sumpSchema.virtual('currentVolume').get(function () {
  return this.length * this.width * this.currentWaterHeight;
});

// Calculate remaining capacity
sumpSchema.virtual('remainingCapacity').get(function () {
  return this.maxVolume - this.currentVolume;
});

// Calculate percentage of capacity filled
sumpSchema.virtual('capacityPercent').get(function () {
  return Math.round((this.currentVolume / this.maxVolume) * 100);
});

// ============ METHODS ============
// Calculate time to flood based on connected pumps
sumpSchema.methods.calculateTimeToFlood = function (totalPumpingCapacity) {
  // Net inflow = inflow rate - total pumping rate (m³/hr)
  const netInflow = this.inflowRate - totalPumpingCapacity;

  // If pumps are keeping up, system is safe
  if (netInflow <= 0) {
    return {
      status: 'safe',
      timeToFlood: Infinity,
      message: 'Pumps are keeping up with inflow'
    };
  }

  // Time to flood = remaining capacity / net inflow (in hours)
  const timeToFloodHours = this.remainingCapacity / netInflow;

  // Determine status based on time (per mining standards)
  // > 24 hr = SAFE, 6-24 hr = WARNING, <= 6 hr = CRITICAL
  let status = 'critical';
  if (timeToFloodHours > 24) status = 'safe';
  else if (timeToFloodHours > 6) status = 'warning';

  return {
    status,
    timeToFlood: timeToFloodHours,
    timeToFloodHours: timeToFloodHours,
    timeToFloodMinutes: Math.round(timeToFloodHours * 60),
    netInflow,
    remainingVolume: this.remainingCapacity,
    message: this.getFloodMessage(timeToFloodHours)
  };
};

// Generate human-readable message for flood status
sumpSchema.methods.getFloodMessage = function (timeToFloodHours) {
  if (timeToFloodHours > 24) {
    return 'Safe - More than 24 hours buffer';
  } else if (timeToFloodHours > 6) {
    return `Warning - ${Math.round(timeToFloodHours)} hours until critical`;
  } else {
    return `Critical - ${timeToFloodHours.toFixed(1)} hours until flood`;
  }
};

// Update sump status based on capacity
sumpSchema.methods.updateStatus = function (totalPumpingCapacity = 0) {
  const floodAnalysis = this.calculateTimeToFlood(totalPumpingCapacity);
  this.status = floodAnalysis.status;
  return floodAnalysis;
};

const Sump = mongoose.model('Sump', sumpSchema);

export default Sump;
