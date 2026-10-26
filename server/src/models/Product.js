const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'SKU cannot exceed 30 characters']
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required']
    },
    primarySupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Primary supplier reference is required']
    },
    defaultWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Default warehouse reference is required']
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    quantityOnHand: {
      type: Number,
      required: [true, 'Quantity on hand is required'],
      min: [0, 'Quantity on hand cannot be negative'],
      default: 0
    },
    reorderThreshold: {
      type: Number,
      required: [true, 'Reorder threshold is required'],
      min: [0, 'Reorder threshold cannot be negative'],
      default: 10
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals for computed stock statuses
productSchema.virtual('isLowStock').get(function () {
  return this.quantityOnHand <= this.reorderThreshold && this.quantityOnHand > 0;
});

productSchema.virtual('isOutOfStock').get(function () {
  return this.quantityOnHand === 0;
});

productSchema.virtual('totalValue').get(function () {
  return (this.unitCost * this.quantityOnHand);
});

// Indexes for high performance querying
productSchema.index({ category: 1, isArchived: 1 });
productSchema.index({ primarySupplier: 1 });
productSchema.index({ defaultWarehouse: 1 });
productSchema.index({ quantityOnHand: 1, reorderThreshold: 1 });
productSchema.index({ name: 'text', sku: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
