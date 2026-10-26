const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Warehouse name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Warehouse code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Warehouse code cannot exceed 20 characters']
    },
    location: {
      type: String,
      required: [true, 'Warehouse location/address is required'],
      trim: true
    },
    managerName: {
      type: String,
      trim: true,
      default: ''
    },
    capacityUnits: {
      type: Number,
      default: 10000,
      min: [100, 'Capacity must be at least 100 units']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
module.exports = Warehouse;
