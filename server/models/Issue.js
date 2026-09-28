const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    issueCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    issueType: {
      type: String,
      enum: ['STRUCTURAL', 'SURFACE', 'SAFETY', 'OPERATIONAL', 'MECHANICAL', 'ELECTRICAL', 'GENERAL'],
      default: 'STRUCTURAL',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['REPORTED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'OPEN', 'CLOSED'],
      default: 'REPORTED',
      index: true,
    },
    resolution: {
      type: String,
      default: '',
    },
    resolvedDate: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    locationDetails: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to synchronize issueCode with issueId
issueSchema.pre('save', function (next) {
  if (this.issueId && !this.issueCode) {
    this.issueCode = this.issueId;
  } else if (this.issueCode && !this.issueId) {
    this.issueId = this.issueCode;
  }
  next();
});

module.exports = mongoose.model('Issue', issueSchema);
