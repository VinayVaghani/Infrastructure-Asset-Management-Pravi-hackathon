const mongoose = require('mongoose');
const { ASSET_CATEGORIES, ASSET_TYPES, ASSET_STATUS, ASSET_CONDITION } = require('../utils/constants');

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: [true, 'Asset unique code (e.g., BR-GJ-SRT-000124) is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(ASSET_CATEGORIES),
      required: [true, 'Asset category is required'],
      index: true,
    },
    assetType: {
      type: String,
      enum: ASSET_TYPES,
      required: [true, 'Asset type is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Assigning department is required'],
      index: true,
    },
    custodian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    location: {
      type: locationSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ASSET_STATUS),
      default: ASSET_STATUS.OPERATIONAL,
      index: true,
    },
    condition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
      index: true,
    },
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    lastInspectionDate: {
      type: Date,
      default: null,
    },
    nextInspectionDate: {
      type: Date,
      default: null,
    },
    installationDate: {
      type: Date,
      default: null,
    },
    commissioningDate: {
      type: Date,
      default: null,
    },
    expectedLifeYears: {
      type: Number,
      default: 25,
    },
    acquisitionCost: {
      type: Number,
      default: 0,
    },
    totalMaintenanceCost: {
      type: Number,
      default: 0,
    },
    totalLifecycleCost: {
      type: Number,
      default: 0,
    },
    parentAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    custodyHistory: [
      {
        fromDepartment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          default: null,
        },
        toDepartment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          required: true,
        },
        fromCustodian: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        toCustodian: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        transferDate: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          default: '',
        },
        supportingDocument: {
          type: String,
          default: '',
        },
        transferredBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
    dataQuality: {
      completenessScore: {
        type: Number,
        default: 85,
      },
      missingFields: {
        type: [String],
        default: [],
      },
      lastEvaluated: {
        type: Date,
        default: Date.now,
      },
    },
    duplicateFlags: [
      {
        potentialDuplicateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Asset',
        },
        matchScore: {
          type: Number,
          default: 0,
        },
        matchReasons: {
          type: [String],
          default: [],
        },
        status: {
          type: String,
          enum: ['DETECTED', 'DISMISSED', 'MERGED'],
          default: 'DETECTED',
        },
        flaggedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-compute totalLifecycleCost before saving if costs changed
assetSchema.pre('save', function (next) {
  this.totalLifecycleCost = (this.acquisitionCost || 0) + (this.totalMaintenanceCost || 0);
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
