const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    barcodeType: {
      type: String,
      default: '',
    },
    productName: {
      type: String,
      default: '',
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ['openfoodfacts', 'manual'],
      default: 'manual',
    },
  },
  { timestamps: true, collection: 'products' }
);

productSchema.pre('validate', function setDisplayName() {
  const displayName = (this.productName || this.name || '').trim();
  this.productName = displayName;
  this.name = displayName;
});

module.exports = mongoose.model('Product', productSchema);
