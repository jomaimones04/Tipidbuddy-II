const mongoose = require('mongoose');

const storePriceSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeType: {
      type: String,
      default: '',
      trim: true,
    },
    storeLocation: {
      city: { type: String, default: '' },
      barangay: { type: String, default: '' },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PHP',
    },
    stock: {
      type: Number,
      default: 0,
    },
    stockStatus: {
      type: String,
      default: 'In Stock',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    priceUpdatedAt: {
      type: Date,
    },
  },
  { timestamps: true, collection: 'store_prices' }
);

storePriceSchema.index({ barcode: 1, storeName: 1 });

module.exports = mongoose.model('StorePrice', storePriceSchema);
