import request from 'supertest';
import app from '../app';
import { createUser, createCourse, createSection, createVideo } from './helpers/db';
import { authHeader } from './helpers/auth';

describe('GET /api/data/export', () => {
  it('returns export payload with course data', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    await createVideo(section.id);

    const res = await request(app)
      .get('/api/data/export')
      .set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version', '1.0');
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body.data).toHaveProperty('courses');
    expect(res.body.data).toHaveProperty('courseSections');
    expect(res.body.data).toHaveProperty('videos');
    expect(res.body.data.courses).toHaveLength(1);
  });

  it('includes progress in export', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id, lastPositionSeconds: 30 });
    const res = await request(app).get('/api/data/export').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.userProgress).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/data/export');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/data/import', () => {
  it('imports a full export payload', async () => {
    // Build a realistic payload (no user list — sqlite mode)
    const exportPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        courseCategories: [],
        courses: [
          { id: 'c1', title: 'Imported Course', slug: 'imported-course',
            folderPath: '/videos/imported', isPublished: true,
            totalDuration: 0, tags: '[]', createdAt: new Date(), updatedAt: new Date() },
        ],
        courseSections: [
          { id: 's1', courseId: 'c1', title: 'Section 1',
            folderPath: '/videos/imported/s1', orderIndex: 0,
            createdAt: new Date(), updatedAt: new Date() },
        ],
        videos: [
          { id: 'v1', sectionId: 's1', title: 'Video 1',
            filePath: '/videos/imported/s1/v1.mp4', videoUrl: '/api/videos/stream/v1',
            durationSeconds: 60, orderIndex: 0, metadata: '{}',
            createdAt: new Date(), updatedAt: new Date() },
        ],
        videoSubtitles: [],
        userProgress: [],
      },
    };

    const res = await request(app)
      .post('/api/data/import')
      .send(exportPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported.courses).toBe(1);
    expect(res.body.imported.videos).toBe(1);
  });

  it('handles old postgres export with array tags (coerces to string)', async () => {
    // tags as array and no videos (avoids FK issues) — just testing type coercion path
    const exportPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        courseCategories: [],
        courses: [
          { id: 'c2', title: 'PG Course', slug: 'pg-course',
            folderPath: '/videos/pg', isPublished: true, totalDuration: 0,
            tags: ['javascript', 'node'],   // postgres array format — should be coerced to string
            createdAt: new Date(), updatedAt: new Date() },
        ],
        courseSections: [],
        videos: [],
        videoSubtitles: [],
        userProgress: [],
      },
    };

    const res = await request(app)
      .post('/api/data/import')
      .send(exportPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported.courses).toBe(1);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/api/data/import')
      .send({ wrongKey: true });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .post('/api/data/import')
      .send({});
    expect(res.status).toBe(400);
  });
});
