import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/data/export — course structure + progress scoped to current user
// (all progress when AUTH_DISABLED=true, current user's only when auth is on)
router.get('/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const progressWhere = config.authDisabled ? {} : { userId };

    const [
      courseCategories,
      courses,
      courseSections,
      videos,
      videoSubtitles,
      userProgress,
    ] = await Promise.all([
      prisma.courseCategory.findMany(),
      prisma.course.findMany(),
      prisma.courseSection.findMany(),
      prisma.video.findMany(),
      prisma.videoSubtitle.findMany(),
      prisma.userProgress.findMany({ where: progressWhere }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        courseCategories,
        courses,
        courseSections,
        videos,
        videoSubtitles,
        userProgress,
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
router.post('/import', async (req: AuthRequest, res: Response) => {
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
    // Normalise fields that changed from Json/String[] (PostgreSQL) to String (SQLite).
    // This makes old PostgreSQL exports transparently importable.
    const toStr = (v: unknown, fallback: string) =>
      typeof v === 'string' ? v : JSON.stringify(v ?? JSON.parse(fallback));

    const normalisedUsers = (data.users ?? []).map((u) => ({
      ...u,
      preferences: toStr(u.preferences, '{}'),
    }));
    const normalisedCourses = (data.courses ?? []).map((c) => ({
      ...c,
      tags: toStr(c.tags, '[]'),
    }));
    const normalisedVideos = (data.videos ?? []).map((v) => ({
      ...v,
      metadata: toStr(v.metadata, '{}'),
    }));

    // When auth is disabled there is a single system user — remap all imported
    // progress (and related records) to that user so queries by req.user.id
    // ('system') find everything without needing a special no-filter path.
    const effectiveUserId = config.authDisabled ? 'system' : null;
    const remapUser = (r: any) =>
      effectiveUserId ? { ...r, userId: effectiveUserId } : r;

    // Remap userId then deduplicate by videoId — two old users may have watched
    // the same video, which after remapping to 'system' would violate the
    // unique(userId, videoId) constraint. Keep the most recently watched record.
    const rawProgress = (data.userProgress ?? []).map(remapUser);
    const progressByVideo = new Map<string, any>();
    for (const p of rawProgress) {
      const existing = progressByVideo.get(p.videoId);
      if (!existing || new Date(p.lastWatchedAt) > new Date(existing.lastWatchedAt)) {
        progressByVideo.set(p.videoId, p);
      }
    }
    const normalisedProgress = Array.from(progressByVideo.values());

    // Same dedup for enrollments (unique userId+courseId)
    const rawEnrollments = (data.userCourseEnrollments ?? []).map(remapUser);
    const enrollmentByCourse = new Map<string, any>();
    for (const e of rawEnrollments) {
      if (!enrollmentByCourse.has(e.courseId)) enrollmentByCourse.set(e.courseId, e);
    }
    const normalisedEnrollments = Array.from(enrollmentByCourse.values());

    const normalisedNotes = (data.videoNotes ?? []).map(remapUser);
    const normalisedBookmarks = (data.videoBookmarks ?? []).map(remapUser);

    // When auth is disabled, ensure the system user row exists before the
    // transaction so the remapped progress records pass the FK constraint.
    if (config.authDisabled) {
      await prisma.user.upsert({
        where: { id: 'system' },
        update: {},
        create: { id: 'system', email: 'system@local', passwordHash: '', fullName: 'System', role: 'ADMIN' },
      });
    }

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
        // When auth is disabled we don't import old user accounts — the system
        // user was already upserted above outside the transaction.
        if (!config.authDisabled) await tx.user.deleteMany();
        await tx.courseCategory.deleteMany();

        // 2. Insert in dependency order
        const counts: Record<string, number> = {};

        if (!config.authDisabled && normalisedUsers.length) {
          await tx.user.createMany({ data: normalisedUsers });
          counts.users = normalisedUsers.length;
        }
        if (data.courseCategories?.length) {
          await tx.courseCategory.createMany({ data: data.courseCategories });
          counts.courseCategories = data.courseCategories.length;
        }
        if (normalisedCourses.length) {
          await tx.course.createMany({ data: normalisedCourses });
          counts.courses = normalisedCourses.length;
        }
        if (data.courseSections?.length) {
          await tx.courseSection.createMany({ data: data.courseSections });
          counts.courseSections = data.courseSections.length;
        }
        if (normalisedVideos.length) {
          await tx.video.createMany({ data: normalisedVideos });
          counts.videos = normalisedVideos.length;
        }
        if (data.videoSubtitles?.length) {
          await tx.videoSubtitle.createMany({ data: data.videoSubtitles });
          counts.videoSubtitles = data.videoSubtitles.length;
        }
        if (normalisedProgress.length) {
          await tx.userProgress.createMany({ data: normalisedProgress });
          counts.userProgress = normalisedProgress.length;
        }
        if (normalisedEnrollments.length) {
          await tx.userCourseEnrollment.createMany({ data: normalisedEnrollments });
          counts.userCourseEnrollments = normalisedEnrollments.length;
        }
        if (normalisedNotes.length) {
          await tx.videoNote.createMany({ data: normalisedNotes });
          counts.videoNotes = normalisedNotes.length;
        }
        if (normalisedBookmarks.length) {
          await tx.videoBookmark.createMany({ data: normalisedBookmarks });
          counts.videoBookmarks = normalisedBookmarks.length;
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
