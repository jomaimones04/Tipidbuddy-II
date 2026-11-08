import { API_BASE_URL } from '../config/api';

let writeQueue: Promise<void> = Promise.resolve();

const request = async <T>(
  path: string,
  options?: RequestInit
): Promise<T | null> => {
  const runRequest = async (): Promise<T | null> => {
    const requestUrl = `${API_BASE_URL}${path}`;
    const isCompleteTrip =
      options?.method === 'PUT' && path.startsWith('/api/grocery-lists/');
    const isPriceHistorySave =
      options?.method === 'PUT' && path === '/api/purchases';

    if (isCompleteTrip) {
      console.log('[CompleteTrip] API base URL:', API_BASE_URL);
      console.log('[CompleteTrip] Request method:', options?.method || 'GET');
      console.log('[CompleteTrip] Request URL:', requestUrl);
    }
    if (isPriceHistorySave) {
      let historyKeys = 0;
      try {
        historyKeys = Object.keys(
          JSON.parse(String(options.body || '{}'))
        ).length;
      } catch (error) {
        console.error(
          '[PriceHistory] Could not inspect request payload:',
          error
        );
      }
      console.log('[PriceHistory] Saving history keys:', historyKeys);
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
      const responseBody = await response.text();
      if (isCompleteTrip || isPriceHistorySave) {
        const logPrefix = isCompleteTrip ? '[CompleteTrip]' : '[PriceHistory]';
        console.log(`${logPrefix} Backend response status:`, response.status);
        if (!response.ok)
          console.error(`${logPrefix} Backend error response:`, responseBody);
      }
      if (!response.ok) {
        console.error(
          isPriceHistorySave
            ? '[PriceHistory] API request failed:'
            : isCompleteTrip
              ? '[CompleteTrip] API request failed:'
              : '[API] Request failed:',
          path,
          response.status,
          responseBody
        );
        return null;
      }
      return JSON.parse(responseBody) as T;
    } catch (error) {
      if (isCompleteTrip) {
        console.log('[CompleteTrip] Network error:', error);
        console.log('[CompleteTrip] Cart was NOT cleared');
      }
      if (isPriceHistorySave) {
        console.error('[PriceHistory] Network error:', error);
      }
      console.log('API unreachable', path, error);
      return null;
    }
  };

  if (!options?.method || options.method.toUpperCase() === 'GET') {
    return runRequest();
  }

  const queuedRequest = writeQueue.then(runRequest, runRequest);
  writeQueue = queuedRequest.then(
    () => undefined,
    () => undefined
  );
  return queuedRequest;
};

export const getHealth = () =>
  request<{ success: boolean; message: string; database: string }>(
    '/api/health'
  );

export const testDatabase = () =>
  request<{ success: boolean; message: string }>('/api/test-db');

export const fetchList = <T>(path: string) =>
  request<{ success: boolean; data: T }>(path);

export const upsertItem = <T extends { id: string }>(path: string, item: T) =>
  request<{ success: boolean; data?: T }>(
    `${path}/${encodeURIComponent(item.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(item),
    }
  );

export const persistCartRemote = async <T extends { id: string }>(cart: T) => {
  console.log('[CompleteTrip] Cart ID:', cart.id);
  const cartData = cart as unknown as { items?: unknown; totalSpent?: unknown };
  console.log(
    '[CompleteTrip] Items:',
    Array.isArray(cartData.items) ? cartData.items.length : 'unknown'
  );
  console.log('[CompleteTrip] Total:', cartData.totalSpent ?? 'unknown');
  console.log('[CompleteTrip] PUT /api/grocery-lists/' + cart.id);
  const result = await upsertItem('/api/grocery-lists', cart);
  console.log('[CompleteTrip] cart Mongo result:', result ? 'saved' : 'FAILED');
  return Boolean(result?.success);
};

export const persistPurchasesRemote = async (body: unknown) => {
  console.log('[PriceHistory] PUT /api/purchases');
  const result = await request<{ success: boolean }>('/api/purchases', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  console.log(
    '[PriceHistory] Mongo result:',
    result?.success ? 'saved' : 'FAILED'
  );
  return Boolean(result?.success);
};

export const deleteItem = (path: string, id: string) =>
  request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const putJson = (path: string, body: unknown) =>
  request(path, { method: 'PUT', body: JSON.stringify(body) });
