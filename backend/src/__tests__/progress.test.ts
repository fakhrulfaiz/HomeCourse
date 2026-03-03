import request from 'supertest';
import app from '../app';
import { createUser, createCourse, createSection, createVideo } from './helpers/db';
import { authHeader } from './helpers/auth';

describe('POST /api/progress', () => {
  it('creates progress for a video', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);

    const res = await request(app)
      .post('/api/progress')
      .set(authHeader(user))
      .send({ videoId: video.id, lastPositionSeconds: 30, completionPercentage: 25 });

    expect(res.status).toBe(200);
    expect(res.body.videoId).toBe(video.id);
    expect(res.body.lastPositionSeconds).toBe(30);
  });

  it('marks video completed when percentage >= 90', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);

    const res = await request(app)
      .post('/api/progress')
      .set(authHeader(user))
      .send({ videoId: video.id, completionPercentage: 95 });

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
  });

  it('upserts on second call', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id, lastPositionSeconds: 10 });
    const res = await request(app).post('/api/progress').set(headers).send({ videoId: video.id, lastPositionSeconds: 60 });

    expect(res.status).toBe(200);
    expect(res.body.lastPositionSeconds).toBe(60);
  });

  it('returns 400 when videoId is missing', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/progress')
      .set(authHeader(user))
      .send({ lastPositionSeconds: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown video', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/progress')
      .set(authHeader(user))
      .send({ videoId: 'nonexistent' });
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/progress').send({ videoId: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/progress/:videoId', () => {
  it('returns progress for a video', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id, lastPositionSeconds: 45 });
    const res = await request(app).get(`/api/progress/${video.id}`).set(headers);

    expect(res.status).toBe(200);
    expect(res.body.videoId).toBe(video.id);
  });

  it('returns 404 when no progress exists', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/progress/no-progress-video')
      .set(authHeader(user));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/progress/:videoId/complete', () => {
  it('marks video as completed', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);

    const res = await request(app)
      .post(`/api/progress/${video.id}/complete`)
      .set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
    expect(res.body.completionPercentage).toBe(100);
  });
});

describe('GET /api/progress', () => {
  it('returns all progress for the user', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id });
    const res = await request(app).get('/api/progress').set(headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/progress/stats', () => {
  it('returns learning stats', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id, completionPercentage: 100 });
    const res = await request(app).get('/api/progress/stats').set(headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalVideosWatched');
    expect(res.body).toHaveProperty('completedVideos');
    expect(res.body).toHaveProperty('totalWatchTimeSeconds');
  });
});

describe('GET /api/progress/recent', () => {
  it('returns recent videos', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    const video   = await createVideo(section.id);
    const headers = authHeader(user);

    await request(app).post('/api/progress').set(headers).send({ videoId: video.id });
    const res = await request(app).get('/api/progress/recent').set(headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
