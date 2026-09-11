import { API_BASE_URL } from '../config/api';

const request = async <T>(path: string, options?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!response.ok) {
      console.log('API error', path, response.status);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
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
  request(`${path}/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });

export const deleteItem = (path: string, id: string) =>
  request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const putJson = (path: string, body: unknown) =>
  request(path, { method: 'PUT', body: JSON.stringify(body) });
