// Peso formatter utility
export const formatPeso = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

// Format peso without symbol for display (used with ₱ symbol)
export const formatPesoAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Parse peso string to number
export const parsePesoString = (pesoString: string): number => {
  const cleaned = pesoString.replace(/[₱\s,]/g, '');
  return parseFloat(cleaned) || 0;
};

// Calculate price trend
export type PriceTrend = 'up' | 'down' | 'stable';

export const calculatePriceTrend = (
  previousPrice: number,
  currentPrice: number,
  threshold: number = 0.05 // 5% threshold
): PriceTrend => {
  if (previousPrice === 0) return 'stable';

  const percentChange = (currentPrice - previousPrice) / previousPrice;

  if (percentChange > threshold) return 'up';
  if (percentChange < -threshold) return 'down';
  return 'stable';
};

// Get trend icon
export const getTrendIcon = (trend: PriceTrend): string => {
  const icons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };
  return icons[trend];
};

// Generate CSV export
export const generateCSV = (
  cartName: string,
  items: any[],
  totalSpent: number,
  budget: number,
  storeName?: string,
  date?: string
): string => {
  const header = 'Date,Cart Name,Store,Budget (₱),Total Spent (₱),Item Name,Category,Qty,Unit,Price (₱)\n';

  const rows = items
    .map((item) => {
      const rowDate = date || new Date().toISOString().split('T')[0];
      const rowStore = storeName || 'N/A';
      const rowPrice = item.actualPrice || item.estimatedPrice;

      return `${rowDate},"${cartName}","${rowStore}",${budget},${totalSpent},"${item.name}","${item.category}",${item.quantity},"${item.unit || ''}",${rowPrice}`;
    })
    .join('\n');

  return header + rows;
};

// Date utilities
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getCurrentDate = (): string => {
  return new Date().toISOString();
};

// Export animation utilities
export * from './animations';
export * from './storeBreakdown';
export * from './categoryDetector';
export * from './textCleaner';

// Voice input parser
export const parseVoiceInput = (
  input: string
): {
  name?: string;
  quantity?: number;
  unit?: string;
  price?: number;
} => {
  // Simple parser for Filipino/English input
  // Example: "2 kilo ng bigas, 80 piso" or "2 kilos of rice for 80 pesos"

  const result: any = {};

  // Extract quantity
  const quantityMatch = input.match(/(\d+(?:\.\d+)?)\s*(kilo|kg|pieces|pcs|piece|pc|box|bottle|pack|bundles?)/i);
  if (quantityMatch) {
    result.quantity = parseFloat(quantityMatch[1]);
    result.unit = quantityMatch[2];
  }

  // Extract price
  const priceMatch = input.match(/(\d+(?:\.\d+)?)\s*(piso|peso|pesos|php|₱)/i);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1]);
  }

  // Extract item name (words that aren't numbers, units, or price keywords)
  const cleanInput = input
    .replace(/(\d+(?:\.\d+)?)\s*(kilo|kg|pieces|pcs|piece|pc|box|bottle|pack|bundles?)/i, '')
    .replace(/(\d+(?:\.\d+)?)\s*(piso|peso|pesos|php|₱)/i, '')
    .replace(/(ng|of|for|,)/i, '')
    .trim();

  if (cleanInput) {
    result.name = cleanInput;
  }

  return result;
};

// Validation utilities
export const isValidPrice = (price: any): boolean => {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0;
};

export const isValidQuantity = (quantity: any): boolean => {
  const num = parseFloat(quantity);
  return !isNaN(num) && num > 0;
};

// UUID generator
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
