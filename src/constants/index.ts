import { Category, CartTemplate } from '../types/index';

// Colors
export const COLORS = {
  primary: '#2D7D46',
  accent: '#F4A123',
  danger: '#E84040',
  success: '#22C55E',
  warning: '#F59E0B',
  background: '#F9F9F6',
  darkSurface: '#1C1C1E',
  text: '#1C1C1E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

// Category colors
export const CATEGORY_COLORS = [
  '#F4A123', // Bigas at Butil (Rice & Grains) - amber
  '#E84040', // Karne at Isda (Meat, Seafood) - red
  '#10B981', // Gulay (Vegetables) - emerald
  '#F472B6', // Prutas (Fruits) - pink
  '#84CC16', // Pampalasa (Condiments & Spices) - lime
  '#EF8C4B', // Luto (Cooking Essentials) - orange
  '#06B6D4', // Pagkain sa Lata at Instant (Canned & Instant) - cyan
  '#38BDF8', // Inumin (Beverages) - blue
  '#6366F1', // Pandesal at Tinapay (Bread & Bakery) - indigo
  '#FFD166', // Dairy at Itlog (Dairy & Eggs) - yellow
  '#14B8A6', // Panlinis (Cleaning Supplies) - teal
  '#A78BFA', // Personal Care - purple
  '#EC4899', // Snacks at Meryenda (Snacks) - rose
  '#8B5CF6', // Sangkap sa Pagluluto (Specialty Cooking) - violet
  '#6B7280', // Others - gray
];

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_grains', name: 'Bigas at Butil (Rice & Grains)', color: '#F4A123' },
  { id: 'cat_meat', name: 'Karne at Isda (Meat, Poultry & Seafood)', color: '#E84040' },
  { id: 'cat_vegetables', name: 'Gulay (Vegetables)', color: '#10B981' },
  { id: 'cat_fruits', name: 'Prutas (Fruits)', color: '#F472B6' },
  { id: 'cat_spices', name: 'Pampalasa (Condiments & Spices)', color: '#84CC16' },
  { id: 'cat_cooking', name: 'Luto (Cooking Essentials)', color: '#EF8C4B' },
  { id: 'cat_canned', name: 'Pagkain sa Lata at Instant (Canned & Instant Foods)', color: '#06B6D4' },
  { id: 'cat_beverages', name: 'Inumin (Beverages)', color: '#38BDF8' },
  { id: 'cat_bakery', name: 'Pandesal at Tinapay (Bread & Bakery)', color: '#6366F1' },
  { id: 'cat_dairy', name: 'Dairy at Itlog (Dairy & Eggs)', color: '#FFD166' },
  { id: 'cat_cleaning', name: 'Panlinis (Cleaning Supplies)', color: '#14B8A6' },
  { id: 'cat_personal', name: 'Personal Care', color: '#A78BFA' },
  { id: 'cat_snacks', name: 'Snacks at Meryenda (Snacks)', color: '#EC4899' },
  { id: 'cat_specialty', name: 'Sangkap sa Pagluluto (Specialty Cooking Ingredients)', color: '#8B5CF6' },
  { id: 'cat_others', name: 'Others', color: '#6B7280' },
];

