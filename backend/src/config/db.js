require('dotenv').config();

const mongoose = require('mongoose');

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const verifyDatabase = async () => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mongoose.connection.db.admin().command({ ping: 1 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await delay(250 * attempt);
    }
  }
  throw lastError;
};

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        dbName: process.env.MONGODB_DATABASE || 'Tipidbuddy-II',
        serverSelectionTimeoutMS: 10000,
        retryWrites: true,
      });
      await verifyDatabase();
      console.log(`MongoDB connected successfully to ${mongoose.connection.name}`);
      return true;
    } catch (error) {
      console.error(`[MongoDB] Startup connection ${attempt}/5 failed:`, error.message);
      if (attempt < 5) {
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          console.warn('[MongoDB] Could not reset failed connection:', disconnectError.message);
        }
        await delay(Math.min(attempt * 1000, 4000));
      }
    }
  }

  return false;
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = {
  connectDatabase,
  verifyDatabase,
  isDatabaseConnected
};