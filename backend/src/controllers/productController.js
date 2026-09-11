const { isDatabaseConnected } = require('../config/db');
const {
  normalizeBarcode,
  lookupProductByBarcode,
  saveManualProduct,
  saveStorePrice,
} = require('../services/productService');

const lookupByBarcode = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        found: false,
        message: 'Unable to connect to the product database.',
      });
    }

    const rawParam = req.params.barcode || req.body?.barcode;
    console.log('[LOOKUP] RAW req.params.barcode:', JSON.stringify(req.params.barcode));
    console.log('[LOOKUP] RAW req.body.barcode:', JSON.stringify(req.body?.barcode));
    console.log('[LOOKUP] RAW query barcodeType:', JSON.stringify(req.query.barcodeType));

    const barcode = normalizeBarcode(rawParam);
    const barcodeType = String(req.query.barcodeType || req.body?.barcodeType || '').trim();
    console.log('[LOOKUP] Normalized barcode received:', JSON.stringify(barcode));

    if (!barcode) {
      return res.status(400).json({
        success: false,
        found: false,
        message: 'Unable to read barcode. Please try again.',
      });
    }

    const result = await lookupProductByBarcode(barcode, barcodeType);
    console.log('Product found:', result.product || null);
    const status = result.found ? 200 : result.message === 'Product not found' ? 200 : 400;
    return res.status(status).json(result);
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return res.status(503).json({
      success: false,
      found: false,
      message: 'Unable to connect to the product database.',
    });
  }
};

const createManualProduct = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Unable to connect to the product database.',
      });
    }

    const result = await saveManualProduct(req.body || {});
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Manual product save error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to connect to the product database.',
    });
  }
};

const createStorePrice = async (req, res) => {
  try {
    const result = await saveStorePrice(req.body || {});
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Store price save error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save store price',
    });
  }
};

module.exports = {
  lookupByBarcode,
  createManualProduct,
  createStorePrice,
};
