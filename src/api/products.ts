import { API_BASE_URL } from '../config/api';
import type { BarcodeLookupResponse, DetectedProduct } from '../types/product';

const LOOKUP_TIMEOUT_MS = 10000;

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    console.log('Malformed product API response:', error);
    return null;
  }
};

export const lookupProductByBarcode = async (
  barcode: string,
  barcodeType?: string
): Promise<BarcodeLookupResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const query = barcodeType
      ? `?barcodeType=${encodeURIComponent(barcodeType)}`
      : '';
    const url = `${API_BASE_URL}/api/products/barcode/${encodeURIComponent(barcode)}${query}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const payload = (await parseJsonSafely(response)) as BarcodeLookupResponse | null;
    if (!payload || typeof payload.success !== 'boolean') {
      return {
        success: false,
        found: false,
        message: 'Unable to identify product. You can add it manually.',
      };
    }

    return payload;
  } catch (error) {
    console.log('Barcode lookup network error:', error);
    return {
      success: false,
      found: false,
      message: 'Unable to identify product. You can add it manually.',
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const saveManualProduct = async (
  product: DetectedProduct
): Promise<BarcodeLookupResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...product,
        source: 'manual',
      }),
    });
    const payload = (await parseJsonSafely(response)) as BarcodeLookupResponse | null;
    return (
      payload || {
        success: false,
        message: 'Unable to save product',
      }
    );
  } catch (error) {
    console.log('Manual product save error:', error);
    return {
      success: false,
      message: 'Unable to save product',
    };
  }
};

export const saveStorePrice = async (
  barcode: string,
  storeName: string,
  price: number
): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/products/store-prices`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode, storeName, price }),
    });
  } catch (error) {
    console.log('Store price save error:', error);
  }
};
