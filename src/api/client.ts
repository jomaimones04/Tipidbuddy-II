import { API_BASE_URL, API_CONFIGURATION_ERROR } from '../config/api';

let writeQueue: Promise<void> = Promise.resolve();

const request = async <T>(
  path: string,
  options?: RequestInit,
  throwOnFailure = false
): Promise<T | null> => {
  const runRequest = async (): Promise<T | null> => {
    if (!API_BASE_URL) {
      const error = new Error(API_CONFIGURATION_ERROR);
      if (throwOnFailure) throw error;
      console.error('[API] Request skipped:', error.message);
      return null;
    }

    const requestUrl = `${API_BASE_URL}${path}`;

    try {
      const response = await fetch(requestUrl, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });
      const responseBody = await response.text();
      if (!response.ok) {
        let message = responseBody;
        try {
          const parsed = JSON.parse(responseBody) as { message?: unknown };
          if (typeof parsed.message === 'string') message = parsed.message;
        } catch {
          // Keep the response text when the server does not return JSON.
        }
        const error = new Error(
          message.slice(0, 300) ||
            `The backend returned HTTP ${response.status}.`
        );
        if (throwOnFailure) throw error;
        console.error('[API] Request failed:', path, response.status, message);
        return null;
      }
      return JSON.parse(responseBody) as T;
    } catch (error) {
      if (throwOnFailure) throw error;
      console.error('[API] Request failed:', path, error);
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
  const result = await request<{ success: boolean; data?: T }>(
    `/api/grocery-lists/${encodeURIComponent(cart.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(cart),
    },
    true
  );
  if (!result?.success) {
    throw new Error('The backend did not confirm that the trip was saved.');
  }
  return true;
};

export const persistPurchasesRemote = async (body: unknown) => {
  const result = await request<{ success: boolean }>('/api/purchases', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return Boolean(result?.success);
};

export const deleteItem = (path: string, id: string) =>
  request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const putJson = (path: string, body: unknown) =>
  request(path, { method: 'PUT', body: JSON.stringify(body) });
