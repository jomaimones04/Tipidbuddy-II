/**
 * Helper to capitalize each word in a string (Title Case), preserving hyphens, spaces, and parentheses.
 * E.g., "milo activ-go" -> "Milo Activ-Go"
 * E.g., "tender juicy hotdog (regular)" -> "Tender Juicy Hotdog (Regular)"
 */
export function capitalizeTitle(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Parses raw text from OCR and extracts the most likely candidate for the grocery item name.
 * It filters out noise like prices, standalone numbers, dates, store headers, and units,
 * then cleans and formats the best candidate line.
 *
 * @param rawText The raw text output from MLKit or Tesseract OCR.
 * @returns A cleaned and formatted candidate product name, or an empty string.
 */
export function extractProductName(rawText: string): string {
  if (!rawText) return '';

  // Split text by lines
  const lines = rawText.split(/\r?\n/);

  // Common noise terms to ignore (lowercase)
  const NOISE_KEYWORDS = [
    'supermarket',
    'hypermarket',
    'puregold',
    'savemore',
    'robinsons',
    'landmark',
    'waltermart',
    'total',
    'subtotal',
    'cash',
    'change',
    'receipt',
    'date',
    'items',
    'welcome',
    'thank you',
    'tax',
    'vat',
    'invoice',
    'official',
  ];

  // Regex rules to filter out lines
  const PRICE_REGEX = /^[₱$]?\s*[\d,]+\s*(?:[.]\d{2})?\s*(?:php|pesos?|pisos?|usd)?$/i;
  const CURRENCY_PREFIX_REGEX = /^(?:php|usd|₱|\$)\s*[\d,]+(?:[.]\d+)?$/i;
  const QUANTITY_UNIT_REGEX = /^\d+\s*(?:kg|g|ml|l|pcs|pc|pack|packs|bottle|bottles|loaf|loaves|bag|bags|box|boxes|can|cans|dozen|dozens|bundle|bundles|kilo|kilos|gram|grams|liter|liters|piece|pieces)?$/i;
  const DATE_TIME_REGEX = /^\d{2,4}[-/: ]\d{2}[-/: ]\d{2,4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/;

  const candidates: string[] = [];

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (trimmedLine.length < 2) continue;

    const normalizedLine = trimmedLine.toLowerCase();

    // 1. Filter out price lines
    if (PRICE_REGEX.test(trimmedLine) || CURRENCY_PREFIX_REGEX.test(trimmedLine)) {
      continue;
    }

    // 2. Filter out quantity and unit lines or pure numbers
    if (QUANTITY_UNIT_REGEX.test(trimmedLine)) {
      continue;
    }

    // 3. Filter out dates
    if (DATE_TIME_REGEX.test(trimmedLine)) {
      continue;
    }

    // 4. Filter out lines that match store headers or receipt terms
    if (NOISE_KEYWORDS.some((word) => normalizedLine.includes(word))) {
      continue;
    }

    // 5. Clean up the line: strip noisy special characters but keep letters, numbers, spaces, parentheses, and hyphens.
    let cleanedLine = trimmedLine
      .replace(/[#*@_=+/\\]/g, '') // remove common formatting noise
      .trim();

    // Strip leading/trailing non-alphanumeric chars (like trailing commas, dots, colons, or dashes)
    cleanedLine = cleanedLine.replace(/^[^a-zA-Z0-9(]+|[^a-zA-Z0-9)]+$/g, '').trim();

    // 6. Ensure line contains at least one alphabet character and is long enough
    if (/[a-zA-Z]/.test(cleanedLine) && cleanedLine.length >= 2) {
      candidates.push(cleanedLine);
    }
  }

  if (candidates.length === 0) {
    return '';
  }

  // Join remaining candidates with space to handle brands/product names split across lines
  const selectedName = candidates.join(' ');

  // Capitalize properly
  return capitalizeTitle(selectedName);
}

export interface ParsedItem {
  name: string;       // Cleaned item name
  price: string;      // Numeric string e.g. "35.00", or "" if not found
  quantity: string;   // e.g. "500g", "1L", "6 pcs", or "" if not found
}

/**
 * Processes raw OCR output and extracts three key fields: Name, Price, and Quantity.
 * Matches currency, weight/volume/count units, and Filipino quantity terms.
 *
 * @param rawOCRText The raw text output from OCR.
 * @returns An object containing the extracted name, price, and quantity.
 */
export function parseOCRResult(rawOCRText: string): ParsedItem {
  if (!rawOCRText) {
    return { name: '', price: '', quantity: '' };
  }

  let textForName = rawOCRText;
  let detectedPrice = '';
  let detectedQuantity = '';

  // 1. Extract Price
  const priceRegexes = [
    // Matches: ₱35.00, PHP 35, P35.00, PHP35 (with optional unit suffixes like /kg, /pc)
    /(?:[₱P]|PHP)\s*(\d+(?:\.\d{1,2})?)(?:\s*\/\s*(?:kg|g|pc|pcs|ltr|L|ml))?/i,
    // Matches: SRP: 35.00, Price 35, Cost: ₱35
    /(?:price|srp|cost|presyo)\s*:?\s*(?:[₱P]|PHP)?\s*(\d+(?:\.\d{1,2})?)/i,
    // Matches: 35.75/kg, 80/pc
    /\b(\d+(?:\.\d{1,2})?)\s*\/\s*(?:kg|kilo|g|gram|pc|pcs|piece|ltr|L|ml)\b/i,
  ];

  let matchedPriceString = '';
  for (const regex of priceRegexes) {
    const match = regex.exec(rawOCRText);
    if (match) {
      detectedPrice = match[1];
      matchedPriceString = match[0];
      break;
    }
  }

  // 2. Extract Quantity/Unit
  const weightRegex = /\b(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|g|gram|grams|mg|milligram)s?\b/i;
  const volumeRegex = /\b(\d+(?:\.\d+)?)\s*(L|liter|litre|ml|milliliter|cc)s?\b/i;
  const countRegex = /\b(\d+(?:\.\d+)?)\s*(pcs|pieces|piece|pack|packs|sachet|sachets|box|boxes|bottle|bottles|can|cans|pouch|pouches|bundle|bundles|tray|trays|bag|bags|sack|sacks|roll|rolls|dozen|dozens|tali|piraso|pakete)s?\b/i;
  const filipinoKiloRegex = /\b(isang|kalahating)\s+(kilo|piraso|pakete)\b/i;

  let qtyMatch: RegExpExecArray | null = null;
  let matchedQtyString = '';

  if ((qtyMatch = weightRegex.exec(rawOCRText))) {
    matchedQtyString = qtyMatch[0];
    const num = qtyMatch[1];
    const unit = qtyMatch[2].toLowerCase();
    const normalizedUnit = unit.startsWith('k') ? 'kg' : (unit.startsWith('g') ? 'g' : 'mg');
    detectedQuantity = `${num}${normalizedUnit}`;
  } else if ((qtyMatch = volumeRegex.exec(rawOCRText))) {
    matchedQtyString = qtyMatch[0];
    const num = qtyMatch[1];
    const unit = qtyMatch[2].toLowerCase();
    const normalizedUnit = unit.startsWith('m') ? 'ml' : 'L';
    detectedQuantity = `${num}${normalizedUnit}`;
  } else if ((qtyMatch = countRegex.exec(rawOCRText))) {
    matchedQtyString = qtyMatch[0];
    const num = qtyMatch[1];
    const unit = qtyMatch[2].toLowerCase();
    
    let normalizedUnit = unit;
    if (unit.startsWith('pc')) normalizedUnit = 'pcs';
    else if (unit.startsWith('pack')) normalizedUnit = 'pack';
    else if (unit.endsWith('s') && !unit.endsWith('ss')) normalizedUnit = unit.slice(0, -1);
    
    detectedQuantity = `${num} ${normalizedUnit}`;
  } else if ((qtyMatch = filipinoKiloRegex.exec(rawOCRText))) {
    matchedQtyString = qtyMatch[0];
    const numWord = qtyMatch[1].toLowerCase();
    const unitWord = qtyMatch[2].toLowerCase();
    
    let num = '1';
    if (numWord === 'kalahating') num = '0.5';
    
    let unit = 'kg';
    if (unitWord === 'piraso') unit = 'pcs';
    else if (unitWord === 'pakete') unit = 'pack';
    
    detectedQuantity = `${num}${unit}`;
  }

  // 3. Remove matched price and quantity substrings from text before extracting name
  if (matchedPriceString) {
    textForName = textForName.replace(matchedPriceString, '');
  }
  if (matchedQtyString) {
    textForName = textForName.replace(matchedQtyString, '');
  }

  // 4. Extract cleaned candidate name
  const cleanedName = extractProductName(textForName);

  return {
    name: cleanedName,
    price: detectedPrice,
    quantity: detectedQuantity,
  };
}

/**
 * Splits a quantity/unit string like "500g" or "6 pcs" into separate amount and unit.
 * E.g., "500g" -> { amount: "500", unit: "g" }
 *
 * @param quantityStr The quantity string to split.
 * @returns An object with amount and unit.
 */
export function splitQuantityString(quantityStr: string): { amount: string; unit: string } {
  if (!quantityStr) {
    return { amount: '', unit: '' };
  }

  // Matches a decimal/integer number at the start, followed by optional spaces, and the remaining unit text
  const match = quantityStr.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) {
    return {
      amount: match[1],
      unit: match[2].trim(),
    };
  }

  return { amount: '', unit: quantityStr.trim() };
}
