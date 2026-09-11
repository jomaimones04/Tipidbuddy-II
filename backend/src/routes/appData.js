const express = require('express');
const Cart = require('../models/Cart');
const Store = require('../models/Store');
const Category = require('../models/Category');
const Template = require('../models/Template');
const AppSettings = require('../models/AppSettings');
const ItemPriceHistory = require('../models/ItemPriceHistory');

const stripMongo = (doc) => {
  if (!doc) return doc;
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  delete value._id;
  delete value.__v;
  delete value.createdAt;
  delete value.updatedAt;
  return value;
};

const createCrudRouter = (Model, idField = 'id') => {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    try {
      const docs = await Model.find().lean();
      res.json({ success: true, data: docs.map(stripMongo) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const doc = await Model.findOne({ [idField]: req.params.id }).lean();
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      res.json({ success: true, data: stripMongo(doc) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload[idField]) {
        return res.status(400).json({ success: false, message: `${idField} is required` });
      }
      const saved = await Model.findOneAndUpdate(
        { [idField]: payload[idField] },
        payload,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json({ success: true, data: stripMongo(saved) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const saved = await Model.findOneAndUpdate(
        { [idField]: req.params.id },
        { ...req.body, [idField]: req.params.id },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json({ success: true, data: stripMongo(saved) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await Model.findOneAndDelete({ [idField]: req.params.id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};

const settingsRouter = express.Router();
settingsRouter.get('/', async (_req, res) => {
  try {
    const doc = await AppSettings.findOne({ key: 'app' }).lean();
    res.json({ success: true, data: doc ? stripMongo(doc) : null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
settingsRouter.put('/', async (req, res) => {
  try {
    const saved = await AppSettings.findOneAndUpdate(
      { key: 'app' },
      { key: 'app', ...req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: stripMongo(saved) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const purchasesRouter = express.Router();
purchasesRouter.get('/', async (_req, res) => {
  try {
    const docs = await ItemPriceHistory.find().lean();
    const map = {};
    docs.forEach((doc) => {
      map[doc.key] = {
        itemName: doc.itemName,
        category: doc.category,
        categoryColor: doc.categoryColor,
        records: doc.records || [],
      };
    });
    res.json({ success: true, data: map });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
purchasesRouter.put('/', async (req, res) => {
  try {
    const map = req.body || {};
    const keys = Object.keys(map);
    await Promise.all(
      keys.map((key) =>
        ItemPriceHistory.findOneAndUpdate(
          { key },
          { key, ...map[key] },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const budgetsRouter = express.Router();
budgetsRouter.get('/', async (_req, res) => {
  try {
    const carts = await Cart.find().lean();
    res.json({
      success: true,
      data: carts.map((cart) => ({
        cartId: cart.id,
        name: cart.name,
        budget: cart.budget,
        totalSpent: cart.totalSpent,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const expensesRouter = express.Router();
expensesRouter.get('/', async (_req, res) => {
  try {
    const carts = await Cart.find({ isCompleted: true }).lean();
    res.json({
      success: true,
      data: carts.map((cart) => ({
        cartId: cart.id,
        name: cart.name,
        totalSpent: cart.totalSpent,
        budget: cart.budget,
        date: cart.completedAt || cart.date,
        storeId: cart.storeId,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = {
  groceryListsRouter: createCrudRouter(Cart),
  storesRouter: createCrudRouter(Store),
  categoriesRouter: createCrudRouter(Category),
  templatesRouter: createCrudRouter(Template),
  settingsRouter,
  purchasesRouter,
  budgetsRouter,
  expensesRouter,
};
