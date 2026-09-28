const mongoose = require('mongoose');
const { WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } = require('../utils/constants');

const workOrderSchema = new mongoose.Schema(
  {
    workOrderId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    orderNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
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
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
      index: true,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contractor',
      default: null,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(WORK_ORDER_PRIORITY),
      default: WORK_ORDER_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WORK_ORDER_STATUS),
      default: WORK_ORDER_STATUS.OPEN,
      index: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    targetCompletionDate: {
      type: Date,
      default: null,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionNotes: {
      type: String,
      default: '',
    },
    evidencePhotos: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
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
  }
);

// Synchronize workOrderId <-> orderNumber and dueDate <-> targetCompletionDate
workOrderSchema.pre('save', function (next) {
  if (this.workOrderId && !this.orderNumber) {
    this.orderNumber = this.workOrderId;
  } else if (this.orderNumber && !this.workOrderId) {
    this.workOrderId = this.orderNumber;
  }

  if (this.dueDate && !this.targetCompletionDate) {
    this.targetCompletionDate = this.dueDate;
  } else if (this.targetCompletionDate && !this.dueDate) {
    this.dueDate = this.targetCompletionDate;
  }

  if (this.completionDate && !this.completedAt) {
    this.completedAt = this.completionDate;
  } else if (this.completedAt && !this.completionDate) {
    this.completionDate = this.completedAt;
  }

  next();
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
