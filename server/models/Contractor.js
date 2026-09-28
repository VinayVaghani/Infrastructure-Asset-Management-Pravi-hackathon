const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    specializations: {
      type: [String],
      default: [],
    },
    licenseValidUntil: {
      type: Date,
      default: null,
    },
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.company = ret.company || ret.companyName;
        ret.companyName = ret.companyName || ret.company;
        ret.name = ret.name || ret.contactPerson;
        ret.contactPerson = ret.contactPerson || ret.name;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Synchronize company <-> companyName, name <-> contactPerson, status <-> isActive
contractorSchema.pre('save', function (next) {
  if (this.companyName && !this.company) this.company = this.companyName;
  if (this.company && !this.companyName) this.companyName = this.company;

  if (this.contactPerson && !this.name) this.name = this.contactPerson;
  if (this.name && !this.contactPerson) this.contactPerson = this.name;

  if (this.status === 'ACTIVE') this.isActive = true;
  else this.isActive = false;

  next();
});

module.exports = mongoose.model('Contractor', contractorSchema);
