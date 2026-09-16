/**
 * Firebase Realtime Database client & fallback data layer for AapdaSetu Backend.
 * Allows all services to read & write directly to https://sihapdasetu-default-rtdb.firebaseio.com/
 */
const RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://sihapdasetu-default-rtdb.firebaseio.com';

export async function fetchCollection<T = any>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`${RTDB_URL}/${collection}.json`);
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, T> | null;
    if (!data) return [];
    return Object.entries(data).map(([key, val]) => ({
      id: key,
      ...(typeof val === 'object' && val !== null ? val : {}),
    })) as T[];
  } catch (err) {
    console.warn(`[Firebase RTDB] Failed to fetch /${collection}:`, err);
    return [];
  }
}

export async function fetchDocument<T = any>(collection: string, id: string): Promise<T | null> {
  try {
    const res = await fetch(`${RTDB_URL}/${collection}/${id}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return { id, ...data } as T;
  } catch (err) {
    console.warn(`[Firebase RTDB] Failed to fetch /${collection}/${id}:`, err);
    return null;
  }
}

export async function saveDocument<T = any>(collection: string, id: string, data: Partial<T>): Promise<T | null> {
  try {
    const res = await fetch(`${RTDB_URL}/${collection}/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data, updatedAt: new Date().toISOString() }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[Firebase RTDB] Failed to save /${collection}/${id}:`, err);
    return null;
  }
}

export async function updateDocument<T = any>(collection: string, id: string, data: Partial<T>): Promise<T | null> {
  try {
    const res = await fetch(`${RTDB_URL}/${collection}/${id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[Firebase RTDB] Failed to update /${collection}/${id}:`, err);
    return null;
  }
}
