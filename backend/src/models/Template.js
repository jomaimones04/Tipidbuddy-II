const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    items: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Template || mongoose.model('Template', templateSchema);
