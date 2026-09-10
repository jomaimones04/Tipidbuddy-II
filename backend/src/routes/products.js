const express = require('express');
const {
  lookupByBarcode,
  createManualProduct,
  createStorePrice,
} = require('../controllers/productController');

const router = express.Router();

router.get('/barcode/:barcode', lookupByBarcode);
router.post('/', createManualProduct);
router.post('/store-prices', createStorePrice);

module.exports = router;
