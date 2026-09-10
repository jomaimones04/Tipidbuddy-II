export interface DetectedProduct {
  barcode: string;
  barcodeType?: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  source?: string;
}

export interface BarcodeLookupResponse {
  success: boolean;
  found?: boolean;
  source?: string;
  product?: DetectedProduct;
  message?: string;
}
