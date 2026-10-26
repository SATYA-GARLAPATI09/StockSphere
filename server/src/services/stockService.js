const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const graphSyncService = require('./graphSyncService');

class StockService {
  /**
   * Safe Atomic Stock-In Operation
   */
  async stockIn({ productId, warehouseId, quantity, userId, reason, referenceNumber }) {
    if (!quantity || quantity <= 0) {
      throw new Error('Stock-in quantity must be greater than zero');
    }

    const currentProduct = await Product.findOne({ _id: productId, isArchived: false });
    if (!currentProduct) {
      throw new Error('Product not found or is archived');
    }

    const previousQuantity = currentProduct.quantityOnHand;

    // Atomic update
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, isArchived: false },
      { $inc: { quantityOnHand: quantity } },
      { new: true }
    );

    // Record immutable audit movement
    const movement = await StockMovement.create({
      product: productId,
      warehouse: warehouseId || updatedProduct.defaultWarehouse,
      user: userId,
      movementType: 'STOCK_IN',
      quantity,
      previousQuantity,
      newQuantity: updatedProduct.quantityOnHand,
      reason: reason || 'Inventory replenishment',
      referenceNumber: referenceNumber || ''
    });

    // Synchronize stock in graph
    graphSyncService.updateProductStock(
      productId,
      updatedProduct.quantityOnHand,
      updatedProduct.reorderThreshold
    ).catch(err => console.warn('[StockService] Async graph sync note:', err.message));

    return { product: updatedProduct, movement };
  }

  /**
   * Safe Atomic Stock-Out Operation (Enforcing Non-Negative Inventory)
   */
  async stockOut({ productId, warehouseId, quantity, userId, reason, referenceNumber }) {
    if (!quantity || quantity <= 0) {
      throw new Error('Stock-out quantity must be greater than zero');
    }

    // Atomic conditional update: only decrement if quantityOnHand >= quantity
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        isArchived: false,
        quantityOnHand: { $gte: quantity }
      },
      {
        $inc: { quantityOnHand: -quantity }
      },
      { new: true }
    );

    if (!updatedProduct) {
      // Check current quantity to give a clear explanation
      const existing = await Product.findById(productId);
      if (!existing) throw new Error('Product not found');
      if (existing.isArchived) throw new Error('Product is archived and inactive');
      throw new Error(
        `Insufficient stock balance. Requested ${quantity} units, but only ${existing.quantityOnHand} units are available on hand.`
      );
    }

    const previousQuantity = updatedProduct.quantityOnHand + quantity;

    // Record immutable audit movement
    const movement = await StockMovement.create({
      product: productId,
      warehouse: warehouseId || updatedProduct.defaultWarehouse,
      user: userId,
      movementType: 'STOCK_OUT',
      quantity,
      previousQuantity,
      newQuantity: updatedProduct.quantityOnHand,
      reason: reason || 'Standard order fulfillment or dispatch',
      referenceNumber: referenceNumber || ''
    });

    // Synchronize stock in graph
    graphSyncService.updateProductStock(
      productId,
      updatedProduct.quantityOnHand,
      updatedProduct.reorderThreshold
    ).catch(err => console.warn('[StockService] Async graph sync note:', err.message));

    return { product: updatedProduct, movement };
  }

  /**
   * Safe Stock Adjustment (Cycle counts and audit corrections)
   */
  async stockAdjustment({ productId, warehouseId, targetQuantity, userId, reason }) {
    if (targetQuantity === undefined || targetQuantity < 0) {
      throw new Error('Target quantity must be zero or positive');
    }

    const currentProduct = await Product.findOne({ _id: productId, isArchived: false });
    if (!currentProduct) {
      throw new Error('Product not found or is archived');
    }

    const previousQuantity = currentProduct.quantityOnHand;
    const delta = Math.abs(targetQuantity - previousQuantity);

    if (delta === 0) {
      return { product: currentProduct, movement: null, message: 'Stock quantity unchanged' };
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, isArchived: false },
      { $set: { quantityOnHand: targetQuantity } },
      { new: true }
    );

    const movement = await StockMovement.create({
      product: productId,
      warehouse: warehouseId || updatedProduct.defaultWarehouse,
      user: userId,
      movementType: 'ADJUSTMENT',
      quantity: delta,
      previousQuantity,
      newQuantity: targetQuantity,
      reason: reason || 'Audit / physical cycle count discrepancy resolution'
    });

    graphSyncService.updateProductStock(
      productId,
      updatedProduct.quantityOnHand,
      updatedProduct.reorderThreshold
    ).catch(err => console.warn('[StockService] Async graph sync note:', err.message));

    return { product: updatedProduct, movement };
  }
}

module.exports = new StockService();
