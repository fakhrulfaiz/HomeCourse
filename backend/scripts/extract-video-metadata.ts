import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from '../src/lib/prisma';

const execAsync = promisify(exec);

interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  bitrate: number;
}

/**
 * Extract video metadata using ffprobe
 * Requires ffmpeg/ffprobe to be installed on the system
 */
async function extractVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    
    if (!videoStream || !data.format) {
      return null;
    }

    return {
      duration: parseFloat(data.format.duration) || 0,
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      bitrate: parseInt(data.format.bit_rate) || 0,
    };
  } catch (error) {
    console.error(`Failed to extract metadata for ${filePath}:`, error);
    return null;
  }
}

/**
 * Update all videos in the database with metadata
 */
async function updateAllVideoMetadata() {
  console.log('🎬 Starting video metadata extraction...\n');

  const videos = await prisma.video.findMany({
    where: {
      durationSeconds: 0, // Only update videos without duration
    },
  });

  console.log(`Found ${videos.length} videos to process\n`);

  let successCount = 0;
  let failCount = 0;

  for (const video of videos) {
    console.log(`Processing: ${video.title}`);
    
    const metadata = await extractVideoMetadata(video.filePath);
    
    if (metadata) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          durationSeconds: Math.floor(metadata.duration),
        },
      });
      
      console.log(`  ✅ Duration: ${Math.floor(metadata.duration)}s (${formatDuration(metadata.duration)})`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to extract metadata`);
      failCount++;
    }
  }

  console.log(`\n✅ Complete! Success: ${successCount}, Failed: ${failCount}`);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Run the script
updateAllVideoMetadata()
  .then(() => {
    console.log('\n🎉 Metadata extraction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
