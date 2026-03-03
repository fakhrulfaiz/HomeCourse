import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// When auth is disabled, progress is written under this system user ID.
const SYSTEM_USER_ID = 'system';

// Ensure the system user row exists (needed for FK constraints when AUTH_DISABLED=true)
async function ensureSystemUser() {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},
    create: {
      id: SYSTEM_USER_ID,
      email: 'system@local',
      passwordHash: '',
      fullName: 'System',
      role: 'ADMIN',
    },
  });
}

// Get learning statistics — must be defined before GET /:videoId to avoid route shadowing
router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [totalProgress, completedVideos, enrollments, totalWatchTime] = await Promise.all([
      prisma.userProgress.count({ where: { userId } }),
      prisma.userProgress.count({ where: { userId, isCompleted: true } }),
      prisma.userCourseEnrollment.findMany({
        where: { userId },
        include: { course: { include: { _count: { select: { sections: true } } } } },
      }),
      prisma.userProgress.aggregate({ where: { userId }, _sum: { watchTimeSeconds: true } }),
    ]);

    res.json({
      totalVideosWatched: totalProgress,
      completedVideos,
      totalCoursesEnrolled: enrollments.length,
      completedCourses: enrollments.filter((e: any) => e.isCompleted).length,
      totalWatchTimeSeconds: totalWatchTime._sum.watchTimeSeconds || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get recent videos — must be defined before GET /:videoId to avoid route shadowing
router.get('/recent', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        video: { include: { section: { include: { course: true } } } },
      },
      orderBy: { lastWatchedAt: 'desc' },
      take: limit,
    });

    res.json(progress);
  } catch (error) {
    console.error('Get recent videos error:', error);
    res.status(500).json({ error: 'Failed to fetch recent videos' });
  }
});

// Update / create video progress
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId, lastPositionSeconds, watchTimeSeconds, completionPercentage } = req.body;

    if (!videoId) {
      res.status(400).json({ error: 'Video ID is required' });
      return;
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (config.authDisabled) await ensureSystemUser();
    const userId = req.user!.id;
    const isCompleted = (completionPercentage ?? 0) >= 90;

    const progress = await prisma.userProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {
        lastPositionSeconds: lastPositionSeconds ?? undefined,
        watchTimeSeconds: watchTimeSeconds ?? undefined,
        completionPercentage: completionPercentage ?? undefined,
        isCompleted,
        lastWatchedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() }),
      },
      create: {
        userId,
        videoId,
        lastPositionSeconds: lastPositionSeconds || 0,
        watchTimeSeconds: watchTimeSeconds || 0,
        completionPercentage: completionPercentage || 0,
        isCompleted,
        lastWatchedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() }),
      },
    });

    res.json(progress);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get progress for a specific video
router.get('/:videoId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const progress = await prisma.userProgress.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (!progress) {
      res.status(404).json({ error: 'No progress found for this video' });
      return;
    }

    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Mark video as completed
router.post('/:videoId/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;

    if (config.authDisabled) await ensureSystemUser();
    const userId = req.user!.id;

    const progress = await prisma.userProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { isCompleted: true, completionPercentage: 100, completedAt: new Date(), lastWatchedAt: new Date() },
      create: { userId, videoId, isCompleted: true, completionPercentage: 100, completedAt: new Date(), lastWatchedAt: new Date() },
    });

    res.json(progress);
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({ error: 'Failed to mark video as completed' });
  }
});

// Get all progress
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        video: { include: { section: { include: { course: true } } } },
      },
      orderBy: { lastWatchedAt: 'desc' },
    });

    res.json(progress);
  } catch (error) {
    console.error('Get all progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;
