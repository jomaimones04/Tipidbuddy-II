const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT_MS = 8000;

const firstValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const formatGroceryName = (name, brand) => {
  const productName = (name || '').trim();
  const brandName = (brand || '').trim();
  if (brandName && productName && !productName.toLowerCase().includes(brandName.toLowerCase())) {
    return `${brandName} ${productName}`;
  }
  return productName || brandName;
};

const firstCategory = (categories) => {
  if (!categories || typeof categories !== 'string') {
    return '';
  }
  return categories.split(',')[0].trim();
};

const normalizeOpenFoodFactsProduct = (product, barcode, barcodeType) => {
  const brand = firstValue(product.brands);
  const name = formatGroceryName(
    firstValue(product.product_name, product.product_name_en, product.generic_name),
    brand
  );

  return {
    barcode: firstValue(product.code, barcode),
    barcodeType: barcodeType || '',
    name,
    brand,
    category: firstCategory(product.categories),
    description: firstValue(product.generic_name, product.product_name),
    imageUrl: firstValue(product.image_url, product.image_front_url),
    source: 'openfoodfacts',
  };
};

const barcodeCandidates = (barcode) => {
  const clean = String(barcode || '').trim();
  const values = [clean];
  if (/^\d{12}$/.test(clean)) values.push(`0${clean}`);
  if (/^\d{13}$/.test(clean) && clean.startsWith('0')) values.push(clean.slice(1));
  return [...new Set(values.filter(Boolean))];
};

const fetchOpenFoodFactsProduct = async (barcode, barcodeType) => {
  for (const code of barcodeCandidates(barcode)) {
    try {
      const product = await fetchOpenFoodFactsOnce(code, barcodeType);
      if (product?.name) {
        return product;
      }
    } catch (error) {
      console.error('[OFF] candidate failed:', code, error.message);
    }
  }
  return null;
};

const fetchOpenFoodFactsOnce = async (barcode, barcodeType) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}?fields=code,product_name,product_name_en,brands,categories,generic_name,image_url,image_front_url`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TipidBuddy/1.0 (capstone grocery app)',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Open Food Facts HTTP ${response.status}`);
      error.code = 'OFF_UNAVAILABLE';
      throw error;
    }

    const data = await response.json();
    console.log('[OFF] HTTP status:', response.status);
    console.log('[OFF] RAW top-level keys:', data && typeof data === 'object' ? Object.keys(data) : data);
    console.log('[OFF] RAW status:', data?.status);
    console.log('[OFF] RAW status_verbose:', data?.status_verbose);
    console.log('[OFF] RAW code:', data?.code);
    console.log(
      '[OFF] RAW product summary:',
      data?.product
        ? {
            product_name: data.product.product_name,
            product_name_en: data.product.product_name_en,
            brands: data.product.brands,
            code: data.product.code,
          }
        : null
    );

    if (!data || data.status !== 1 || !data.product) {
      console.log('[OFF] Treating as not found because status !== 1 or product missing');
      return null;
    }

    const normalized = normalizeOpenFoodFactsProduct(data.product, barcode, barcodeType);
    if (!normalized.name || normalized.name === 'Unknown Product') {
      return null;
    }
    return normalized;
  } catch (error) {
    console.error('[OFF] fetch error.message:', error.message);
    console.error('[OFF] fetch error.name:', error.name);
    console.error('[OFF] fetch error.response?.status:', error.response?.status);
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Open Food Facts timed out');
      timeoutError.code = 'OFF_UNAVAILABLE';
      throw timeoutError;
    }
    if (error.code === 'OFF_UNAVAILABLE') {
      throw error;
    }
    const unavailable = new Error(error.message || 'Open Food Facts unavailable');
    unavailable.code = 'OFF_UNAVAILABLE';
    throw unavailable;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  fetchOpenFoodFactsProduct,
};
