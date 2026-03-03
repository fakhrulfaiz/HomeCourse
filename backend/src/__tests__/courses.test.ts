import request from 'supertest';
import app from '../app';
import { createUser, createCourse, createSection, createVideo } from './helpers/db';
import { authHeader } from './helpers/auth';

describe('GET /api/courses', () => {
  it('returns published courses', async () => {
    const user = await createUser();
    await createCourse({ title: 'Course A' });
    await createCourse({ title: 'Course B', slug: 'course-b', folderPath: '/videos/b' });
    await createCourse({ title: 'Unpublished', slug: 'unpublished', folderPath: '/videos/c', isPublished: false });

    const res = await request(app).get('/api/courses').set(authHeader(user));
    expect(res.status).toBe(200);
    const titles = res.body.map((c: { title: string }) => c.title);
    expect(titles).toContain('Course A');
    expect(titles).toContain('Course B');
    expect(titles).not.toContain('Unpublished');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  it('returns tags as array', async () => {
    const user = await createUser();
    await createCourse();
    const res = await request(app).get('/api/courses').set(authHeader(user));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[0].tags)).toBe(true);
  });
});

describe('GET /api/courses/:id', () => {
  it('returns course with sections and videos', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    await createVideo(section.id);

    const res = await request(app)
      .get(`/api/courses/${course.id}`)
      .set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(course.id);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0].videos).toHaveLength(1);
  });

  it('returns 404 for unknown id', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/courses/nonexistent-id')
      .set(authHeader(user));
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const course = await createCourse();
    const res = await request(app).get(`/api/courses/${course.id}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/courses/:id/enroll', () => {
  it('enrolls a user in a course', async () => {
    const user   = await createUser();
    const course = await createCourse();

    const res = await request(app)
      .post(`/api/courses/${course.id}/enroll`)
      .set(authHeader(user));
    expect(res.status).toBe(201);
    expect(res.body.courseId).toBe(course.id);
  });

  it('returns 400 when already enrolled', async () => {
    const user   = await createUser();
    const course = await createCourse();

    await request(app).post(`/api/courses/${course.id}/enroll`).set(authHeader(user));
    const res = await request(app)
      .post(`/api/courses/${course.id}/enroll`)
      .set(authHeader(user));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already enrolled/i);
  });

  it('returns 404 for unknown course', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/courses/does-not-exist/enroll')
      .set(authHeader(user));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/courses/:id/progress', () => {
  it('returns progress when enrolled', async () => {
    const user    = await createUser();
    const course  = await createCourse();
    const section = await createSection(course.id);
    await createVideo(section.id);
    await request(app).post(`/api/courses/${course.id}/enroll`).set(authHeader(user));

    const res = await request(app)
      .get(`/api/courses/${course.id}/progress`)
      .set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('progressPercentage');
    expect(res.body).toHaveProperty('totalVideos', 1);
  });

  it('returns 404 when not enrolled', async () => {
    const user   = await createUser();
    const course = await createCourse();

    const res = await request(app)
      .get(`/api/courses/${course.id}/progress`)
      .set(authHeader(user));
    expect(res.status).toBe(404);
  });
});
