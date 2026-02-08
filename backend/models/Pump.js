import mongoose from 'mongoose';

// Pump Schema for water drainage systems
const pumpSchema = new mongoose.Schema(
  {
    // Identification
    pumpId: {
      type: String,
      required: [true, 'Pump ID is required'],
      unique: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sump',
      required: true
    },

    // Rated capacity (m³/hr) - Original design capacity
    ratedDischarge: {
      type: Number,
      required: [true, 'Rated discharge is required'],
      min: 0
    },
    // Current capacity (m³/hr) - Actual current output
    currentDischarge: {
      type: Number,
      required: [true, 'Current discharge is required'],
      min: 0
    },

    // Legacy fields (for backward compatibility)
    originalCapacity: {
      type: Number,
      min: 0
    },
    currentCapacity: {
      type: Number,
      min: 0
    },

    // Motor specifications
    motor: {
      powerKw: {
        type: Number,
        default: 0,
        min: 0
      },
      torqueNm: {
        type: Number,
        default: 0,
        min: 0
      },
      currentTorqueNm: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    // Operating status
    status: {
      type: String,
      enum: ['RUNNING', 'STOPPED', 'FAULT'],
      default: 'STOPPED'
    },

    // Operating conditions
    operatingHours: {
      type: Number,
      default: 0,
      min: 0
    },

    // Health indicators
    healthIndicators: {
      torqueTrend: {
        type: String,
        enum: ['NORMAL', 'RISING'],
        default: 'NORMAL'
      },
      dischargeTrend: {
        type: String,
        enum: ['NORMAL', 'FALLING'],
        default: 'NORMAL'
      },
      siltationFlag: {
        type: Boolean,
        default: false
      }
    },

    // Legacy trend fields (for backward compatibility)
    motorTorqueTrend: {
      type: String,
      enum: ['increasing', 'stable', 'decreasing'],
      default: 'stable'
    },
    dischargeTrend: {
      type: String,
      enum: ['increasing', 'stable', 'decreasing'],
      default: 'stable'
    },

    // Health status
    health: {
      type: String,
      enum: ['green', 'yellow', 'red'],
      default: 'green'
    },

    // Siltation detection
    siltationSuspected: {
      type: Boolean,
      default: false
    },

    // Maintenance tracking
    maintenanceRequired: {
      type: Boolean,
      default: false
    },
    maintenanceNotes: String,
    lastMaintenanceDate: Date,

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
pumpSchema.index({ userId: 1 });
pumpSchema.index({ sumpId: 1 });
pumpSchema.index({ health: 1 });
pumpSchema.index({ status: 1 });

// ============ VIRTUALS ============
// Calculate capacity percentage (use new fields with fallback to legacy)
pumpSchema.virtual('capacityPercent').get(function () {
  const rated = this.ratedDischarge || this.originalCapacity || 1;
  const current = this.currentDischarge || this.currentCapacity || 0;
  return Math.round((current / rated) * 100);
});

// Get effective discharge rate for calculations
pumpSchema.virtual('effectiveDischarge').get(function () {
  // Only running pumps contribute to discharge
  if (this.status === 'RUNNING') {
    return this.currentDischarge || this.currentCapacity || 0;
  }
  return 0;
});

// ============ METHODS ============
// Determine pump health status based on capacity and siltation
pumpSchema.methods.updateHealth = function () {
  const rated = this.ratedDischarge || this.originalCapacity || 1;
  const current = this.currentDischarge || this.currentCapacity || 0;
  const capacityPercent = Math.round((current / rated) * 100);

  // Check siltation first
  this.checkSiltation();

  if (capacityPercent < 60 || this.siltationSuspected) {
    this.health = 'red';
    this.maintenanceRequired = true;
  } else if (capacityPercent < 70) {
    this.health = 'yellow';
  } else {
    this.health = 'green';
    this.maintenanceRequired = false;
  }

  return this.health;
};

// Check for siltation (motor torque rising while discharge falling)
pumpSchema.methods.checkSiltation = function () {
  // Use new healthIndicators if present, else fall back to legacy
  const torqueRising = this.healthIndicators?.torqueTrend === 'RISING' || 
                       this.motorTorqueTrend === 'increasing';
  const dischargeFalling = this.healthIndicators?.dischargeTrend === 'FALLING' || 
                           this.dischargeTrend === 'decreasing';

  if (torqueRising && dischargeFalling) {
    this.siltationSuspected = true;
    if (this.healthIndicators) {
      this.healthIndicators.siltationFlag = true;
    }
    return {
      siltationDetected: true,
      message: 'Siltation suspected - desilting required',
      recommendation: 'Deploy vacuum truck or manual cleaning'
    };
  }

  this.siltationSuspected = false;
  if (this.healthIndicators) {
    this.healthIndicators.siltationFlag = false;
  }
  return {
    siltationDetected: false,
    message: 'No siltation detected'
  };
};

// Get health status with detailed information
pumpSchema.methods.getHealthStatus = function () {
  const rated = this.ratedDischarge || this.originalCapacity || 1;
  const current = this.currentDischarge || this.currentCapacity || 0;
  const capacityPercent = Math.round((current / rated) * 100);
  const siltationStatus = this.checkSiltation();

  return {
    pumpId: this.pumpId,
    status: this.status,
    health: this.health,
    capacityPercent,
    ratedDischarge: rated,
    currentDischarge: current,
    capacityLoss: rated - current,
    motor: this.motor,
    healthIndicators: this.healthIndicators,
    siltationSuspected: this.siltationSuspected,
    maintenanceRequired: this.maintenanceRequired,
    message: this.getHealthMessage(capacityPercent),
    siltationDetails: siltationStatus,
    lastMaintenanceDate: this.lastMaintenanceDate
  };
};

// Generate human-readable health message
pumpSchema.methods.getHealthMessage = function (capacityPercent) {
  if (this.status === 'FAULT') {
    return 'FAULT: Pump malfunction - immediate attention required';
  }
  if (this.siltationSuspected) {
    return 'ALERT: Siltation detected - desilting required';
  }
  if (capacityPercent < 60) {
    return 'CRITICAL: Maintenance urgently required';
  } else if (capacityPercent < 70) {
    return 'WARNING: Performance degrading, schedule maintenance';
  } else {
    return 'HEALTHY: Pump operating normally';
  }
};

const Pump = mongoose.model('Pump', pumpSchema);

export default Pump;
