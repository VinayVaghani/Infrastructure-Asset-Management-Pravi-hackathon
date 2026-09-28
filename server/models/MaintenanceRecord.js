const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema(
  {
    maintenanceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
    },
    type: {
      type: String,
      enum: ['ROUTINE', 'PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'],
      default: 'ROUTINE',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contractor',
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SCHEDULED'],
      default: 'PLANNED',
      index: true,
    },
    documents: {
      type: [String],
      default: [],
    },
    partsReplaced: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Synchronize cost with actualCost or estimatedCost
maintenanceRecordSchema.pre('save', function (next) {
  if (this.actualCost > 0) {
    this.cost = this.actualCost;
  } else if (this.cost > 0 && !this.actualCost) {
    this.actualCost = this.cost;
  }
  next();
});

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
