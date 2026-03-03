import api from '@/lib/api';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  folderPath: string;
  isPublished: boolean;
  totalDuration: number;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    sections: number;
  };
  sections?: CourseSection[];
  enrollments?: Enrollment[];
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  folderPath: string;
  orderIndex: number;
  videos: Video[];
}

export interface Video {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  filePath: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  orderIndex: number;
  subtitles: Subtitle[];
  progress?: Progress[];
}

export interface Subtitle {
  id: string;
  videoId: string;
  languageCode: string;
  label: string;
  filePath: string;
  subtitleUrl: string;
  isDefault: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  videoId: string;
  lastPositionSeconds: number;
  watchTimeSeconds: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastWatchedAt: string;
  completedAt?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progressPercentage: number;
  isCompleted: boolean;
  enrolledAt: string;
  completedAt?: string;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  progressPercentage: number;
  isCompleted: boolean;
  enrolledAt: string;
  completedAt?: string;
  totalVideos: number;
  completedVideos: number;
}

export interface RecentVideoProgress extends Progress {
  video: Video & {
    section: { course: Course };
  };
}

export interface LearningStats {
  totalVideosWatched: number;
  completedVideos: number;
  totalCoursesEnrolled: number;
  completedCourses: number;
  totalWatchTimeSeconds: number;
}

export const courseService = {
  async getCourses(): Promise<Course[]> {
    const response = await api.get('/courses');
    return response.data;
  },

  async getCourse(id: string): Promise<Course> {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  async enrollCourse(id: string): Promise<Enrollment> {
    const response = await api.post(`/courses/${id}/enroll`);
    return response.data;
  },

  async getCourseProgress(id: string): Promise<CourseProgress> {
    const response = await api.get(`/courses/${id}/progress`);
    return response.data;
  },

  async scanVideos(): Promise<void> {
    await api.post('/courses/scan');
  },
};

export const videoService = {
  async getVideo(id: string): Promise<Video> {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  getVideoStreamUrl(filePath: string): string {
    return `${api.defaults.baseURL}/videos/stream/${encodeURIComponent(filePath)}`;
  },

  getSubtitleUrl(filePath: string): string {
    return `${api.defaults.baseURL}/videos/subtitles/${encodeURIComponent(filePath)}`;
  },
};

export const dataService = {
  async exportData(): Promise<void> {
    const response = await api.get('/data/export', { responseType: 'blob' });
    const disposition: string = response.headers['content-disposition'] ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `homecourse-export-${Date.now()}.json`;
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async importData(file: File): Promise<{ imported: Record<string, number> }> {
    const text = await file.text();
    const payload = JSON.parse(text);
    const response = await api.post('/data/import', payload);
    return response.data;
  },
};

export const progressService = {
  async updateProgress(
    videoId: string,
    data: {
      lastPositionSeconds?: number;
      watchTimeSeconds?: number;
      completionPercentage?: number;
    }
  ): Promise<Progress> {
    const response = await api.post('/progress', { videoId, ...data });
    return response.data;
  },

  async getProgress(videoId: string): Promise<Progress> {
    const response = await api.get(`/progress/${videoId}`);
    return response.data;
  },

  async markComplete(videoId: string): Promise<Progress> {
    const response = await api.post(`/progress/${videoId}/complete`);
    return response.data;
  },

  async getAllProgress(): Promise<Progress[]> {
    const response = await api.get('/progress');
    return response.data;
  },

  async getRecentVideos(limit = 10): Promise<RecentVideoProgress[]> {
    const response = await api.get(`/progress/recent?limit=${limit}`);
    return response.data;
  },

  async getStats(): Promise<LearningStats> {
    const response = await api.get('/progress/stats');
    return response.data;
  },
};
