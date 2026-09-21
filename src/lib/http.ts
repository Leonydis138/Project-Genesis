export interface JsonFetchOptions {
  timeoutMs?: number;
  allowEmpty?: boolean;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (!text) {
    if (response.ok) {
      return undefined as T;
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (contentType.includes('application/json') || /^[\[{]/.test(text.trim())) {
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return text as unknown as T;
}

export async function fetchJson<T>(
  input: string | URL | Request,
  init?: RequestInit,
  options: JsonFetchOptions = {},
  responseOverride?: Response
): Promise<T> {
  const { timeoutMs = 15000, allowEmpty = false } = options;

  const response = responseOverride ?? (await withTimeout(fetch(input, init), timeoutMs));

  if (!response.ok) {
    const payload = await readJsonResponse<{ error?: string; message?: string }>(response).catch(() => null);
    const message = payload?.error ?? payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (allowEmpty && response.status === 204) {
    return undefined as T;
  }

  return await readJsonResponse<T>(response);
}
