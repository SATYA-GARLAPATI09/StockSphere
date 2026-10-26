const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    movementType: {
      type: String,
      enum: {
        values: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER'],
        message: 'Invalid movement type'
      },
      required: [true, 'Movement type is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity moved is required'],
      min: [1, 'Quantity moved must be at least 1 unit']
    },
    previousQuantity: {
      type: Number,
      required: [true, 'Previous quantity is required'],
      min: [0, 'Previous quantity cannot be negative']
    },
    newQuantity: {
      type: Number,
      required: [true, 'New quantity is required'],
      min: [0, 'New quantity cannot be negative']
    },
    reason: {
      type: String,
      required: [true, 'Reason for stock movement is required'],
      trim: true
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ product: 1, timestamp: -1 });
stockMovementSchema.index({ warehouse: 1, timestamp: -1 });
stockMovementSchema.index({ movementType: 1, timestamp: -1 });
stockMovementSchema.index({ timestamp: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
module.exports = StockMovement;
