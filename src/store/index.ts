import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Cart,
  Store,
  CartTemplate,
  Category,
  AppSettings,
  ItemPriceHistoryEntry,
  ItemPriceHistoryMap,
} from '../types/index';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_STORES,
  DEFAULT_SETTINGS,
  SYSTEM_TEMPLATES,
  STORAGE_KEYS,
} from '@constants/index';
import {
  getStoreBreakdown,
  getMostRecentPurchase,
  getStoreStatsBreakdown,
} from '../utils/storeBreakdown';
import { generateId } from '../utils/index';
import {
  loadRemoteCarts,
  loadRemoteCategories,
  loadRemotePurchases,
  loadRemoteSettings,
  loadRemoteStores,
  loadRemoteTemplates,
  removeRemoteCart,
  removeRemoteCategory,
  removeRemoteStore,
  removeRemoteTemplate,
  syncCart,
  syncCategory,
  syncPurchases,
  syncSettings,
  syncStore,
  syncTemplate,
} from '../api/sync';

const normalizeCarts = (carts: Cart[]) => {
  const cartIds = new Set<string>();
  let changed = false;

  const normalized = carts.map((cart) => {
    let cartId = cart.id;
    if (!cartId || cartIds.has(cartId)) {
      cartId = generateId();
      changed = true;
    }
    cartIds.add(cartId);

    const itemIds = new Set<string>();
    const items = cart.items.map((item) => {
      let itemId = item.id;
      if (!itemId || itemIds.has(itemId)) {
        itemId = generateId();
        changed = true;
      }
      itemIds.add(itemId);
      return itemId === item.id ? item : { ...item, id: itemId };
    });

    return cartId === cart.id && items.every((item, index) => item === cart.items[index])
      ? cart
      : { ...cart, id: cartId, items };
  });

  return { carts: normalized, changed };
};
import { getHealth } from '../api/client';


interface GroceryStore {
  // State
  carts: Cart[];
  stores: Store[];
  templates: CartTemplate[];
  categories: Category[];
  settings: AppSettings;
  itemPriceHistory: ItemPriceHistoryMap;
  recentStoreIds: string[];
  isLoading: boolean;

  // Cart actions
  addCart: (cart: Cart) => Promise<void>;
  updateCart: (cart: Cart) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;
  getAllCarts: () => Promise<void>;

  // Store actions
  addStore: (store: Store) => Promise<void>;
  updateStore: (store: Store) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  getAllStores: () => Promise<void>;
  getStoreById: (storeId: string) => Store | undefined;
  getStoreName: (storeId?: string) => string;
  updateStoreLastUsed: (storeId: string) => Promise<void>;
  getRecentStores: () => Promise<void>;
  addRecentStore: (storeId?: string) => Promise<void>;
  buildRecentStoresFromCarts: () => Promise<void>;

