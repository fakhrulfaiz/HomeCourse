import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database (SQLite by default)
  databaseUrl: process.env.DATABASE_URL || 'file:/data/app.db',

  // JWT
  jwtSecret: (process.env.JWT_SECRET || 'changeme_jwt_secret_key_min_32_chars') as string,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,

  // Auth
  authDisabled: process.env.AUTH_DISABLED === 'true',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Video Libraries — comma-separated container paths, e.g. /media/lib1,/media/lib2
  // Falls back to legacy VIDEOS_BASE_PATH for backwards compatibility
  videoDirs: (() => {
    const raw = process.env.VIDEO_DIRS || process.env.VIDEOS_BASE_PATH || '/videos';
    return raw.split(',').map((d) => {
      const trimmed = d.trim();
      if (path.isAbsolute(trimmed)) return trimmed;
      return path.resolve(__dirname, '../../', trimmed);
    }).filter(Boolean);
  })(),

  // Video Processing
  maxVideoSizeMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10),
  allowedVideoFormats: (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,webm,mkv,avi,mov').split(','),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
