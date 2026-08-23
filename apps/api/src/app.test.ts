import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const testEnv = {
  NODE_ENV: 'test' as const,
  PORT: 4000,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://pokedex:pokedex@localhost:5432/pokedex',
  JWT_ACCESS_SECRET: 'test-access-secret-min-16',
  JWT_REFRESH_SECRET: 'test-refresh-secret-min-16',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:5177',
  POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2',
  POKEAPI_CACHE_TTL_MS: 600_000,
  OPENAI_MODEL: 'gpt-4o-mini',
};

describe('API smoke tests', () => {
  const app = createApp(testEnv);

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/register validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/pokemon returns paginated list', async () => {
    const res = await request(app).get('/api/pokemon?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(5);
    expect(res.body.count).toBeGreaterThan(0);
  }, 15_000);

  it('GET /api/collection requires auth', async () => {
    const res = await request(app).get('/api/collection');
    expect(res.status).toBe(401);
  });
});
