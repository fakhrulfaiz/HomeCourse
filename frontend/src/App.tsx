import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CoursesPage } from '@/pages/CoursesPage';
import { CourseDetailPage } from '@/pages/CourseDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main routes - no auth required */}
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/courses" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/courses" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
