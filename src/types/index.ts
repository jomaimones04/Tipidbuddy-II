// Global TypeScript types and interfaces

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  estimatedPrice: number;
  actualPrice?: number;
  isChecked: boolean;
  category: string;
  categoryColor: string;
  storeId?: string;
  priceHistory: PriceRecord[];
  lastUpdated: string;
}

export interface PriceRecord {
  storeId: string;
  storeName: string;
  price: number;
  date: string;
}

/** Single purchase record in the global item price history */
export interface ItemPriceHistoryEntry {
  storeId: string;
  storeName: string;
  price: number;
  date: string;
}

/** All purchase records for one item name (keyed by normalized name in store) */
export interface ItemPriceHistoryGroup {
  itemName: string;
  category: string;
  categoryColor: string;
  records: ItemPriceHistoryEntry[];
}

export type ItemPriceHistoryMap = Record<string, ItemPriceHistoryGroup>;

export interface Cart {
  id: string;
  name: string;
  budget: number;
  items: GroceryItem[];
  storeId?: string;
  date: string;
  isCompleted: boolean;
  completedAt?: string;
  totalSpent: number;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CartTemplate {
  id: string;
  name: string;
  isSystem: boolean;
  items: Omit<GroceryItem, 'id' | 'isChecked' | 'priceHistory'>[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatarInitials: string;
}

export interface SpendingRecap {
  cartId: string;
  totalSpent: number;
  budget: number;
  savedAmount: number;
  itemCount: number;
  categoryBreakdown: { category: string; color: string; amount: number }[];
  storeId?: string;
  date: string;
}

export interface AppSettings {
  defaultBudget: number;
  notificationsEnabled: boolean;
  isGuest: boolean;
  familyMembers: FamilyMember[];
}

export type RootStackParamList = {
  // Home tab stack
  Home: undefined;
  CartDetail: { cartId: string };
  CartForm: { cartId?: string };
  AddEditItem: { cartId: string; itemId?: string; scannedData?: any };
  VoiceInput: { cartId: string };
  CameraScanner: { cartId: string };
  PriceHistory: { itemId: string; cartId: string };
  StoreComparison: { itemId: string; cartId: string };
  SpendingRecap: { startDate?: Date; endDate?: Date; timeRange?: '7days' | 'month' };
  TripSummary: { cartId: string };
  CategoryDetail: { cartId: string; categoryName: string };
  Export: { cartId: string };
  ItemDetail: { itemId?: string; itemName?: string; cartId?: string };
  // Insights tab stack
  InsightsMain: undefined;
  // Settings tab stack
  SettingsMain: undefined;
  CategoryManager: undefined;
  FamilySharing: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  InsightsTab: undefined;
  TemplatesTab: undefined;
  SettingsTab: undefined;
};