// System cart templates
export const SYSTEM_TEMPLATES: CartTemplate[] = [
  {
    id: 'tpl_weekly',
    name: 'Weekly Groceries',
    isSystem: true,
    items: [
      {
        name: 'Bigas (Rice)',
        quantity: 2,
        unit: 'kg',
        estimatedPrice: 0,
        category: 'Bigas at Butil (Rice & Grains)',
        categoryColor: '#F4A123',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Itlog (Eggs)',
        quantity: 12,
        unit: 'pcs',
        estimatedPrice: 0,
        category: 'Dairy at Itlog (Dairy & Eggs)',
        categoryColor: '#FFD166',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Tinapay (Bread)',
        quantity: 1,
        unit: 'loaf',
        estimatedPrice: 0,
        category: 'Pandesal at Tinapay (Bread & Bakery)',
        categoryColor: '#6366F1',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Manok (Chicken)',
        quantity: 1,
        unit: 'kg',
        estimatedPrice: 0,
        category: 'Karne at Isda (Meat, Poultry & Seafood)',
        categoryColor: '#E84040',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Isda (Fish)',
        quantity: 0.5,
        unit: 'kg',
        estimatedPrice: 0,
        category: 'Karne at Isda (Meat, Poultry & Seafood)',
        categoryColor: '#E84040',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Gatas (Milk)',
        quantity: 2,
        unit: 'pcs',
        estimatedPrice: 0,
        category: 'Dairy at Itlog (Dairy & Eggs)',
        categoryColor: '#FFD166',
        lastUpdated: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'tpl_monthly',
    name: 'Monthly Staples',
    isSystem: true,
    items: [
      {
        name: 'Cooking Oil',
        quantity: 1,
        unit: 'L',
        estimatedPrice: 0,
        category: 'Luto (Cooking Essentials)',
        categoryColor: '#EF8C4B',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Asin (Salt)',
        quantity: 1,
        unit: 'pack',
        estimatedPrice: 0,
        category: 'Pampalasa (Condiments & Spices)',
        categoryColor: '#84CC16',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Asukal (Sugar)',
        quantity: 1,
        unit: 'kg',
        estimatedPrice: 0,
        category: 'Pampalasa (Condiments & Spices)',
        categoryColor: '#84CC16',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Toyo (Soy Sauce)',
        quantity: 1,
        unit: 'bottle',
        estimatedPrice: 0,
        category: 'Pampalasa (Condiments & Spices)',
        categoryColor: '#84CC16',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Suka (Vinegar)',
        quantity: 1,
        unit: 'bottle',
        estimatedPrice: 0,
        category: 'Pampalasa (Condiments & Spices)',
        categoryColor: '#84CC16',
        lastUpdated: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'tpl_snacks',
    name: 'Quick Snacks',
    isSystem: true,
    items: [
      {
        name: 'Chips',
        quantity: 3,
        unit: 'pcs',
        estimatedPrice: 0,
        category: 'Snacks at Meryenda (Snacks)',
        categoryColor: '#EC4899',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Juice',
        quantity: 2,
        unit: 'pcs',
        estimatedPrice: 0,
        category: 'Inumin (Beverages)',
        categoryColor: '#38BDF8',
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Biscuits',
        quantity: 2,
        unit: 'pcs',
        estimatedPrice: 0,
        category: 'Snacks at Meryenda (Snacks)',
        categoryColor: '#EC4899',
        lastUpdated: new Date().toISOString(),
      },
    ],
  },
];

// Default stores
export const DEFAULT_STORES = [
  { id: 'store_sm', name: 'SM Hypermarket', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_puregold', name: 'Puregold', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_savemore', name: 'Savemore', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_robinsons', name: 'Robinsons', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_landmark', name: 'Landmark', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_waltermart', name: 'Waltermart', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'store_local', name: 'Local', createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
];

// Default settings
export const DEFAULT_SETTINGS = {
  defaultBudget: 1500,
  notificationsEnabled: true,
  isGuest: true,
  familyMembers: [],
};

// Fonts
export const FONTS = {
  heading: 'PlusJakartaSans-Bold',
  headingMedium: 'PlusJakartaSans-SemiBold',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  CARTS: 'grocery_budget_carts',
  STORES: 'grocery_budget_stores',
  TEMPLATES: 'grocery_budget_templates',
  CATEGORIES: 'grocery_budget_categories',
  SETTINGS: 'grocery_budget_settings',
  FAMILY: 'grocery_budget_family',
  ITEM_PRICE_HISTORY: 'itemPriceHistory',
  RECENT_STORES: 'recentStores',
};
