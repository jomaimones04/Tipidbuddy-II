import {
  API_BASE_URL,
  API_CONFIGURATION_ERROR,
} from '../config/api';
import type { BarcodeLookupResponse, DetectedProduct, StorePriceInfo } from '../types/product';

const LOOKUP_TIMEOUT_MS = 8000;
const OFF_TIMEOUT_MS = 10000;
const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OPEN_PRICES_URL = 'https://prices.openfoodfacts.org/api/v1/prices';

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    console.log('Malformed product API response:', error);
    return null;
  }
};

const connectionFailure = (message?: string): BarcodeLookupResponse => ({
  success: false,
  found: false,
  message: message ||
    'Unable to connect to the server. Please check your connection and try again.',
});

export const normalizeScannedBarcode = (value?: string | null): string =>
  String(value ?? '').trim();

const barcodeCandidates = (barcode: string): string[] => {
  const clean = normalizeScannedBarcode(barcode);
  const values = [clean];
  if (/^\d{12}$/.test(clean)) {
    values.push(`0${clean}`);
  }
  if (/^\d{13}$/.test(clean) && clean.startsWith('0')) {
    values.push(clean.slice(1));
  }
  return [...new Set(values.filter(Boolean))];
};

const formatGroceryName = (name: string, brand: string): string => {
  const productName = name.trim();
  const brandName = brand.trim();
  if (brandName && productName && !productName.toLowerCase().includes(brandName.toLowerCase())) {
    return `${brandName} ${productName}`;
  }
  return productName || brandName;
};

const firstValue = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export const pickSuggestedPrice = (prices?: StorePriceInfo[]): number | undefined => {
  const phpPrices = (prices || []).filter(
    (row) =>
      (row.currency || 'PHP') === 'PHP' &&
      row.isAvailable !== false &&
      typeof row.price === 'number' &&
      row.price > 0
  );
  if (phpPrices.length === 0) {
    return undefined;
  }
  return Math.min(...phpPrices.map((row) => row.price));
};

const lookupOpenPrices = async (barcode: string): Promise<StorePriceInfo[]> => {
  const collected: StorePriceInfo[] = [];

  for (const code of barcodeCandidates(barcode)) {
    const url = `${OPEN_PRICES_URL}?product_code=${encodeURIComponent(code)}&page_size=50`;
    console.log('Open Prices lookup URL:', url);

    try {
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TipidBuddy/1.0 (grocery budgeting app)',
          },
        }),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('OPEN_PRICES_TIMEOUT')), OFF_TIMEOUT_MS);
        }),
      ]);

      if (!response.ok) {
        console.log('Open Prices HTTP status:', response.status);
        continue;
      }

      const data = (await parseJsonSafely(response)) as {
        items?: Array<{
          price?: number;
          currency?: string;
          location?: { osm_display_name?: string; name?: string };
          location_name?: string;
        }>;
      } | null;

      for (const item of data?.items || []) {
        if (item.currency !== 'PHP' || typeof item.price !== 'number' || item.price <= 0) {
          continue;
        }
        collected.push({
          storeName:
            item.location?.name ||
            item.location?.osm_display_name ||
            item.location_name ||
            'Reported store price',
          price: item.price,
          currency: 'PHP',
          isAvailable: true,
          source: 'open-prices',
        });
      }
    } catch (error) {
      console.log('Open Prices lookup error:', error);
    }
  }

  return collected;
};

const withRetrievedPrices = async (
  product: DetectedProduct,
  barcode: string
): Promise<DetectedProduct> => {
  const openPrices = await lookupOpenPrices(barcode);
  const prices = [...(product.prices || []), ...openPrices];
  const suggestedPrice = pickSuggestedPrice(prices);
  return {
    ...product,
    prices,
    suggestedPrice,
    priceUnavailable: suggestedPrice === undefined,
  };
};

