const mongoose = require('mongoose');

const storePriceSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

storePriceSchema.index({ barcode: 1, storeName: 1 }, { unique: true });

module.exports = mongoose.model('StorePrice', storePriceSchema);
