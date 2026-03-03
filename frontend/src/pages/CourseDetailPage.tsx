import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { courseService, videoService, progressService, type Course, type CourseSection, type Video } from '@/services/api.service';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Menu, Clock, ChevronDown } from 'lucide-react';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [enrolled, setEnrolled] = useState(true); // Auto-enrolled for no-auth mode
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const loadCourse = useCallback(async () => {
    try {
      const data = await courseService.getCourse(courseId!);
      setCourse(data);

      const completed = new Set<string>();
      data.sections?.forEach(section => {
        section.videos.forEach(video => {
          if (video.progress && video.progress.length > 0 && video.progress[0].isCompleted) {
            completed.add(video.id);
          }
        });
      });
      setCompletedVideos(completed);
      setExpandedSections(new Set());

      if (data.sections && data.sections.length > 0) {
        const firstSection = data.sections[0];
        if (firstSection.videos && firstSection.videos.length > 0) {
          setCurrentVideo(firstSection.videos[0]);
        }
      }
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId, loadCourse]);

  // Auto-show sidebar when window becomes wide (lg breakpoint = 1024px).
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEnroll = async () => {
    try {
      await courseService.enrollCourse(courseId!);
      setEnrolled(true);
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Failed to enroll');
    }
  };

  const handleVideoSelect = (video: Video) => {
    setCurrentVideo(video);
  };

  const handleNextVideo = () => {
    if (!course || !currentVideo) return;

    let found = false;
    for (const section of course.sections || []) {
      for (const video of section.videos) {
        if (found) {
          setCurrentVideo(video);
          return;
        }
        if (video.id === currentVideo.id) {
          found = true;
        }
      }
    }
  };

  const handlePreviousVideo = () => {
    if (!course || !currentVideo) return;

    let previousVideo: Video | null = null;
    for (const section of course.sections || []) {
      for (const video of section.videos) {
        if (video.id === currentVideo.id && previousVideo) {
          setCurrentVideo(previousVideo);
          return;
        }
        previousVideo = video;
      }
    }
  };

  const isVideoCompleted = (videoId: string) => {
    return completedVideos.has(videoId);
  };

  const toggleVideoCompletion = async (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (completedVideos.has(video.id)) {
        // Unmark as complete - update progress to 0%
        await progressService.updateProgress(video.id, {
          lastPositionSeconds: 0,
          watchTimeSeconds: 0,
          completionPercentage: 0,
        });
        setCompletedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(video.id);
          return newSet;
        });
      } else {
        // Mark as complete
        await progressService.markComplete(video.id);
        setCompletedVideos(prev => new Set(prev).add(video.id));
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const getVideoProgress = (video: Video) => {
    if (video.progress && video.progress.length > 0) {
      return video.progress[0].lastPositionSeconds;
    }
    return 0;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSectionDuration = (seconds: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getSectionProgress = (section: CourseSection) => {
    const totalVideos = section.videos.length;
    const completedCount = section.videos.filter((video: Video) => 
      completedVideos.has(video.id)
    ).length;
    
    // Calculate total section duration
    const totalDuration = section.videos.reduce((sum: number, video: Video) => 
      sum + (video.durationSeconds || 0), 0
    );
    
    return { 
      completed: completedCount, 
      total: totalVideos,
      duration: totalDuration
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
            <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
            {course.description && (
              <p className="text-muted-foreground mb-6">{course.description}</p>
            )}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/courses')}>
                Back to Courses
              </Button>
              <Button onClick={handleEnroll}>Enroll Now</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/courses')}
              className="text-gray-300 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-lg font-semibold text-white truncate max-w-md">
              {course.title}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-300 hover:text-white"
            title={sidebarOpen ? 'Hide course content' : 'Show course content'}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Video Player */}
        <div className="flex-1">
          <div className="bg-black">
            {currentVideo ? (
              <>
                {(() => {
                  const subtitleData = currentVideo.subtitles.map((sub) => ({
                    src: videoService.getSubtitleUrl(sub.filePath),
                    // Normalize language code: en_us -> en-US (Video.js standard format)
                    srclang: sub.languageCode.toLowerCase().replace('_', '-'),
                    label: sub.label,
                    default: sub.isDefault,
                  }));
                  
                  console.log('[CourseDetailPage] Current video:', currentVideo.title);
                  console.log('[CourseDetailPage] Raw subtitles:', currentVideo.subtitles);
                  console.log('[CourseDetailPage] Transformed subtitles:', subtitleData);
                  
                  return (
                    <VideoPlayer
                      videoId={currentVideo.id}
                      src={videoService.getVideoStreamUrl(currentVideo.filePath)}
                      subtitles={subtitleData}
                      initialTime={getVideoProgress(currentVideo)}
                      onEnded={handleNextVideo}
                    />
                  );
                })()}
              </>
            ) : (
              <div className="aspect-video flex items-center justify-center text-gray-400">
                No video selected
              </div>
            )}
          </div>

          {/* Video Info & Controls */}
          <div className="bg-gray-800 p-4">
            <h2 className="text-xl font-semibold text-white mb-2">
              {currentVideo?.title}
            </h2>
            {currentVideo?.description && (
              <p className="text-gray-400 text-sm mb-4">{currentVideo.description}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousVideo}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextVideo}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto max-h-screen custom-scrollbar">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Course Content</h3>
              <div className="space-y-4">
                {course.sections?.map((section) => {
                  const progress = getSectionProgress(section);
                  return (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-start justify-between text-left text-sm font-medium text-gray-300 mb-2 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-700"
                      title={section.title}
                    >
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="truncate w-full text-left">{section.title}</span>
                        <span className="text-xs text-gray-500 font-normal mt-1 text-left">
                          {progress.completed}/{progress.total} {progress.duration > 0 && `| ${formatSectionDuration(progress.duration)}`}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 ml-2 transition-transform duration-200 ${
                          expandedSections.has(section.id) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedSections.has(section.id) && (
                      <div className="space-y-1">
                      {section.videos.map((video, videoIndex) => (
                        <button
                          key={video.id}
                          onClick={() => handleVideoSelect(video)}
                          className={`w-full text-left px-3 py-3 rounded text-sm transition-colors ${
                            currentVideo?.id === video.id
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              onClick={(e) => toggleVideoCompletion(video, e)}
                              className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform cursor-pointer"
                              title={isVideoCompleted(video.id) ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              {isVideoCompleted(video.id) ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">
                                {videoIndex + 1}. {video.title}
                              </div>
                              {video.durationSeconds > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDuration(video.durationSeconds)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
