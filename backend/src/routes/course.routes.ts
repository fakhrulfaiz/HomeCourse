import { Router, Response, Request } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all courses (no auth required)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      include: {
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID with sections and videos (no auth required)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ANONYMOUS_USER_ID = 'anonymous-user';

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            videos: {
              include: {
                subtitles: true,
                progress: {
                  where: { userId: ANONYMOUS_USER_ID },
                  take: 1,
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Enroll in a course
router.post('/:id/enroll', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: id,
        },
      },
    });

    if (existingEnrollment) {
      res.status(400).json({ error: 'Already enrolled in this course' });
      return;
    }

    // Create enrollment
    const enrollment = await prisma.userCourseEnrollment.create({
      data: {
        userId,
        courseId: id,
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// Get course progress
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const enrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: id,
        },
      },
      include: {
        course: {
          include: {
            sections: {
              include: {
                videos: {
                  include: {
                    progress: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      res.status(404).json({ error: 'Not enrolled in this course' });
      return;
    }

    // Calculate progress
    let totalVideos = 0;
    let completedVideos = 0;

    for (const section of enrollment.course.sections) {
      for (const video of section.videos) {
        totalVideos++;
        if (video.progress[0]?.isCompleted) {
          completedVideos++;
        }
      }
    }

    const progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    // Update enrollment progress
    const updatedEnrollment = await prisma.userCourseEnrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId: id,
        },
      },
      data: {
        progressPercentage,
        isCompleted: progressPercentage === 100,
        ...(progressPercentage === 100 && !enrollment.completedAt && { completedAt: new Date() }),
      },
    });

    res.json({
      ...updatedEnrollment,
      totalVideos,
      completedVideos,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Trigger video scan
router.post('/scan', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { VideoScannerService } = await import('../services/videoScanner.service');
    const scanner = new VideoScannerService();
    
    // Run scan in background
    scanner.scanAndSync().catch(console.error);

    res.json({ message: 'Video scan started' });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Failed to start video scan' });
  }
});

export default router;
