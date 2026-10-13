import { API_BASE_URL } from '../config/api';

const request = async <T>(path: string, options?: RequestInit): Promise<T | null> => {
  const requestUrl = `${API_BASE_URL}${path}`;
  const isCompleteTrip = options?.method === 'PUT' && path.startsWith('/api/grocery-lists/');

  if (isCompleteTrip) {
    console.log('[CompleteTrip] API base URL:', API_BASE_URL);
    console.log('[CompleteTrip] Request method:', options?.method || 'GET');
    console.log('[CompleteTrip] Request URL:', requestUrl);
    console.log('[CompleteTrip] Request body:', options?.body || null);
  }

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (isCompleteTrip) {
      const responseBody = await response.clone().text();
      console.log('[CompleteTrip] Backend response status:', response.status);
      console.log('[CompleteTrip] Backend response body:', responseBody);
    }
    if (!response.ok) {
      console.log('API error', path, response.status);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (isCompleteTrip) {
      console.log('[CompleteTrip] Network error:', error);
      console.log('[CompleteTrip] Cart was NOT cleared');
    }
    console.log('API unreachable', path, error);
    return null;
  }
};

export const getHealth = () =>
  request<{ success: boolean; message: string; database: string }>('/api/health');

export const testDatabase = () =>
  request<{ success: boolean; message: string }>('/api/test-db');

export const fetchList = <T>(path: string) =>
  request<{ success: boolean; data: T }>(path);

export const upsertItem = <T extends { id: string }>(path: string, item: T) =>
  request<{ success: boolean; data?: T }>(`${path}/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });

export const persistCartRemote = async <T extends { id: string }>(cart: T) => {
  console.log('[CompleteTrip] Cart ID:', cart.id);
  const cartData = cart as unknown as { items?: unknown; totalSpent?: unknown };
  console.log('[CompleteTrip] Items:', Array.isArray(cartData.items) ? cartData.items.length : 'unknown');
  console.log('[CompleteTrip] Total:', cartData.totalSpent ?? 'unknown');
  console.log('[CompleteTrip] PUT /api/grocery-lists/' + cart.id);
  const result = await upsertItem('/api/grocery-lists', cart);
  console.log('[CompleteTrip] cart Mongo result:', result ? 'saved' : 'FAILED');
  return Boolean(result?.success);
};

export const persistPurchasesRemote = async (body: unknown) => {
  console.log('[CompleteTrip] PUT /api/purchases');
  const result = await putJson('/api/purchases', body);
  console.log('[CompleteTrip] purchases Mongo result:', result ? 'saved' : 'FAILED');
  return result !== null;
};

export const deleteItem = (path: string, id: string) =>
  request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const putJson = (path: string, body: unknown) =>
  request(path, { method: 'PUT', body: JSON.stringify(body) });
