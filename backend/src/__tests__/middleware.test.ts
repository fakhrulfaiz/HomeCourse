import request from 'supertest';
import app from '../app';
import { config } from '../config';
import { createUser, createCourse, createSection, createVideo } from './helpers/db';
import { authHeader, makeToken } from './helpers/auth';

// ── AUTH_DISABLED bypass ──────────────────────────────────────────────────────

describe('authenticate middleware — AUTH_DISABLED=true', () => {
  beforeEach(() => { config.authDisabled = true; });
  afterEach(() => { config.authDisabled = false; });

  it('allows requests with no token when auth is disabled', async () => {
    await createCourse();
    const res = await request(app).get('/api/courses');
    // Should reach the route handler (200), not bounce with 401
    expect(res.status).toBe(200);
  });

  it('sets user to system when auth is disabled', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.authDisabled).toBe(true);
  });
});

// ── Deleted-user token (valid JWT but user row removed) ───────────────────────

describe('authenticate middleware — user removed after token issued', () => {
  it('returns 401 when the user no longer exists in the DB', async () => {
    const user = await createUser({ email: 'ghost@example.com' });
    const headers = authHeader(user);

    // Simulate user deletion
    const prisma = (await import('../lib/prisma')).default;
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get('/api/auth/me').set(headers);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ── authorize helper ──────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  it('blocks a STUDENT from an ADMIN-only route when used inline', async () => {
    // authorize is imported and used directly to verify it works
    const { authorize } = await import('../middleware/auth.middleware');
    const mockReq: any = { user: { id: '1', email: 'x@x.com', role: 'STUDENT' } };
    const mockRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    authorize('ADMIN')(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('allows a user with the right role', async () => {
    const { authorize } = await import('../middleware/auth.middleware');
    const mockReq: any = { user: { id: '1', email: 'x@x.com', role: 'ADMIN' } };
    const mockRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    authorize('ADMIN')(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('returns 401 when no user is attached to request', async () => {
    const { authorize } = await import('../middleware/auth.middleware');
    const mockReq: any = {};
    const mockRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();

    authorize('ADMIN')(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

// ── video routes ──────────────────────────────────────────────────────────────

describe('GET /api/videos/:id', () => {
  it('returns video with section and subtitles', async () => {
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);

    const res = await request(app).get(`/api/videos/${video.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(video.id);
    expect(res.body.section).toBeDefined();
  });

  it('returns 404 for unknown video id', async () => {
    const res = await request(app).get('/api/videos/does-not-exist');
    expect(res.status).toBe(404);
  });
});

// ── stream endpoint 404 ───────────────────────────────────────────────────────

describe('GET /api/videos/stream/*', () => {
  it('returns 404 when the video file does not exist on disk', async () => {
    const res = await request(app).get('/api/videos/stream/%2Ftmp%2Fnonexistent.mp4');
    expect(res.status).toBe(404);
  });
});

// ── subtitle endpoint 404 ─────────────────────────────────────────────────────

describe('GET /api/videos/subtitles/*', () => {
  it('returns 404 when the subtitle file does not exist on disk', async () => {
    const res = await request(app).get('/api/videos/subtitles/%2Ftmp%2Fnone.vtt');
    expect(res.status).toBe(404);
  });
});

// ── token edge cases ──────────────────────────────────────────────────────────

describe('authenticate middleware — malformed tokens', () => {
  it('returns 401 for a completely invalid token string', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set({ Authorization: 'Bearer not.a.jwt' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const user = await createUser({ email: 'exp@example.com' });
    // Sign with 0s expiry so it is immediately expired
    const jwt = await import('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: 1 } // 1 second
    );
    // Wait just over 1 second to ensure expiry
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app)
      .get('/api/auth/me')
      .set({ Authorization: `Bearer ${expiredToken}` });
    expect(res.status).toBe(401);
  });
});
