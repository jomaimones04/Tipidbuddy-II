const Product = require('../models/Product');
const StorePrice = require('../models/StorePrice');
const { fetchOpenFoodFactsProduct } = require('./openFoodFacts');

const BARCODE_PATTERN = /^[A-Za-z0-9]{4,32}$/;

const isValidBarcode = (barcode) => BARCODE_PATTERN.test(barcode || '');

const toClientProduct = (product) => ({
  barcode: product.barcode,
  barcodeType: product.barcodeType || '',
  name: product.name,
  brand: product.brand || '',
  category: product.category || '',
  description: product.description || '',
  imageUrl: product.imageUrl || '',
  source: product.source,
});

const lookupProductByBarcode = async (barcode, barcodeType = '') => {
  const existing = await Product.findOne({ barcode });
  if (existing) {
    return {
      success: true,
      found: true,
      source: existing.source,
      product: toClientProduct(existing),
    };
  }

  let offProduct;
  try {
    offProduct = await fetchOpenFoodFactsProduct(barcode, barcodeType);
  } catch (error) {
    if (error.code === 'OFF_UNAVAILABLE') {
      return {
        success: false,
        found: false,
        message: 'Unable to identify product',
      };
    }
    throw error;
  }

  if (!offProduct) {
    return {
      success: true,
      found: false,
      message: 'Product not found',
    };
  }

  const saved = await Product.create({
    barcode: offProduct.barcode,
    barcodeType: offProduct.barcodeType,
    name: offProduct.name,
    brand: offProduct.brand,
    category: offProduct.category,
    description: offProduct.description,
    imageUrl: offProduct.imageUrl,
    source: 'openfoodfacts',
  });

  return {
    success: true,
    found: true,
    source: saved.source,
    product: toClientProduct(saved),
  };
};

const saveManualProduct = async (payload) => {
  const barcode = (payload.barcode || '').trim();
  if (!isValidBarcode(barcode)) {
    return {
      success: false,
      message: 'Invalid barcode',
    };
  }

  const name = (payload.name || '').trim();
  if (!name) {
    return {
      success: false,
      message: 'Product name is required',
    };
  }

  const update = {
    barcode,
    barcodeType: payload.barcodeType || '',
    name,
    brand: payload.brand || '',
    category: payload.category || '',
    description: payload.description || '',
    imageUrl: payload.imageUrl || '',
  };

  const existing = await Product.findOne({ barcode });
  if (existing && existing.source === 'openfoodfacts') {
    return {
      success: true,
      found: true,
      source: existing.source,
      product: toClientProduct(existing),
    };
  }

  const saved = await Product.findOneAndUpdate(
    { barcode },
    {
      ...update,
      source: 'manual',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    found: true,
    source: saved.source,
    product: toClientProduct(saved),
  };
};

const saveStorePrice = async ({ barcode, storeName, price }) => {
  const cleanBarcode = (barcode || '').trim();
  const cleanStore = (storeName || '').trim();
  const numericPrice = Number(price);

  if (!isValidBarcode(cleanBarcode) || !cleanStore || Number.isNaN(numericPrice) || numericPrice < 0) {
    return {
      success: false,
      message: 'Invalid store price payload',
    };
  }

  const saved = await StorePrice.findOneAndUpdate(
    { barcode: cleanBarcode, storeName: cleanStore },
    { barcode: cleanBarcode, storeName: cleanStore, price: numericPrice },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    success: true,
    storePrice: {
      barcode: saved.barcode,
      storeName: saved.storeName,
      price: saved.price,
    },
  };
};

module.exports = {
  isValidBarcode,
  lookupProductByBarcode,
  saveManualProduct,
  saveStorePrice,
};
