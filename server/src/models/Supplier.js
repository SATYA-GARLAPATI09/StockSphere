const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Supplier name cannot exceed 120 characters']
    },
    code: {
      type: String,
      required: [true, 'Supplier code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Supplier code cannot exceed 20 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    leadTimeDays: {
      type: Number,
      required: [true, 'Lead time in days is required'],
      min: [1, 'Lead time must be at least 1 day'],
      default: 5
    },
    minimumOrderQuantity: {
      type: Number,
      min: [1, 'Minimum order quantity must be at least 1'],
      default: 1
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true
  }
);

supplierSchema.index({ status: 1, leadTimeDays: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;
