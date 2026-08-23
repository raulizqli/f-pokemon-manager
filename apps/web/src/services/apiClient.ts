const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface ApiError {
  error: string;
  code?: string;
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokensUpdated?: (access: string, refresh: string) => void;
  private onLogout?: () => void;

  configure(handlers: {
    accessToken?: string | null;
    refreshToken?: string | null;
    onTokensUpdated?: (access: string, refresh: string) => void;
    onLogout?: () => void;
  }) {
    this.accessToken = handlers.accessToken ?? null;
    this.refreshToken = handlers.refreshToken ?? null;
    this.onTokensUpdated = handlers.onTokensUpdated;
    this.onLogout = handlers.onLogout;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    let response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (response.status === 401 && this.refreshToken && !path.includes('/auth/refresh')) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        response = await fetch(`${API_URL}${path}`, { ...options, headers });
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();
    if (!response.ok) {
      throw data as ApiError;
    }

    return data as T;
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const data = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      }).then((r) => r.json());

      if (data.accessToken) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.onTokensUpdated?.(data.accessToken, data.refreshToken);
        return true;
      }
    } catch {
      this.onLogout?.();
    }

    return false;
  }
}

export const apiClient = new ApiClient();
