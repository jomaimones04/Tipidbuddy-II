const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null, select: false },
    googleSubject: { type: String, unique: true, sparse: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Account || mongoose.model('Account', accountSchema);
