import prisma from '../lib/prisma';

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
