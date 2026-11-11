const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'app', unique: true },
    defaultBudget: Number,
    notificationsEnabled: Boolean,
    isGuest: Boolean,
    themeMode: { type: String, enum: ['light', 'dark', 'system'] },
    familyMembers: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AppSettings || mongoose.model('AppSettings', settingsSchema);
