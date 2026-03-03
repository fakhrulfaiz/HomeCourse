import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: await bcrypt.hash('demo123', 10),
      fullName: 'Demo User',
      role: 'STUDENT',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Run video scanner to discover courses
  const { VideoScannerService } = await import('../src/services/videoScanner.service');
  const scanner = new VideoScannerService();
  await scanner.scanAndSync();

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
