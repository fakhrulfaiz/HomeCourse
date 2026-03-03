import request from 'supertest';
import app from '../app';
import { createUser } from './helpers/db';
import { authHeader } from './helpers/auth';

describe('POST /api/auth/register', () => {
  it('creates a user and returns token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      password: 'password123',
      fullName: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@example.com');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when email already exists', async () => {
    await createUser({ email: 'dupe@example.com' });
    const res = await request(app).post('/api/auth/register').send({
      email: 'dupe@example.com',
      password: 'password123',
      fullName: 'Dupe',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token on valid credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'secret' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'secret',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'pass',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    await createUser({ email: 'wp@example.com', password: 'correct' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'wp@example.com',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user data with valid token', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set({ Authorization: 'Bearer bad.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/me', () => {
  it('updates user fullName', async () => {
    const user = await createUser();
    const res = await request(app)
      .put('/api/auth/me')
      .set(authHeader(user))
      .send({ fullName: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Updated Name');
  });

  it('updates preferences as object', async () => {
    const user = await createUser();
    const res = await request(app)
      .put('/api/auth/me')
      .set(authHeader(user))
      .send({ preferences: { theme: 'dark' } });
    expect(res.status).toBe(200);
    expect(res.body.preferences.theme).toBe('dark');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/config', () => {
  it('returns authDisabled flag', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('authDisabled');
  });
});
