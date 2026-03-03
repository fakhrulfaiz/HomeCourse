import { Router, Response, Request } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

const router = Router();

// Get video by ID (no auth required)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        subtitles: true,
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json(video);
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Stream video file
router.get('/stream/*', (req: Request, res: Response): void => {
  try {
    const filePath = decodeURIComponent(req.params[0] || '');
    
    // Security check: ensure file exists and is within allowed paths
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      file.pipe(res);
    } else {
      // Stream entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Stream subtitle file
router.get('/subtitles/*', (req: Request, res: Response): void => {
  try {
    const filePath = decodeURIComponent(req.params[0] || '');
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Subtitle file not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.vtt' ? 'text/vtt' : 'application/x-subrip';

    // Set CORS headers to allow subtitle loading
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Stream subtitle error:', error);
    res.status(500).json({ error: 'Failed to stream subtitle' });
  }
});

export default router;
