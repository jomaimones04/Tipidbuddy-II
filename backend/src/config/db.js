const mongoose = require('mongoose');

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    tls: true,
    family: 4,
  });
  console.log(`MongoDB connected (${mongoose.connection.name})`);
};

module.exports = { connectDatabase };
