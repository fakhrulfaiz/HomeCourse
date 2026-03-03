import { Router, Response, Request } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Anonymous user ID for no-auth mode
const ANONYMOUS_USER_ID = 'anonymous-user';

// Ensure anonymous user exists
async function ensureAnonymousUser() {
  await prisma.user.upsert({
    where: { id: ANONYMOUS_USER_ID },
    update: {},
    create: {
      id: ANONYMOUS_USER_ID,
      email: 'anonymous@local',
      passwordHash: '',
      fullName: 'Anonymous User',
    },
  });
}

// Update video progress (no auth required)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const { videoId, lastPositionSeconds, watchTimeSeconds, completionPercentage } = req.body;
    const userId = ANONYMOUS_USER_ID;

    // Validate input
    if (!videoId) {
      res.status(400).json({ error: 'Video ID is required' });
      return;
    }

    // Check if video exists
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Determine if completed (>= 90% watched)
    const isCompleted = completionPercentage >= 90;

    // Update or create progress
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
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

// Get user's progress for a video (no auth required)
router.get('/:videoId', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const { videoId } = req.params;
    const userId = ANONYMOUS_USER_ID;

    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
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

// Mark video as completed (no auth required)
router.post('/:videoId/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const { videoId } = req.params;
    const userId = ANONYMOUS_USER_ID;

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        isCompleted: true,
        completionPercentage: 100,
        completedAt: new Date(),
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        videoId,
        isCompleted: true,
        completionPercentage: 100,
        completedAt: new Date(),
        lastWatchedAt: new Date(),
      },
    });

    res.json(progress);
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({ error: 'Failed to mark video as completed' });
  }
});

// Get all progress for current user (no auth required)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const userId = ANONYMOUS_USER_ID;

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: { lastWatchedAt: 'desc' },
    });

    res.json(progress);
  } catch (error) {
    console.error('Get all progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get recent videos (no auth required)
router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const userId = ANONYMOUS_USER_ID;
    const limit = parseInt(req.query.limit as string) || 10;

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
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

// Get learning statistics (no auth required)
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureAnonymousUser();
    const userId = ANONYMOUS_USER_ID;

    const [totalProgress, completedVideos, enrollments] = await Promise.all([
      prisma.userProgress.count({ where: { userId } }),
      prisma.userProgress.count({ where: { userId, isCompleted: true } }),
      prisma.userCourseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              _count: {
                select: { sections: true },
              },
            },
          },
        },
      }),
    ]);

    const totalWatchTime = await prisma.userProgress.aggregate({
      where: { userId },
      _sum: { watchTimeSeconds: true },
    });

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

export default router;
