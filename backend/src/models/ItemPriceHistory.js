const mongoose = require('mongoose');

const itemPriceHistorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    itemName: String,
    category: String,
    categoryColor: String,
    records: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ItemPriceHistory || mongoose.model('ItemPriceHistory', itemPriceHistorySchema);
