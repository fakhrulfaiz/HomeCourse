import bcrypt from 'bcryptjs';
import { config } from './config';
import prisma from './lib/prisma';
import app from './app';

async function bootstrap() {
  if (config.adminEmail && config.adminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: config.adminEmail } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(config.adminPassword, 10);
      await prisma.user.create({
        data: { email: config.adminEmail, passwordHash, fullName: 'Admin', role: 'ADMIN' },
      });
      console.log(`✅ Admin user created: ${config.adminEmail}`);
    }
  }

  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Video directories: ${config.videoDirs.join(', ')}`);
    console.log(`🔐 Auth: ${config.authDisabled ? 'DISABLED' : 'enabled'}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
  });
}

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
