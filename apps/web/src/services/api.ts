import type {
  AuthTokens,
  LoginInput,
  RegisterInput,
  UserProfile,
  PokemonListResponse,
  PokemonDetail,
  CollectionEntry,
  CollectionStats,
  CreateCollectionEntryInput,
  UpdateCollectionEntryInput,
  AiInsightsResponse,
} from '@pokedex/shared';
import { apiClient } from './apiClient';

export const authApi = {
  register: (input: RegisterInput) =>
    apiClient.request<AuthTokens>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: LoginInput) =>
    apiClient.request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: (refreshToken: string) =>
    apiClient.request<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  me: () => apiClient.request<UserProfile>('/api/auth/me'),
};

export const pokemonApi = {
  list: (params: { limit?: number; offset?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.search) query.set('search', params.search);
    return apiClient.request<PokemonListResponse>(`/api/pokemon?${query}`);
  },
  detail: (idOrName: string | number) =>
    apiClient.request<PokemonDetail>(`/api/pokemon/${idOrName}`),
};

export const collectionApi = {
  list: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return apiClient.request<CollectionEntry[]>(`/api/collection${query}`);
  },
  create: (input: CreateCollectionEntryInput) =>
    apiClient.request<CollectionEntry>('/api/collection', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: UpdateCollectionEntryInput) =>
    apiClient.request<CollectionEntry>(`/api/collection/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiClient.request<void>(`/api/collection/${id}`, { method: 'DELETE' }),
  stats: () => apiClient.request<CollectionStats>('/api/collection/stats'),
};

export const aiApi = {
  status: () => apiClient.request<{ enabled: boolean }>('/api/ai/status'),
  insights: () => apiClient.request<AiInsightsResponse>('/api/ai/insights', { method: 'POST' }),
};
