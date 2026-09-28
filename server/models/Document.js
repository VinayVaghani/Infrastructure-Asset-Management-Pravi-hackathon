const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      default: 'Other',
    },
    documentType: {
      type: String,
      trim: true,
      default: 'Other',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: '',
    },
    storageProvider: {
      type: String,
      enum: ['cloudinary', 'local', 'storage_abstraction'],
      default: 'storage_abstraction',
    },
    fileType: {
      type: String,
      default: 'application/pdf',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    version: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      default: '',
    },
    // Associations
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
    inspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      default: null,
      index: true,
    },
    maintenance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceRecord',
      default: null,
      index: true,
    },
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.name = ret.name || ret.title;
        ret.title = ret.title || ret.name;
        ret.type = ret.type || ret.documentType;
        ret.documentType = ret.documentType || ret.type;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

documentSchema.pre('save', function (next) {
  if (this.name && !this.title) this.title = this.name;
  if (this.title && !this.name) this.name = this.title;

  if (this.type && !this.documentType) this.documentType = this.type;
  if (this.documentType && !this.type) this.type = this.documentType;

  if (!this.documentId) {
    const rnd = Math.floor(1000 + Math.random() * 9000);
    this.documentId = `DOC-${new Date().getFullYear()}-${rnd}`;
  }

  next();
});

module.exports = mongoose.model('Document', documentSchema);
