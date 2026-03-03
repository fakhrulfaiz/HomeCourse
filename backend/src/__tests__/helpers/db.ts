import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';

// ── Users ─────────────────────────────────────────────────────────────────────

export async function createUser(overrides: Partial<{
  email: string;
  password: string;
  fullName: string;
  role: string;
}> = {}) {
  const email    = overrides.email    ?? 'test@example.com';
  const password = overrides.password ?? 'password123';
  const fullName = overrides.fullName ?? 'Test User';
  const role     = overrides.role     ?? 'STUDENT';

  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 1), // cost=1 to keep tests fast
      fullName,
      role,
    },
  });
}

// ── Courses ───────────────────────────────────────────────────────────────────

export async function createCourse(overrides: Partial<{
  title: string;
  slug: string;
  folderPath: string;
  isPublished: boolean;
}> = {}) {
  return prisma.course.create({
    data: {
      title:       overrides.title       ?? 'Test Course',
      slug:        overrides.slug        ?? 'test-course',
      folderPath:  overrides.folderPath  ?? '/videos/test-course',
      isPublished: overrides.isPublished ?? true,
      tags:        '[]',
    },
  });
}

export async function createSection(courseId: string, orderIndex = 0) {
  return prisma.courseSection.create({
    data: {
      courseId,
      title:      'Section 1',
      folderPath: '/videos/test-course/section-1',
      orderIndex,
    },
  });
}

export async function createVideo(sectionId: string, orderIndex = 0) {
  return prisma.video.create({
    data: {
      sectionId,
      title:           'Test Video',
      filePath:        '/videos/test-course/section-1/video.mp4',
      videoUrl:        '/api/videos/stream/fake-id',
      durationSeconds: 120,
      orderIndex,
      metadata:        '{}',
    },
  });
}
