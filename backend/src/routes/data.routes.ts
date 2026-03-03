import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/data/export — dump all tables as a downloadable JSON file
router.get('/export', async (_req: Request, res: Response) => {
  try {
    const [
      users,
      courseCategories,
      courses,
      courseSections,
      videos,
      videoSubtitles,
      userProgress,
      userCourseEnrollments,
      videoNotes,
      videoBookmarks,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.courseCategory.findMany(),
      prisma.course.findMany(),
      prisma.courseSection.findMany(),
      prisma.video.findMany(),
      prisma.videoSubtitle.findMany(),
      prisma.userProgress.findMany(),
      prisma.userCourseEnrollment.findMany(),
      prisma.videoNote.findMany(),
      prisma.videoBookmark.findMany(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users,
        courseCategories,
        courses,
        courseSections,
        videos,
        videoSubtitles,
        userProgress,
        userCourseEnrollments,
        videoNotes,
        videoBookmarks,
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="vlearn-export-${timestamp}.json"`);
    res.json(payload);
  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed', message: err.message });
  }
});

// POST /api/data/import — clear all tables and re-insert from JSON body
router.post('/import', async (req: Request, res: Response) => {
  const { data } = req.body as {
    data: {
      users?: any[];
      courseCategories?: any[];
      courses?: any[];
      courseSections?: any[];
      videos?: any[];
      videoSubtitles?: any[];
      userProgress?: any[];
      userCourseEnrollments?: any[];
      videoNotes?: any[];
      videoBookmarks?: any[];
    };
  };

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Invalid import payload. Expected { data: { ... } }.' });
    return;
  }

  try {
    // Everything runs in a single interactive transaction.
    // If any step throws, Prisma rolls back the entire operation —
    // the old data is fully restored.
    const imported = await prisma.$transaction(
      async (tx) => {
        // 1. Delete in reverse-dependency order
        await tx.videoBookmark.deleteMany();
        await tx.videoNote.deleteMany();
        await tx.userProgress.deleteMany();
        await tx.userCourseEnrollment.deleteMany();
        await tx.videoSubtitle.deleteMany();
        await tx.video.deleteMany();
        await tx.courseSection.deleteMany();
        await tx.course.deleteMany();
        await tx.user.deleteMany();
        await tx.courseCategory.deleteMany();

        // 2. Insert in dependency order
        const counts: Record<string, number> = {};

        if (data.users?.length) {
          await tx.user.createMany({ data: data.users, skipDuplicates: true });
          counts.users = data.users.length;
        }
        if (data.courseCategories?.length) {
          await tx.courseCategory.createMany({ data: data.courseCategories, skipDuplicates: true });
          counts.courseCategories = data.courseCategories.length;
        }
        if (data.courses?.length) {
          await tx.course.createMany({ data: data.courses, skipDuplicates: true });
          counts.courses = data.courses.length;
        }
        if (data.courseSections?.length) {
          await tx.courseSection.createMany({ data: data.courseSections, skipDuplicates: true });
          counts.courseSections = data.courseSections.length;
        }
        if (data.videos?.length) {
          await tx.video.createMany({ data: data.videos, skipDuplicates: true });
          counts.videos = data.videos.length;
        }
        if (data.videoSubtitles?.length) {
          await tx.videoSubtitle.createMany({ data: data.videoSubtitles, skipDuplicates: true });
          counts.videoSubtitles = data.videoSubtitles.length;
        }
        if (data.userProgress?.length) {
          await tx.userProgress.createMany({ data: data.userProgress, skipDuplicates: true });
          counts.userProgress = data.userProgress.length;
        }
        if (data.userCourseEnrollments?.length) {
          await tx.userCourseEnrollment.createMany({ data: data.userCourseEnrollments, skipDuplicates: true });
          counts.userCourseEnrollments = data.userCourseEnrollments.length;
        }
        if (data.videoNotes?.length) {
          await tx.videoNote.createMany({ data: data.videoNotes, skipDuplicates: true });
          counts.videoNotes = data.videoNotes.length;
        }
        if (data.videoBookmarks?.length) {
          await tx.videoBookmark.createMany({ data: data.videoBookmarks, skipDuplicates: true });
          counts.videoBookmarks = data.videoBookmarks.length;
        }

        return counts;
      },
      // Allow up to 2 minutes for large datasets
      { timeout: 120_000 },
    );

    res.json({ success: true, imported });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed — your existing data was not changed.', message: err.message });
  }
});

export default router;
