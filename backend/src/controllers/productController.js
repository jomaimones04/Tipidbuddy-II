const {
  isValidBarcode,
  lookupProductByBarcode,
  saveManualProduct,
  saveStorePrice,
} = require('../services/productService');

const lookupByBarcode = async (req, res) => {
  try {
    const barcode = String(req.params.barcode || '').trim();
    const barcodeType = String(req.query.barcodeType || '').trim();

    if (!isValidBarcode(barcode)) {
      return res.status(400).json({
        success: false,
        message: 'Unable to identify product',
      });
    }

    const result = await lookupProductByBarcode(barcode, barcodeType);
    return res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to identify product',
    });
  }
};

const createManualProduct = async (req, res) => {
  try {
    const result = await saveManualProduct(req.body || {});
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Manual product save error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to identify product',
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
