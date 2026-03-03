# 🎓 Video Learning Platform - Complete Full-Stack Application

A modern, self-hosted video learning platform built with React, Node.js, Express, and PostgreSQL. Features include video streaming, progress tracking, course management, and a beautiful UI.

## ✨ Features

### 🎥 Video Player
- **Video.js Integration**: Professional video player with full controls
- **Subtitle Support**: Multi-language subtitles (.vtt, .srt)
- **Progress Tracking**: Automatic save of watch position
- **Keyboard Shortcuts**: Full keyboard navigation
- **Playback Speed**: 0.5x to 2x speed control
- **Seeking**: HTTP range requests for instant seeking

### 📚 Course Management
- **Auto-Discovery**: Scans file system for courses
- **Course Structure**: Courses → Sections → Videos
- **Enrollment System**: Track enrolled courses
- **Progress Dashboard**: View completion status
- **Course Navigation**: Easy section/video navigation

### 🔐 Authentication
- **JWT Authentication**: Secure token-based auth
- **User Registration**: Create new accounts
- **Protected Routes**: Secure course access
- **Persistent Sessions**: Stay logged in

### 📊 Progress Tracking
- **Watch Time**: Track total watch time
- **Completion**: Auto-complete at 90%
- **Resume**: Continue where you left off
- **Statistics**: Learning analytics dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Automated Startup (Recommended)

**Windows PowerShell**:
```powershell
# Right-click start.ps1 and select "Run with PowerShell"
# Or run from terminal:
.\start.ps1
```

**Windows Command Prompt**:
```cmd
start.bat
```

