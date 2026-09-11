const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: String,
    createdAt: String,
    lastUsedAt: String,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Store || mongoose.model('Store', storeSchema);
