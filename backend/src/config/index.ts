import path from 'path';

// Note: In Docker, environment variables are loaded by docker-compose from .env
// For local development without Docker, you can use: node -r dotenv/config src/index.ts

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://vlearn:changeme@localhost:5434/vlearn',
  
  // JWT
  jwtSecret: (process.env.JWT_SECRET || 'WbDfeEZKJbCiVdpSjrlYXtqd1X6fh1JrffNNIxavSE') as string,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  
  // Video Library
  videosBasePath: (() => {
    const rawPath = process.env.VIDEOS_BASE_PATH || '../';
    // If it's an absolute path, use it directly
    if (path.isAbsolute(rawPath)) {
      return rawPath;
    }
    // Otherwise resolve it relative to the project root (backend folder)
    return path.resolve(__dirname, '../../', rawPath);
  })(),
  
  // Video Processing
  maxVideoSizeMB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10),
  allowedVideoFormats: (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,webm,mkv,avi,mov').split(','),
  transcodeQuality: (process.env.TRANSCODE_QUALITY || '720p,480p,360p').split(','),
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
