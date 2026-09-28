const mongoose = require('mongoose');
const { PROJECT_STATUS, PROJECT_MILESTONES } = require('../utils/constants');

const milestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: PROJECT_MILESTONES,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    projectCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        address: '',
        city: 'Surat',
        district: 'Surat',
        state: 'Gujarat',
        pincode: '',
      },
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    approvedBudget: {
      type: Number,
      default: 0,
    },
    budget: {
      type: Number,
      default: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contractor',
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    expectedCompletion: {
      type: Date,
      default: null,
    },
    estimatedEndDate: {
      type: Date,
      default: null,
    },
    actualCompletion: {
      type: Date,
      default: null,
    },
    actualEndDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PROPOSED,
      index: true,
    },
    milestones: {
      type: [milestoneSchema],
      default: () =>
        PROJECT_MILESTONES.map((m) => ({
          name: m,
          status: 'PENDING',
        })),
    },
    createdAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.projectId = ret.projectId || ret.projectCode;
        ret.projectCode = ret.projectCode || ret.projectId;
        ret.projectName = ret.projectName || ret.name;
        ret.name = ret.name || ret.projectName;
        ret.approvedBudget = ret.approvedBudget || ret.budget;
        ret.budget = ret.budget || ret.approvedBudget;
        ret.expectedCompletion = ret.expectedCompletion || ret.estimatedEndDate;
        ret.estimatedEndDate = ret.estimatedEndDate || ret.expectedCompletion;
        ret.actualCompletion = ret.actualCompletion || ret.actualEndDate;
        ret.actualEndDate = ret.actualEndDate || ret.actualCompletion;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

projectSchema.pre('save', function (next) {
  if (this.projectId && !this.projectCode) this.projectCode = this.projectId;
  if (this.projectCode && !this.projectId) this.projectId = this.projectCode;

  if (this.projectName && !this.name) this.name = this.projectName;
  if (this.name && !this.projectName) this.projectName = this.name;

  if (this.approvedBudget && !this.budget) this.budget = this.approvedBudget;
  if (this.budget && !this.approvedBudget) this.approvedBudget = this.budget;

  if (this.expectedCompletion && !this.estimatedEndDate) this.estimatedEndDate = this.expectedCompletion;
  if (this.estimatedEndDate && !this.expectedCompletion) this.expectedCompletion = this.estimatedEndDate;

  if (this.actualCompletion && !this.actualEndDate) this.actualEndDate = this.actualCompletion;
  if (this.actualEndDate && !this.actualCompletion) this.actualCompletion = this.actualEndDate;

  next();
});

module.exports = mongoose.model('Project', projectSchema);
