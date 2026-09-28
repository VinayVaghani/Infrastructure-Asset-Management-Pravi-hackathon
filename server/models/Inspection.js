const mongoose = require('mongoose');
const { ASSET_CONDITION } = require('../utils/constants');

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    passed: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const inspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: {
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
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    conductedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    // Sub-Condition Assessments for Scoring
    structuralCondition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    surfaceCondition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    safetyCondition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    operationalCondition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    overallCondition: {
      type: String,
      enum: Object.values(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 80,
    },
    conditionScores: {
      structural: { type: Number, default: 80 },
      surface: { type: Number, default: 80 },
      safety: { type: Number, default: 80 },
      operational: { type: Number, default: 80 },
      ageRisk: { type: Number, default: 85 },
      finalScore: { type: Number, default: 80 },
    },
    observations: {
      type: String,
      default: '',
    },
    defects: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    recommendations: {
      type: String,
      default: '',
    },
    photos: {
      type: [String],
      default: [],
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    remarks: {
      type: String,
      default: '',
    },
    nextInspectionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Inspection', inspectionSchema);
