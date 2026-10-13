import type { Cart, Store, CartTemplate, Category, AppSettings, ItemPriceHistoryMap } from '../types/index';
import {
  deleteItem,
  fetchList,
  persistCartRemote,
  persistPurchasesRemote,
  putJson,
  upsertItem,
} from './client';

export const syncCart = (cart: Cart) => void upsertItem('/api/grocery-lists', cart);
export const persistCompletedCart = (cart: Cart) => persistCartRemote(cart);
export const persistPurchaseHistory = (map: ItemPriceHistoryMap) =>
  persistPurchasesRemote(map);
export const removeRemoteCart = (cartId: string) => void deleteItem('/api/grocery-lists', cartId);
export const loadRemoteCarts = () => fetchList<Cart[]>('/api/grocery-lists');

export const syncStore = (store: Store) => void upsertItem('/api/stores', store);
export const removeRemoteStore = (storeId: string) => void deleteItem('/api/stores', storeId);
export const loadRemoteStores = () => fetchList<Store[]>('/api/stores');

export const syncTemplate = (template: CartTemplate) => void upsertItem('/api/templates', template);
export const removeRemoteTemplate = (id: string) => void deleteItem('/api/templates', id);
export const loadRemoteTemplates = () => fetchList<CartTemplate[]>('/api/templates');

export const syncCategory = (category: Category) => void upsertItem('/api/categories', category);
export const removeRemoteCategory = (id: string) => void deleteItem('/api/categories', id);
export const loadRemoteCategories = () => fetchList<Category[]>('/api/categories');

export const syncSettings = (settings: AppSettings) => void putJson('/api/settings', settings);
export const loadRemoteSettings = () => fetchList<AppSettings | null>('/api/settings');

export const syncPurchases = (map: ItemPriceHistoryMap) => void putJson('/api/purchases', map);
export const loadRemotePurchases = () => fetchList<ItemPriceHistoryMap>('/api/purchases');
