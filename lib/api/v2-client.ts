export type V2Envelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class V2ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'V2ApiError';
    this.status = status;
  }
}

export async function v2Fetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    ...init,
  });

  const json = (await response.json().catch(() => ({}))) as V2Envelope<T> & T;

  if (!response.ok || json.success === false) {
    const message =
      (typeof json === 'object' && json && 'error' in json && json.error) ||
      response.statusText ||
      'Request failed';
    throw new V2ApiError(String(message), response.status);
  }

  if (typeof json === 'object' && json !== null && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export async function v2Get<T>(path: string): Promise<T> {
  return v2Fetch<T>(path, { method: 'GET' });
}

export async function v2Post<T>(path: string, body?: unknown): Promise<T> {
  return v2Fetch<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function v2Put<T>(path: string, body?: unknown): Promise<T> {
  return v2Fetch<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function v2Patch<T>(path: string, body?: unknown): Promise<T> {
  return v2Fetch<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function v2Delete<T>(path: string): Promise<T> {
  return v2Fetch<T>(path, { method: 'DELETE' });
}
