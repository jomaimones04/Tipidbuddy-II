const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'TipidBuddy Test User' },
    email: { type: String, default: '' },
    source: { type: String, default: 'health-check' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
