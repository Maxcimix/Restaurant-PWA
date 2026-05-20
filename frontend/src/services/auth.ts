const API = import.meta.env.VITE_API_URL ?? '/api';
export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(err.message ?? 'Credenciales incorrectas');
  }

  return res.json();
}

export function saveToken(token: string) {
  localStorage.setItem('rpwa-token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('rpwa-token');
}

export function removeToken() {
  localStorage.removeItem('rpwa-token');
}