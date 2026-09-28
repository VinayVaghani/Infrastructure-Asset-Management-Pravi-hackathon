const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema(
  {
    recordId: {
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
      default: null,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
      index: true,
    },
    maintenanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceRecord',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'ACQUISITION',
        'CONSTRUCTION',
        'MAINTENANCE',
        'REPAIR',
        'OPERATION',
        'DISPOSAL',
        'CAPEX',
        'OPEX',
        'DEPRECIATION',
        'GRANT',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: 'MAINTENANCE',
    },
    amount: {
      type: Number,
      required: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    fiscalYear: {
      type: String,
      default: '2025-2026',
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED'],
      default: 'APPROVED',
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.date = ret.date || ret.transactionDate;
        ret.transactionDate = ret.transactionDate || ret.date;
        ret.referenceNumber = ret.referenceNumber || ret.invoiceNumber;
        ret.invoiceNumber = ret.invoiceNumber || ret.referenceNumber;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

financialRecordSchema.pre('save', function (next) {
  if (this.date && !this.transactionDate) this.transactionDate = this.date;
  if (this.transactionDate && !this.date) this.date = this.transactionDate;

  if (this.referenceNumber && !this.invoiceNumber) this.invoiceNumber = this.referenceNumber;
  if (this.invoiceNumber && !this.referenceNumber) this.referenceNumber = this.invoiceNumber;

  next();
});

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);
