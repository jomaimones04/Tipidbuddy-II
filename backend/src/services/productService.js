const Product = require('../models/Product');
const StorePrice = require('../models/StorePrice');
const { fetchOpenFoodFactsProduct } = require('./openFoodFacts');

const BARCODE_PATTERN = /^[A-Za-z0-9]{4,32}$/;

const normalizeBarcode = (value) =>
  String(value ?? '')
    .replace(/[\n\r\t]/g, '')
    .trim();

const isValidBarcode = (barcode) => BARCODE_PATTERN.test(normalizeBarcode(barcode));

const displayName = (product) =>
  String(product.productName || product.name || '').trim();

const toClientProduct = (product, prices = []) => ({
  _id: product._id ? String(product._id) : undefined,
  barcode: String(product.barcode ?? ''),
  barcodeType: product.barcodeType || '',
  productName: displayName(product),
  name: displayName(product),
  brand: product.brand || '',
  category: product.category || '',
  subcategory: product.subcategory || '',
  description: product.description || '',
  unit: product.unit || '',
  quantity: product.quantity ?? 1,
  imageUrl: product.imageUrl || '',
  isActive: product.isActive !== false,
  source: product.source || 'manual',
  prices,
});

const findProductByBarcode = async (barcode) => {
  const clean = normalizeBarcode(barcode);
  if (!clean) return null;

  const candidates = [clean];
  if (/^\d{12}$/.test(clean)) candidates.push(`0${clean}`);
  if (/^\d{13}$/.test(clean) && clean.startsWith('0')) candidates.push(clean.slice(1));

  console.log('Searching product:', candidates);
  const product = await Product.findOne({ barcode: { $in: [...new Set(candidates)] } });
  console.log('Product found:', product ? (product.productName || product.name) : null);
  return product;
};

const toStockStatus = (stock) => {
  const qty = Number(stock);
  if (!Number.isFinite(qty) || qty <= 0) return 'Out of Stock';
  if (qty <= 5) return 'Low Stock';
  return 'In Stock';
};

const loadStorePrices = async (product) => {
  const barcode = normalizeBarcode(product.barcode);
  const clauses = [];
  if (barcode) clauses.push({ barcode });
  if (product._id) clauses.push({ productId: product._id });
  if (!clauses.length) return [];

  const rows = await StorePrice.find({ $or: clauses }).sort({ price: 1 }).lean();
  return rows.map((row) => ({
    storeName: row.storeName || '',
    storeType: row.storeType || '',
    city: row.storeLocation?.city || '',
    barangay: row.storeLocation?.barangay || '',
    price: row.price,
    currency: row.currency || 'PHP',
    stock: row.stock ?? 0,
    stockStatus: row.stockStatus || toStockStatus(row.stock),
    isAvailable: row.isAvailable !== false && (row.stock ?? 0) > 0,
  }));
};

