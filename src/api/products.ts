import { API_BASE_URL } from '../config/api';
import type { BarcodeLookupResponse, DetectedProduct } from '../types/product';

const LOOKUP_TIMEOUT_MS = 15000;

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    console.log('Malformed product API response:', error);
    return null;
  }
};

const connectionFailure = (): BarcodeLookupResponse => ({
  success: false,
  found: false,
  message:
    'Unable to connect to the server. Please check your connection and try again.',
});

export const normalizeScannedBarcode = (value?: string | null): string =>
  String(value ?? '').trim();

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

  const query = barcodeType
    ? `?barcodeType=${encodeURIComponent(barcodeType)}`
    : '';
  const url = `${API_BASE_URL}/api/products/barcode/${encodeURIComponent(cleanBarcode)}${query}`;

  console.log('Barcode scanned:', cleanBarcode);
  console.log('Barcode lookup URL:', url);
  console.log('Barcode API URL:', url);

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
      return connectionFailure();
    }

    return payload;
  } catch (error) {
    console.log('Barcode lookup network error:', error);
    return connectionFailure();
  }
};

export const saveManualProduct = async (
  product: DetectedProduct & {
    storeName?: string;
    price?: number;
    stock?: number;
  }
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
