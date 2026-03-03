import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config';

import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import videoRoutes from './routes/video.routes';
import progressRoutes from './routes/progress.routes';
import dataRoutes from './routes/data.routes';

const app: Application = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({ authDisabled: config.authDisabled });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/data', dataRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

export default app;