  // Template actions
  addTemplate: (template: CartTemplate) => Promise<void>;
  updateTemplate: (template: CartTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getAllTemplates: () => Promise<void>;

  // Category actions
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  getAllCategories: () => Promise<void>;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  getSettings: () => Promise<void>;

  // Global item price history (accumulates across trips by item name)
  getItemPriceHistory: () => Promise<void>;
  addPriceRecord: (
    itemName: string,
    category: string,
    categoryColor: string,
    record: ItemPriceHistoryEntry
  ) => Promise<void>;
  getRecordsForItemName: (itemName: string) => ItemPriceHistoryEntry[];
  getItemStats: (itemName: string) => {
    records: ItemPriceHistoryEntry[];
    storeBreakdown: ItemPriceHistoryEntry[];
    storeStats: ReturnType<typeof getStoreStatsBreakdown>;
    lastPurchase: ItemPriceHistoryEntry | null;
    purchasedCount: number;
    totalSpent: number;
  };
  rebuildItemPriceHistoryFromCompletedCarts: () => Promise<void>;
  mergeItemPriceHistoryFromCompletedCarts: () => Promise<void>;

  // Init
  initializeStore: () => Promise<void>;
}

export const useGroceryStore = create<GroceryStore>((set, get) => ({
  carts: [],
  stores: DEFAULT_STORES,
  templates: SYSTEM_TEMPLATES,
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
  itemPriceHistory: {},
  recentStoreIds: [],
  isLoading: false,

  // Cart actions
  addCart: async (cart) => {
    try {
      const carts = [...get().carts, cart];
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
      set({ carts });
      syncCart(cart);
      if (cart.storeId) {
        await get().addRecentStore(cart.storeId);
      }
    } catch (error) {
      console.error('Error adding cart:', error);
    }
  },

  updateCart: async (cart) => {
    try {
      const carts = get().carts.map((c) => (c.id === cart.id ? cart : c));
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
      set({ carts });
      syncCart(cart);
      if (cart.storeId) {
        await get().addRecentStore(cart.storeId);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  },

  deleteCart: async (cartId) => {
    try {
      const carts = get().carts.filter((c) => c.id !== cartId);
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
      set({ carts });
      removeRemoteCart(cartId);
    } catch (error) {
      console.error('Error deleting cart:', error);
    }
  },

  getAllCarts: async () => {
    try {
      const cartsJson = await AsyncStorage.getItem(STORAGE_KEYS.CARTS);
      const loadedCarts: Cart[] = cartsJson ? JSON.parse(cartsJson) : [];
      const normalized = normalizeCarts(loadedCarts);
      const carts = normalized.carts;
      if (normalized.changed) {
        await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
      }
      set({ carts });
    } catch (error) {
      console.error('Error getting carts:', error);
    }
  },

  // Store actions
  addStore: async (store) => {
    try {
      const storesJson = await AsyncStorage.getItem(STORAGE_KEYS.STORES);
      const existing: Store[] = storesJson ? JSON.parse(storesJson) : DEFAULT_STORES;
      const stores = [...existing, store];
      await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
      set({ stores });
      syncStore(store);
    } catch (error) {
      console.error('Error adding store:', error);
    }
  },

  updateStore: async (store) => {
    try {
      const stores = get().stores.map((s) => (s.id === store.id ? store : s));
      await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
      set({ stores });
      syncStore(store);
    } catch (error) {
      console.error('Error updating store:', error);
    }
  },

  deleteStore: async (storeId) => {
    try {
      const stores = get().stores.filter((s) => s.id !== storeId);
      await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
      set({ stores });

      // Clear storeId from any carts that reference this store
      const carts = get().carts.map((c) => (c.storeId === storeId ? { ...c, storeId: undefined } : c));
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
      const recentStoreIds = get().recentStoreIds.filter((id) => id !== storeId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_STORES,
        JSON.stringify(recentStoreIds)
      );
      set({ carts, recentStoreIds });
      removeRemoteStore(storeId);
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  },

  getAllStores: async () => {
    try {
      const storesJson = await AsyncStorage.getItem(STORAGE_KEYS.STORES);
      const stores = storesJson ? JSON.parse(storesJson) : DEFAULT_STORES;
      if (!storesJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(DEFAULT_STORES));
      }
      set({ stores });
    } catch (error) {
      console.error('Error getting stores:', error);
    }
  },

  getStoreById: (storeId) => {
    return get().stores.find((s) => s.id === storeId);
  },

  getStoreName: (storeId?: string) => {
    if (!storeId) return 'Local';
    const store = get().stores.find((s) => s.id === storeId);
    return store?.name || 'Local';
  },

  updateStoreLastUsed: async (storeId) => {
    try {
      const stores = get().stores.map((s) =>
        s.id === storeId ? { ...s, lastUsedAt: new Date().toISOString() } : s
      );
      await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
      set({ stores });
      const updated = stores.find((s) => s.id === storeId);
      if (updated) {
        syncStore(updated);
      }
      await get().addRecentStore(storeId);
    } catch (error) {
      console.error('Error updating store lastUsedAt:', error);
    }
  },

  getRecentStores: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_STORES);
      const recentStoreIds: string[] = json ? JSON.parse(json) : [];
      set({ recentStoreIds });
    } catch (error) {
      console.error('Error loading recent stores:', error);
    }
  },

  addRecentStore: async (storeId) => {
    if (!storeId) return;
    try {
      const filtered = get().recentStoreIds.filter((id) => id !== storeId);
      const recentStoreIds = [storeId, ...filtered].slice(0, 5);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_STORES,
        JSON.stringify(recentStoreIds)
      );
      set({ recentStoreIds });
    } catch (error) {
      console.error('Error adding recent store:', error);
    }
  },

  buildRecentStoresFromCarts: async () => {
    if (get().recentStoreIds.length > 0) return;

    const sortedCarts = [...get().carts]
      .filter((c) => c.storeId)
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.date).getTime();
        const dateB = new Date(b.completedAt || b.date).getTime();
        return dateB - dateA;
      });

    const recentStoreIds: string[] = [];
    for (const cart of sortedCarts) {
      if (cart.storeId && !recentStoreIds.includes(cart.storeId)) {
        recentStoreIds.push(cart.storeId);
      }
      if (recentStoreIds.length >= 5) break;
    }

    if (recentStoreIds.length > 0) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_STORES,
        JSON.stringify(recentStoreIds)
      );
      set({ recentStoreIds });
    }
  },

  // Template actions
  addTemplate: async (template) => {
    try {
      const templates = [...get().templates, template];
      await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      set({ templates });
      syncTemplate(template);
    } catch (error) {
      console.error('Error adding template:', error);
    }
  },

  updateTemplate: async (template) => {
    try {
      const templates = get().templates.map((t) => (t.id === template.id ? template : t));
      await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      set({ templates });
      syncTemplate(template);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  },

  deleteTemplate: async (templateId) => {
    try {
      const templates = get().templates.filter((t) => t.id !== templateId);
      await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      set({ templates });
      removeRemoteTemplate(templateId);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  },

  getAllTemplates: async () => {
    try {
      const templatesJson = await AsyncStorage.getItem(STORAGE_KEYS.TEMPLATES);
      const templates = templatesJson ? JSON.parse(templatesJson) : SYSTEM_TEMPLATES;
      if (!templatesJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(SYSTEM_TEMPLATES));
      }
      set({ templates });
    } catch (error) {
      console.error('Error getting templates:', error);
    }
  },

  // Category actions
  addCategory: async (category) => {
    try {
      const categories = [...get().categories, category];
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      set({ categories });
      syncCategory(category);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  },

  updateCategory: async (category) => {
    try {
      const categories = get().categories.map((c) => (c.id === category.id ? category : c));
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      set({ categories });
      syncCategory(category);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const categories = get().categories.filter((c) => c.id !== categoryId);
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      set({ categories });
      removeRemoteCategory(categoryId);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  },

  getAllCategories: async () => {
    try {
      const categoriesJson = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      let categories: Category[] = categoriesJson ? JSON.parse(categoriesJson) : [...DEFAULT_CATEGORIES];
      
      const OLD_DEFAULT_CATEGORY_NAMES = [
        'grains',
        'dairy & eggs',
        'bakery',
        'meat',
        'seafood',
        'pantry',
        'snacks',
        'beverages',
        'vegetables',
        'fruits',
      ];

      let changed = false;
      if (!categoriesJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      } else {
        // Filter out any old default categories from the stored categories list
        const initialLength = categories.length;
        let cleanedCategories = categories.filter(
          (cat) => !OLD_DEFAULT_CATEGORY_NAMES.includes(cat.name.toLowerCase().trim())
        );

        if (cleanedCategories.length !== initialLength) {
          changed = true;
        }

        // Align IDs and colors for any new defaults already stored (e.g. clean up `_new` suffixes)
        cleanedCategories = cleanedCategories.map((cat) => {
          const matchingDefault = DEFAULT_CATEGORIES.find(
            (d) => d.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
          );
          if (matchingDefault) {
            if (cat.id !== matchingDefault.id || cat.color !== matchingDefault.color) {
              changed = true;
              return { ...cat, id: matchingDefault.id, color: matchingDefault.color };
            }
          }
          return cat;
        });

        // Merge missing default categories into loaded categories to ensure all 15 defaults are available
        DEFAULT_CATEGORIES.forEach((defaultCat) => {
          const existsByName = cleanedCategories.some(
            (c) => c.name.toLowerCase().trim() === defaultCat.name.toLowerCase().trim()
          );
          if (!existsByName) {
            const idExists = cleanedCategories.some((c) => c.id === defaultCat.id);
            const finalId = idExists ? `${defaultCat.id}_new` : defaultCat.id;
            cleanedCategories.push({
              ...defaultCat,
              id: finalId,
            });
            changed = true;
          }
        });
        
        if (changed) {
          categories = cleanedCategories;
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        }
      }
      
      set({ categories });
    } catch (error) {
      console.error('Error getting categories:', error);
    }
  },

  // Settings actions
  updateSettings: async (settings) => {
    try {
      const newSettings = { ...get().settings, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      set({ settings: newSettings });
      syncSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  getSettings: async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
      if (!settingsJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
      set({ settings });
    } catch (error) {
      console.error('Error getting settings:', error);
    }
  },

  getItemPriceHistory: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ITEM_PRICE_HISTORY);
      const itemPriceHistory: ItemPriceHistoryMap = json ? JSON.parse(json) : {};
      set({ itemPriceHistory });
      syncPurchases(itemPriceHistory);
    } catch (error) {
      console.error('Error loading item price history:', error);
    }
  },

  addPriceRecord: async (itemName, category, categoryColor, record) => {
    try {
      const key = itemName.toLowerCase().trim();
      const existing = get().itemPriceHistory[key];

      const itemPriceHistory: ItemPriceHistoryMap = {
        ...get().itemPriceHistory,
        [key]: {
          itemName,
          category,
          categoryColor,
          records: existing ? [...existing.records, record] : [record],
        },
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ITEM_PRICE_HISTORY,
        JSON.stringify(itemPriceHistory)
      );
      set({ itemPriceHistory });
      syncPurchases(itemPriceHistory);
    } catch (error) {
      console.error('Error adding price record:', error);
    }
  },

  getRecordsForItemName: (itemName) => {
    const key = itemName.toLowerCase().trim();
    return get().itemPriceHistory[key]?.records ?? [];
  },

  getItemStats: (itemName) => {
    const records = get().getRecordsForItemName(itemName);
    const storeBreakdown = getStoreBreakdown(records);
    const lastPurchase = getMostRecentPurchase(records);
    const totalSpent = records.reduce((sum, r) => sum + r.price, 0);

    return {
      records,
      storeBreakdown,
      storeStats: getStoreStatsBreakdown(records),
      lastPurchase,
      purchasedCount: records.length,
      totalSpent,
    };
  },

  rebuildItemPriceHistoryFromCompletedCarts: async () => {
    if (Object.keys(get().itemPriceHistory).length > 0) return;

    const itemPriceHistory: ItemPriceHistoryMap = {};

    for (const cart of get().carts.filter((c) => c.isCompleted)) {
      const storeName = get().getStoreName(cart.storeId);
      const purchasedAt = cart.completedAt || cart.date;

      for (const item of cart.items) {
        const key = item.name.toLowerCase().trim();
        const record: ItemPriceHistoryEntry = {
          storeId: cart.storeId || 'local',
          storeName,
          price: item.actualPrice ?? item.estimatedPrice,
          date: purchasedAt,
        };
        const existing = itemPriceHistory[key];
        itemPriceHistory[key] = {
          itemName: item.name,
          category: item.category,
          categoryColor: item.categoryColor,
          records: existing ? [...existing.records, record] : [record],
        };
      }
    }

    if (Object.keys(itemPriceHistory).length > 0) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ITEM_PRICE_HISTORY,
        JSON.stringify(itemPriceHistory)
      );
      set({ itemPriceHistory });
      syncPurchases(itemPriceHistory);
    }
  },

  mergeItemPriceHistoryFromCompletedCarts: async () => {
    const isDuplicate = (
      records: ItemPriceHistoryEntry[],
      record: ItemPriceHistoryEntry
    ) =>
      records.some(
        (r) =>
          r.storeId === record.storeId &&
          r.storeName === record.storeName &&
          r.price === record.price &&
          r.date === record.date
      );

    const itemPriceHistory = { ...get().itemPriceHistory };
    let changed = false;

    for (const cart of get().carts.filter((c) => c.isCompleted)) {
      const storeName = get().getStoreName(cart.storeId);
      const purchasedAt = cart.completedAt || cart.date;

      for (const item of cart.items) {
        const key = item.name.toLowerCase().trim();
        const record: ItemPriceHistoryEntry = {
          storeId: cart.storeId || 'local',
          storeName,
          price: item.actualPrice ?? item.estimatedPrice,
          date: purchasedAt,
        };
        const existing = itemPriceHistory[key];

        if (!existing) {
          itemPriceHistory[key] = {
            itemName: item.name,
            category: item.category,
            categoryColor: item.categoryColor,
            records: [record],
          };
          changed = true;
        } else if (!isDuplicate(existing.records, record)) {
          itemPriceHistory[key] = {
            ...existing,
            records: [...existing.records, record],
          };
          changed = true;
        }
      }
    }

    if (changed) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ITEM_PRICE_HISTORY,
        JSON.stringify(itemPriceHistory)
      );
      set({ itemPriceHistory });
      syncPurchases(itemPriceHistory);
    }
  },

  // Initialize store on app launch
  initializeStore: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().getAllCarts(),
        get().getAllStores(),
        get().getAllTemplates(),
        get().getAllCategories(),
        get().getSettings(),
        get().getItemPriceHistory(),
        get().getRecentStores(),
      ]);
      await get().buildRecentStoresFromCarts();
      await get().rebuildItemPriceHistoryFromCompletedCarts();
      await get().mergeItemPriceHistoryFromCompletedCarts();

      const health = await getHealth();
      if (health?.success && health.database === 'connected') {
        const [remoteCarts, remoteStores, remoteTemplates, remoteCategories, remoteSettings, remotePurchases] =
          await Promise.all([
            loadRemoteCarts(),
            loadRemoteStores(),
            loadRemoteTemplates(),
            loadRemoteCategories(),
            loadRemoteSettings(),
            loadRemotePurchases(),
          ]);

        if (remoteCarts?.data?.length) {
          const normalized = normalizeCarts(remoteCarts.data);
          await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(normalized.carts));
          set({ carts: normalized.carts });
          if (normalized.changed) {
            normalized.carts.forEach(syncCart);
          }
        } else {
          get().carts.forEach(syncCart);
        }

        if (remoteStores?.data?.length) {
          await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(remoteStores.data));
          set({ stores: remoteStores.data });
        } else {
          get().stores.forEach(syncStore);
        }

        if (remoteTemplates?.data?.length) {
          await AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(remoteTemplates.data));
          set({ templates: remoteTemplates.data });
        } else {
          get().templates.forEach(syncTemplate);
        }

        if (remoteCategories?.data?.length) {
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(remoteCategories.data));
          set({ categories: remoteCategories.data });
        } else {
          get().categories.forEach(syncCategory);
        }

        if (remoteSettings?.data) {
          const settings = { ...get().settings, ...remoteSettings.data };
          await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
          set({ settings });
        } else {
          syncSettings(get().settings);
        }

        if (remotePurchases?.data && Object.keys(remotePurchases.data).length > 0) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.ITEM_PRICE_HISTORY,
            JSON.stringify(remotePurchases.data)
          );
          set({ itemPriceHistory: remotePurchases.data });
        } else {
          syncPurchases(get().itemPriceHistory);
        }
      }
    } catch (error) {
      console.error('Error initializing store:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
