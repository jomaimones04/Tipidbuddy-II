require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const {
  connectDatabase,
  isDatabaseConnected,
  verifyDatabase,
} = require('./config/db');

const productRoutes = require('./routes/products');
const User = require('./models/User');

const {
  groceryListsRouter,
  storesRouter,
  categoriesRouter,
  templatesRouter,
  settingsRouter,
  purchasesRouter,
  budgetsRouter,
  expensesRouter,
} = require('./routes/appData');

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'TipidBuddy API is running, but MongoDB is disconnected',
        database: 'disconnected',
      });
    }

    await verifyDatabase();
    res.json({
      success: true,
      message: 'TipidBuddy API and MongoDB are healthy',
      database: 'connected',
      databaseName: mongoose.connection.name,
    });
  } catch (error) {
    console.error('[Health] MongoDB ping failed:', error.message);
    res.status(503).json({
      success: false,
      message: 'TipidBuddy API is running, but MongoDB is unavailable',
      database: 'unavailable',
    });
  }
});

app.get('/api/test-db', async (_req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is not connected',
      });
    }

    const ping = await User.create({
      name: 'TipidBuddy DB Test',
      source: 'test-db',
    });
    const count = await User.countDocuments();
    const collections = await mongoose.connection.db.listCollections().toArray();

    res.json({
      success: true,
      message: 'MongoDB read/write succeeded',
      insertedId: String(ping._id),
      userCount: count,
      collections: collections.map((item) => item.name),
    });
  } catch (error) {
    console.error('test-db failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'MongoDB test failed',
    });
  }
});

app.use('/api/products', productRoutes);
app.use('/api/grocery-lists', groceryListsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/expenses', expensesRouter);

const start = async () => {
  try {
    const databaseReady = await connectDatabase();
    if (databaseReady) {
      console.log('[MongoDB] Barcode index is managed by the Product schema.');
    } else {
      console.warn('[MongoDB] Starting API in degraded mode; database health checks will report unavailable.');
    }
    app.listen(port, '0.0.0.0', () => {
      console.log(`TipidBuddy API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start API:', error.message);
    process.exit(1);
  }
};

start();
