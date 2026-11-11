const mongoose = require('mongoose');

const groceryItemSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    quantity: Number,
    unit: String,
    estimatedPrice: Number,
    actualPrice: Number,
    isChecked: Boolean,
    category: String,
    categoryColor: String,
    storeId: String,
    barcode: String,
    barcodeType: String,
    imageUrl: String,
    priceHistory: { type: Array, default: [] },
    lastUpdated: String,
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    budget: { type: Number, default: 0 },
    items: { type: [groceryItemSchema], default: [] },
    storeId: String,
    date: String,
    isCompleted: { type: Boolean, default: false },
    completedAt: String,
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
