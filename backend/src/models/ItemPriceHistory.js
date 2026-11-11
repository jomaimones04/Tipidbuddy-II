const mongoose = require('mongoose');

const purchaseRecordSchema = new mongoose.Schema(
  {
    storeId: String,
    storeName: String,
    price: Number,
    date: String,
    purchaseId: String,
    cartId: String,
    itemId: String,
  },
  { _id: false }
);

const itemPriceHistorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    itemName: String,
    category: String,
    categoryColor: String,
    records: { type: [purchaseRecordSchema], default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ItemPriceHistory || mongoose.model('ItemPriceHistory', itemPriceHistorySchema);
