export interface StorePriceInfo {
  storeName: string;
  storeType?: string;
  city?: string;
  barangay?: string;
  price: number;
  currency?: string;
  stock?: number;
  stockStatus?: string;
  isAvailable?: boolean;
}

export interface DetectedProduct {
  barcode: string;
  barcodeType?: string;
  productName?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  imageUrl?: string;
  source?: string;
  prices?: StorePriceInfo[];
}

export interface BarcodeLookupResponse {
  success: boolean;
  found?: boolean;
  source?: string;
  product?: DetectedProduct;
  message?: string;
}
