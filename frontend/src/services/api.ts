// ============================================================
// frontend/src/services/api.ts
//
// Cliente HTTP base. Centraliza la URL del backend y el
// manejo de errores para todos los servicios.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Wrapper sobre fetch con manejo de errores HTTP estándar.
 * Lanza ApiError si el servidor responde con status >= 400.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('rpwa-token');

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new ApiError(res.status, body.message ?? 'Error del servidor');
  }

  // 204 No Content — sin cuerpo
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}