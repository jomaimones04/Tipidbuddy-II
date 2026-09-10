require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/db');
const productRoutes = require('./routes/products');

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'TipidBuddy API is running' });
});

app.use('/api/products', productRoutes);

const start = async () => {
  try {
    await connectDatabase();
    app.listen(port, '0.0.0.0', () => {
      console.log(`TipidBuddy API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start API:', error.message);
    process.exit(1);
  }
};

start();
