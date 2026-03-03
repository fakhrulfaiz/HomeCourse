import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { courseService, dataService, type Course } from '@/services/api.service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Download, PlayCircle, RefreshCw, Upload } from 'lucide-react';

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setImportResult('');
    try {
      await dataService.exportData();
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    setImportResult('');
    setError('');
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setError('');
    setImportResult('');
    try {
      const result = await dataService.importData(file);
      const summary = Object.entries(result.imported)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');
      setImportResult(`Imported: ${summary || 'nothing'}`);
      await loadCourses();
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleScanVideos = async () => {
    setScanning(true);
    setError('');
    try {
      await courseService.scanVideos();
      // Reload courses after scanning
      await loadCourses();
    } catch (err: unknown) {
      setError((err as AxiosError<{error: string}>).response?.data?.error || 'Failed to scan videos');
    } finally {
      setScanning(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HomeCourse</h1>
              <p className="text-sm text-gray-600">Browse and learn from available courses</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                onClick={handleImportClick}
                disabled={importing}
                variant="outline"
                className="cursor-pointer"
              >
                <Upload className={`h-4 w-4 mr-2 ${importing ? 'animate-pulse' : ''}`} />
                {importing ? 'Importing...' : 'Import Data'}
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                className="cursor-pointer"
              >
                <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                {exporting ? 'Exporting...' : 'Export Data'}
              </Button>
              <Button
                onClick={handleScanVideos}
                disabled={scanning}
                variant="outline"
                className="cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Scan for Videos'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Courses</h2>
          <p className="text-gray-600">Choose a course to start learning</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {importResult && (
          <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6">
            {importResult}
          </div>
        )}

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground mb-4">
                No courses have been discovered yet. Click "Scan for Videos" above to scan your video directory.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      {course.level && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {course.level}
                        </span>
                      )}
                    </div>
                  </div>
                  {course.description && (
                    <CardDescription className="line-clamp-3 mt-2">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course._count?.sections || 0} sections</span>
                    </div>
                    {course.totalDuration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(course.totalDuration)}</span>
                      </div>
                    )}
                  </div>
                  {course.tags && course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {course.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link to={`/courses/${course.id}`} className="w-full">
                    <Button className="w-full cursor-pointer">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      View Course
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