const lookupProductByBarcode = async (barcode, barcodeType = '') => {
  const clean = normalizeBarcode(barcode);
  if (!clean) {
    return {
      success: false,
      found: false,
      message: 'Unable to read barcode. Please try again.',
    };
  }

  console.log('[LOOKUP] isValidBarcode(', JSON.stringify(clean), '):', isValidBarcode(clean));
  console.log('[LOOKUP] BARCODE_PATTERN:', BARCODE_PATTERN.toString(), 'length:', clean.length);

  if (!isValidBarcode(clean)) {
    return {
      success: false,
      found: false,
      message: 'Unable to read barcode. Please try again.',
    };
  }

  const existing = await findProductByBarcode(clean);
  if (existing && existing.isActive !== false) {
    const prices = await loadStorePrices(existing);
    return {
      success: true,
      found: true,
      source: existing.source || 'manual',
      product: toClientProduct(existing, prices),
    };
  }

  console.log('[LOOKUP] MongoDB miss, calling Open Food Facts for:', clean);

  let offProduct;
  try {
    offProduct = await fetchOpenFoodFactsProduct(clean, barcodeType);
  } catch (error) {
    console.error('[LOOKUP] Open Food Facts error.message:', error.message);
    console.error('[LOOKUP] Open Food Facts error.code:', error.code);
    console.error('[LOOKUP] Open Food Facts error.response?.status:', error.response?.status);
    return {
      success: false,
      found: false,
      message: 'Product not found',
    };
  }

  if (!offProduct) {
    console.log('[LOOKUP] Open Food Facts returned no product for:', clean);
    return {
      success: false,
      found: false,
      message: 'Product not found',
    };
  }

  console.log('[LOOKUP] Open Food Facts hit, caching:', offProduct.name || offProduct.productName);

  const saved = await Product.findOneAndUpdate(
    { barcode: clean },
    {
      barcode: clean,
      barcodeType: offProduct.barcodeType || barcodeType || '',
      productName: offProduct.name,
      name: offProduct.name,
      brand: offProduct.brand || '',
      category: offProduct.category || '',
      description: offProduct.description || '',
      imageUrl: offProduct.imageUrl || '',
      source: 'openfoodfacts',
      isActive: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const prices = await loadStorePrices(saved);
  return {
    success: true,
    found: true,
    source: saved.source,
    product: toClientProduct(saved, prices),
  };
};

const saveManualProduct = async (payload) => {
  const barcode = normalizeBarcode(payload.barcode);
  if (!isValidBarcode(barcode)) {
    return {
      success: false,
      message: 'Invalid barcode',
    };
  }

  const name = String(payload.productName || payload.name || '').trim();
  if (!name) {
    return {
      success: false,
      message: 'Product name is required',
    };
  }

  const update = {
    barcode,
    barcodeType: payload.barcodeType || '',
    productName: name,
    name,
    brand: payload.brand || '',
    category: payload.category || '',
    subcategory: payload.subcategory || '',
    description: payload.description || '',
    unit: payload.unit || '',
    quantity: Number(payload.quantity) || 1,
    imageUrl: payload.imageUrl || '',
    isActive: payload.isActive !== false,
    source: 'manual',
  };

  const saved = await Product.findOneAndUpdate(
    { barcode },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (payload.storeName && payload.price !== undefined && payload.price !== '') {
    await saveStorePrice({
      barcode,
      productId: saved._id,
      storeName: payload.storeName,
      price: payload.price,
      stock: payload.stock,
    });
  }

  const prices = await loadStorePrices(saved);
  return {
    success: true,
    found: true,
    source: saved.source,
    product: toClientProduct(saved, prices),
  };
};

const saveStorePrice = async ({ barcode, productId, storeName, price, stock, storeType }) => {
  const cleanBarcode = normalizeBarcode(barcode);
  const cleanStore = String(storeName || '').trim();
  const numericPrice = Number(price);
  const numericStock = stock === undefined || stock === '' ? undefined : Number(stock);

  if (!isValidBarcode(cleanBarcode) || !cleanStore || Number.isNaN(numericPrice) || numericPrice < 0) {
    return {
      success: false,
      message: 'Invalid store price payload',
    };
  }

  const update = {
    barcode: cleanBarcode,
    storeName: cleanStore,
    storeType: storeType || '',
    price: numericPrice,
    currency: 'PHP',
    priceUpdatedAt: new Date(),
  };

  if (productId) update.productId = productId;
  if (Number.isFinite(numericStock)) {
    update.stock = numericStock;
    update.stockStatus = toStockStatus(numericStock);
    update.isAvailable = numericStock > 0;
  }

  const saved = await StorePrice.findOneAndUpdate(
    { barcode: cleanBarcode, storeName: cleanStore },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    storePrice: {
      barcode: saved.barcode,
      storeName: saved.storeName,
      price: saved.price,
      stock: saved.stock,
      stockStatus: saved.stockStatus,
      isAvailable: saved.isAvailable,
    },
  };
};

const ensureBarcodeIndex = async () => {
  try {
    const duplicates = await Product.aggregate([
      {
        $group: {
          _id: { $toString: '$barcode' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
      console.warn(
        `Found ${duplicates.length} duplicate barcode value(s); creating a non-unique barcode index.`
      );
    }

    await Product.collection.createIndex({ barcode: 1 });
    console.log('Index ensured on products.barcode');
  } catch (error) {
    console.warn('Could not create barcode index:', error.message);
  }
};

module.exports = {
  normalizeBarcode,
  isValidBarcode,
  lookupProductByBarcode,
  saveManualProduct,
  saveStorePrice,
  ensureBarcodeIndex,
};
