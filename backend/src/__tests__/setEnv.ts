// Runs before ANY module import so PrismaClient and config read these values.
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET   = 'test-secret-key-min-32-characters-ok';
process.env.NODE_ENV     = 'test';
process.env.AUTH_DISABLED = 'false';
process.env.VIDEO_DIRS   = '/tmp/videos';
