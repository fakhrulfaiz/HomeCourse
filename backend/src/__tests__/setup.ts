import prisma from '../lib/prisma';

// Suppress application-level console.error/warn during tests so intentional
// error-handler coverage tests (e.g. Prisma spy throwing "db down") don't
// pollute CI output. Real test failures still surface via Jest's own reporter.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Wipe all tables in dependency order before every test so suites are isolated.
beforeEach(async () => {
  await prisma.videoBookmark.deleteMany();
  await prisma.videoNote.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.userCourseEnrollment.deleteMany();
  await prisma.videoSubtitle.deleteMany();
  await prisma.video.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();
  await prisma.courseCategory.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
