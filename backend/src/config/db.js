require('dotenv').config();

const mongoose = require('mongoose');

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000
  });

  console.log('MongoDB connected successfully');
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = {
  connectDatabase,
  isDatabaseConnected
};