The script will:
1. ✅ Check if Docker is running
2. ✅ Start PostgreSQL and Redis containers
3. ✅ Wait for database to be ready
4. ✅ Install dependencies (if needed)
5. ✅ Start backend server (http://localhost:3000)
6. ✅ Start frontend server (http://localhost:5173)

**To stop**:
```powershell
.\stop.ps1   # PowerShell
stop.bat     # Command Prompt
```

---

### Manual Installation

1. **Clone and Install**
```bash
cd "E:/Learning Videos/video-learning-platform"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Setup Database**
```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Or use your existing PostgreSQL instance
# Update DATABASE_URL in .env
```

3. **Configure Environment**
```bash
# Copy environment template
cp .env.example .env

# Update .env with your settings
# Key variables:
# - DATABASE_URL
# - JWT_SECRET
# - VIDEOS_BASE_PATH
```

4. **Initialize Database**
```bash
cd backend

# Push database schema
npm run db:push

# Seed with demo user
npm run db:seed
```

5. **Start Development Servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. **Access Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Demo Login**: demo@example.com / demo123

## 📁 Project Structure

```
video-learning-platform/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── CoursesPage.tsx
│   │   │   └── CourseDetailPage.tsx
│   │   ├── services/          # API services
│   │   │   └── api.service.ts
│   │   ├── store/             # State management
│   │   │   └── authStore.ts
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx            # Main app with routing
│   │   └── main.tsx
│   ├── .env.local             # Frontend environment
│   └── package.json
│
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── config/            # Configuration
│   │   │   └── index.ts
│   │   ├── lib/               # Shared libraries
│   │   │   └── prisma.ts
│   │   ├── middleware/        # Express middleware
│   │   │   └── auth.middleware.ts
│   │   ├── routes/            # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── course.routes.ts
│   │   │   ├── video.routes.ts
│   │   │   └── progress.routes.ts
│   │   ├── services/          # Business logic
│   │   │   └── videoScanner.service.ts
│   │   └── index.ts           # Express app
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed script
│   ├── .env                   # Backend environment
│   └── package.json
│
├── docker-compose.yml          # PostgreSQL + Redis
├── .env                        # Shared environment
├── .env.example                # Environment template
└── README.md
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login
GET    /api/auth/me            # Get profile
PUT    /api/auth/me            # Update profile
POST   /api/auth/logout        # Logout
```

### Courses
```
GET    /api/courses            # List courses
GET    /api/courses/:id        # Get course details
POST   /api/courses/:id/enroll # Enroll in course
GET    /api/courses/:id/progress # Get course progress
POST   /api/courses/scan       # Scan for videos
```

### Videos
```
GET    /api/videos/:id         # Get video details
GET    /api/videos/stream/*    # Stream video
GET    /api/videos/subtitles/* # Stream subtitles
```

### Progress
```
POST   /api/progress           # Update progress
GET    /api/progress/:videoId  # Get video progress
POST   /api/progress/:videoId/complete # Mark complete
GET    /api/progress           # Get all progress
GET    /api/progress/recent    # Recent videos
GET    /api/progress/stats     # Statistics
```

## 🎨 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **Video.js** - Video player
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express 4** - Web framework
- **TypeScript** - Type safety
- **Prisma 5** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Infrastructure
- **Docker** - Containerization
- **PostgreSQL** - Database
- **Redis** - Caching (ready)

## 📖 Usage Guide

### 1. Login
Navigate to http://localhost:5175 and login with:
- Email: `demo@example.com`
- Password: `demo123`

Or create a new account via the Register page.

### 2. Browse Courses
View all available courses on the courses page. Each course shows:
- Number of sections
- Total duration
- Difficulty level
- Tags

### 3. Enroll in a Course
Click "View Course" and then "Enroll Now" to start learning.

### 4. Watch Videos
- Click on any video in the sidebar to start watching
- Progress is automatically saved every 5 seconds
- Videos are marked complete at 90% watched
- Use Previous/Next buttons to navigate

### 5. Track Progress
- Green checkmarks show completed videos
- Resume from where you left off
- View statistics in your profile

## 🔧 Configuration

### Video Directory Structure
```
E:/Learning Videos/
└── Course Name/
    ├── 1 - Section 1/
    │   ├── video1.mp4
    │   ├── video1.en.vtt
    │   └── video2.mp4
    ├── 2 - Section 2/
    └── 3 - Section 3/
```

### Environment Variables

**Backend (.env)**:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5433/vlearn
JWT_SECRET=your-secret-key-min-32-chars
VIDEOS_BASE_PATH=../
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**Frontend (.env.local)**:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Video Learning Platform
```

### Scanning for Videos
The platform automatically scans your video directory:

```bash
# Trigger manual scan
curl -X POST http://localhost:3000/api/courses/scan
```

Or use the "Scan for Videos" button in the UI.

## 🧪 Testing

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

### Test API
```bash
# Get courses (requires auth token)
curl http://localhost:3000/api/courses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Health check
curl http://localhost:3000/health
```

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend database errors
```bash
cd backend
npm run db:push
npm run db:seed
```

### Videos not showing
1. Check `VIDEOS_BASE_PATH` in `.env`
2. Verify folder structure matches expected format
3. Run `/api/courses/scan` to re-scan
4. Check backend logs for errors

### CORS errors
- Verify `CORS_ORIGIN` matches frontend URL
- Check `VITE_API_URL` in frontend `.env.local`
- Restart both servers

## 📝 Development

### Add New Components
```bash
# Frontend
cd frontend/src/components
# Create new component

# Backend
cd backend/src/routes
# Create new route
```

### Database Changes
```bash
cd backend

# Edit prisma/schema.prisma
# Then push changes
npm run db:push

# Or create migration
npm run db:migrate
```

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting

## 🚢 Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build
# Outputs to dist/

# Backend
cd backend
npm run build
# Outputs to dist/
```

### Environment
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Enable HTTPS
- Configure proper CORS
- Use production database

## 📊 Database Schema

### Key Tables
- **users** - User accounts and profiles
- **courses** - Course information
- **course_sections** - Course sections
- **videos** - Video metadata
- **video_subtitles** - Subtitle tracks
- **user_progress** - Watch progress
- **user_course_enrollment** - Enrollments
- **video_notes** - User notes (ready)
- **video_bookmarks** - Bookmarks (ready)

## 🎯 Roadmap

### Completed ✅
- [x] Backend API with authentication
- [x] Video streaming with seeking
- [x] Progress tracking
- [x] Course management
- [x] Frontend with React Router
- [x] Video player component
- [x] Authentication UI
- [x] Course listing
- [x] Video player page

### Planned 🚧
- [ ] Notes and bookmarks UI
- [ ] Search functionality
- [ ] User dashboard
- [ ] Admin panel
- [ ] Video thumbnails
- [ ] Course categories
- [ ] Ratings and reviews
- [ ] Mobile responsive improvements
- [ ] Dark mode toggle
- [ ] Email notifications

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review API documentation
- Check backend logs
- Verify environment variables

## 🙏 Acknowledgments

- **shadcn/ui** - Beautiful UI components
- **Video.js** - Powerful video player
- **Prisma** - Excellent ORM
- **Tailwind CSS** - Utility-first CSS

---

**Built with ❤️ for self-hosted learning**

Demo: http://localhost:5175
API: http://localhost:3000