const lookupOpenFoodFacts = async (
  barcode: string,
  barcodeType?: string
): Promise<BarcodeLookupResponse | null> => {
  for (const code of barcodeCandidates(barcode)) {
    const url = `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(code)}?fields=code,product_name,product_name_en,brands,categories,generic_name,image_url,image_front_url`;
    console.log('Open Food Facts lookup URL:', url);

    try {
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TipidBuddy/1.0 (grocery budgeting app)',
          },
        }),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('OFF_TIMEOUT')), OFF_TIMEOUT_MS);
        }),
      ]);

      if (!response.ok) {
        console.log('Open Food Facts HTTP status:', response.status);
        continue;
      }

      const data = (await parseJsonSafely(response)) as {
        status?: number;
        product?: {
          code?: string;
          product_name?: string;
          product_name_en?: string;
          brands?: string;
          categories?: string;
          generic_name?: string;
          image_url?: string;
          image_front_url?: string;
        };
      } | null;

      console.log('Open Food Facts status:', data?.status, data?.product?.product_name);

      if (!data || data.status !== 1 || !data.product) {
        continue;
      }

      const brand = firstValue(data.product.brands);
      const name = formatGroceryName(
        firstValue(data.product.product_name, data.product.product_name_en, data.product.generic_name),
        brand
      );

      if (!name) {
        continue;
      }

      const product: DetectedProduct = {
        barcode: firstValue(data.product.code, code),
        barcodeType,
        productName: name,
        name,
        brand,
        category: firstValue(data.product.categories).split(',')[0]?.trim() || '',
        description: firstValue(data.product.generic_name, data.product.product_name),
        imageUrl: firstValue(data.product.image_url, data.product.image_front_url),
        source: 'openfoodfacts',
      };

      return {
        success: true,
        found: true,
        source: 'openfoodfacts',
        product,
      };
    } catch (error) {
      console.log('Open Food Facts lookup error:', error);
    }
  }

  return null;
};

const lookupBackendProduct = async (
  barcode: string,
  barcodeType?: string
): Promise<BarcodeLookupResponse | null> => {
  if (!API_BASE_URL) {
    return null;
  }

  const query = barcodeType
    ? `?barcodeType=${encodeURIComponent(barcodeType)}`
    : '';
  const url = `${API_BASE_URL}/api/products/barcode/${encodeURIComponent(barcode)}${query}`;
  console.log('Barcode lookup URL:', url);

  try {
    const response = await Promise.race([
      fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('LOOKUP_TIMEOUT')), LOOKUP_TIMEOUT_MS);
      }),
    ]);

    console.log('API response status:', response.status);
    const payload = (await parseJsonSafely(response)) as BarcodeLookupResponse | null;
    if (!payload || typeof payload.success !== 'boolean') {
      return null;
    }
    return payload;
  } catch (error) {
    console.log('Barcode lookup network error:', error);
    return null;
  }
};

export const lookupProductByBarcode = async (
  barcode: string,
  barcodeType?: string
): Promise<BarcodeLookupResponse> => {
  const cleanBarcode = normalizeScannedBarcode(barcode);
  if (!cleanBarcode) {
    return {
      success: false,
      found: false,
      message: 'Unable to read barcode. Please try again.',
    };
  }

  console.log('Barcode scanned:', cleanBarcode);

  const backendResult = await lookupBackendProduct(cleanBarcode, barcodeType);
  if (backendResult?.success && backendResult.found && backendResult.product?.name) {
    const product = await withRetrievedPrices(backendResult.product, cleanBarcode);
    return {
      ...backendResult,
      product,
    };
  }

  const offResult = await lookupOpenFoodFacts(cleanBarcode, barcodeType);
  if (offResult?.product) {
    const product = await withRetrievedPrices(offResult.product, cleanBarcode);
    return {
      ...offResult,
      product,
    };
  }

  if (backendResult?.message === 'Unable to read barcode. Please try again.') {
    return backendResult;
  }

  if (backendResult && backendResult.found === false) {
    return {
      success: false,
      found: false,
      message: 'Product not found',
    };
  }

  if (backendResult === null) {
    return connectionFailure(API_BASE_URL ? undefined : API_CONFIGURATION_ERROR);
  }

  return {
    success: false,
    found: false,
    message: 'Product not found',
  };
};

export const saveManualProduct = async (
  product: DetectedProduct & {
    storeName?: string;
    price?: number;
    stock?: number;
  }
): Promise<BarcodeLookupResponse> => {
  if (!API_BASE_URL) {
    return connectionFailure(API_CONFIGURATION_ERROR);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...product,
        productName: product.productName || product.name,
        barcode: normalizeScannedBarcode(product.barcode),
        source: 'manual',
      }),
    });
    const payload = (await parseJsonSafely(response)) as BarcodeLookupResponse | null;
    return payload || connectionFailure();
  } catch (error) {
    console.log('Manual product save error:', error);
    return connectionFailure();
  }
};

export const saveStorePrice = async (
  barcode: string,
  storeName: string,
  price: number,
  stock?: number
): Promise<void> => {
  if (!API_BASE_URL) {
    console.error('[Product] Store price was not saved:', API_CONFIGURATION_ERROR);
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/products/store-prices`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barcode: normalizeScannedBarcode(barcode),
        storeName,
        price,
        stock,
      }),
    });
  } catch (error) {
    console.log('Store price save error:', error);
  }
};
