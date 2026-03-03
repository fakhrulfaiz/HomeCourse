import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import prisma from '../lib/prisma';

interface VideoFile {
  fileName: string;
  filePath: string;
  extension: string;
}

interface SubtitleFile {
  fileName: string;
  filePath: string;
  languageCode: string;
  extension: string;
}

interface SectionData {
  folderName: string;
  folderPath: string;
  videos: VideoFile[];
  subtitles: Map<string, SubtitleFile[]>; // videoFileName -> subtitles
}

interface CourseData {
  folderName: string;
  folderPath: string;
  sections: SectionData[];
}

export class VideoScannerService {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || config.videosBasePath;
  }

  /**
   * Scan the base directory for courses and videos
   */
  async scanAndSync(): Promise<void> {
    console.log(`📂 Scanning videos from: ${this.basePath}`);
    
    try {
      const courses = await this.discoverCourses();
      console.log(`✅ Found ${courses.length} courses`);

      for (const courseData of courses) {
        await this.syncCourse(courseData);
      }

      console.log('✅ Video scanning complete!');
    } catch (error) {
      console.error('❌ Error scanning videos:', error);
      throw error;
    }
  }

  /**
   * Discover all courses in the base directory
   */
  private async discoverCourses(): Promise<CourseData[]> {
    const courses: CourseData[] = [];
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      // Skip hidden folders and the video-learning-platform folder
      if (entry.name.startsWith('.') || entry.name === 'video-learning-platform') {
        continue;
      }

      const coursePath = path.join(this.basePath, entry.name);
      const sections = await this.discoverSections(coursePath);

      if (sections.length > 0) {
        courses.push({
          folderName: entry.name,
          folderPath: coursePath,
          sections,
        });
      }
    }

    return courses;
  }

  /**
   * Discover all sections (subfolders) in a course directory
   */
  private async discoverSections(coursePath: string): Promise<SectionData[]> {
    const sections: SectionData[] = [];
    
    try {
      const entries = await fs.readdir(coursePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;

        const sectionPath = path.join(coursePath, entry.name);
        const { videos, subtitles } = await this.discoverVideos(sectionPath);

        if (videos.length > 0) {
          sections.push({
            folderName: entry.name,
            folderPath: sectionPath,
            videos,
            subtitles,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read course directory: ${coursePath}`);
    }

    return sections;
  }

  /**
   * Discover all videos and subtitles in a section directory
   */
  private async discoverVideos(sectionPath: string): Promise<{
    videos: VideoFile[];
    subtitles: Map<string, SubtitleFile[]>;
  }> {
    const videos: VideoFile[] = [];
    const subtitles = new Map<string, SubtitleFile[]>();

    try {
      const entries = await fs.readdir(sectionPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase().slice(1);
        const filePath = path.join(sectionPath, entry.name);

        // Check if it's a video file
        if (config.allowedVideoFormats.includes(ext)) {
          videos.push({
            fileName: entry.name,
            filePath,
            extension: ext,
          });
        }

        // Check if it's a subtitle file
        if (['vtt', 'srt'].includes(ext)) {
          const languageCode = this.extractLanguageCode(entry.name) || 'en';
          
          // Remove language code AND extension to get base filename
          // e.g., "video.en_US.vtt" -> "video"
          let baseFileName = entry.name;
          if (languageCode) {
            // Remove .LANG.ext or .LANG_REGION.ext
            baseFileName = entry.name.replace(new RegExp(`\\.${languageCode}\\.(vtt|srt)$`, 'i'), '');
          } else {
            // Fallback: just remove extension
            baseFileName = entry.name.replace(/\.(vtt|srt)$/, '');
          }

          if (!subtitles.has(baseFileName)) {
            subtitles.set(baseFileName, []);
          }

          subtitles.get(baseFileName)!.push({
            fileName: entry.name,
            filePath,
            languageCode,
            extension: ext,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read section directory: ${sectionPath}`);
    }

    return { videos, subtitles };
  }

  /**
   * Extract language code from subtitle filename
   * Supports both 2-letter codes (en, es) and locale codes (en_US, pt_BR)
   * e.g., "video.en.vtt" -> "en", "video.en_US.vtt" -> "en_US"
   */
  private extractLanguageCode(fileName: string): string | null {
    // Try locale code first (e.g., en_US, pt_BR)
    const localeMatch = fileName.match(/\.([a-z]{2}_[A-Z]{2})\.(?:vtt|srt)$/i);
    if (localeMatch) {
      return localeMatch[1].toLowerCase();
    }
    
    // Fall back to 2-letter language code (e.g., en, es)
    const langMatch = fileName.match(/\.([a-z]{2})\.(?:vtt|srt)$/i);
    return langMatch ? langMatch[1].toLowerCase() : null;
  }

  /**
   * Sync a course and its sections/videos to the database
   */
  private async syncCourse(courseData: CourseData): Promise<void> {
    console.log(`📚 Syncing course: ${courseData.folderName}`);

    // Create or update course
    const course = await prisma.course.upsert({
      where: { folderPath: courseData.folderPath },
      update: {
        title: courseData.folderName,
        updatedAt: new Date(),
      },
      create: {
        title: courseData.folderName,
        slug: this.generateSlug(courseData.folderName),
        folderPath: courseData.folderPath,
        isPublished: true,
      },
    });

    // Sync sections
    for (let i = 0; i < courseData.sections.length; i++) {
      const sectionData = courseData.sections[i];
      await this.syncSection(course.id, sectionData, i + 1);
    }
  }

  /**
   * Sync a section and its videos to the database
   */
  private async syncSection(
    courseId: string,
    sectionData: SectionData,
    orderIndex: number
  ): Promise<void> {
    console.log(`  📁 Syncing section: ${sectionData.folderName}`);

    const section = await prisma.courseSection.upsert({
      where: {
        courseId_orderIndex: {
          courseId,
          orderIndex,
        },
      },
      update: {
        title: sectionData.folderName,
        folderPath: sectionData.folderPath,
        updatedAt: new Date(),
      },
      create: {
        courseId,
        title: sectionData.folderName,
        folderPath: sectionData.folderPath,
        orderIndex,
      },
    });

    // Sync videos
    for (let i = 0; i < sectionData.videos.length; i++) {
      const videoFile = sectionData.videos[i];
      await this.syncVideo(section.id, videoFile, i + 1, sectionData.subtitles);
    }
  }

  /**
   * Sync a video and its subtitles to the database
   */
  private async syncVideo(
    sectionId: string,
    videoFile: VideoFile,
    orderIndex: number,
    subtitlesMap: Map<string, SubtitleFile[]>
  ): Promise<void> {
    const videoTitle = path.basename(videoFile.fileName, path.extname(videoFile.fileName));
    const videoUrl = `/api/videos/stream/${encodeURIComponent(videoFile.filePath)}`;

    console.log(`    🎥 Syncing video: ${videoTitle}`);

    const video = await prisma.video.upsert({
      where: {
        sectionId_orderIndex: {
          sectionId,
          orderIndex,
        },
      },
      update: {
        title: videoTitle,
        filePath: videoFile.filePath,
        videoUrl,
        updatedAt: new Date(),
      },
      create: {
        sectionId,
        title: videoTitle,
        filePath: videoFile.filePath,
        videoUrl,
        durationSeconds: 0, // Will be updated when video metadata is extracted
        orderIndex,
      },
    });

    // Sync subtitles for this video
    const videoBaseName = path.basename(videoFile.fileName, path.extname(videoFile.fileName));
    const subtitles = subtitlesMap.get(videoBaseName) || [];

    for (const subtitle of subtitles) {
      await this.syncSubtitle(video.id, subtitle);
    }
  }

  /**
   * Sync a subtitle to the database
   */
  private async syncSubtitle(videoId: string, subtitleFile: SubtitleFile): Promise<void> {
    const subtitleUrl = `/api/videos/subtitles/${encodeURIComponent(subtitleFile.filePath)}`;

    await prisma.videoSubtitle.upsert({
      where: {
        videoId_languageCode: {
          videoId,
          languageCode: subtitleFile.languageCode,
        },
      },
      update: {
        label: subtitleFile.languageCode.toUpperCase(),
        filePath: subtitleFile.filePath,
        subtitleUrl,
      },
      create: {
        videoId,
        languageCode: subtitleFile.languageCode,
        label: subtitleFile.languageCode.toUpperCase(),
        filePath: subtitleFile.filePath,
        subtitleUrl,
        isDefault: subtitleFile.languageCode === 'en',
      },
    });
  }

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
