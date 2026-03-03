# HomeCourse

HomeCourse is a self-hosted video learning platform for your own machine. You point it at a folder of videos, it organises them into courses automatically, and you watch them through a web UI in your browser.

- **No cloud.** Everything runs locally.
- **No manual setup.** Drop videos in folders, click Scan, done.
- **One Docker image.** Frontend, backend, and database all in one container.
- **Progress tracking.** Remembers where you left off in every video — something a plain local video player cannot do. That is the whole point of running it as a server.

---

## Requirements

- [Docker](https://docs.docker.com/get-docker/) — that's it.

---

## Install with one command

```bash
docker run -d \
  --name homecourse \
  --restart unless-stopped \
  -p 8080:3000 \
  -v homecourse_data:/data \
  -v /path/to/your/videos:/media/videos:ro \
  -e JWT_SECRET=replace_with_a_long_random_string \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=your_password \
  -e VIDEO_DIRS=/media/videos \
  ghcr.io/fakhrulfaiz/homecourse:latest
```

Open **http://localhost:8080** and log in with the email and password you set above.

> **Windows:** Replace `/path/to/your/videos` with your Windows path, e.g. `C:/Users/me/Videos`

---

## Install with Docker Compose (recommended)

**1. Create a folder and download the compose file:**

```bash
mkdir homecourse && cd homecourse

# Linux / Mac
curl -O https://raw.githubusercontent.com/fakhrulfaiz/HomeCourse/main/docker-compose.prod.yml
curl -o .env https://raw.githubusercontent.com/fakhrulfaiz/HomeCourse/main/.env.example
```

On Windows, just download both files from the GitHub repository and put them in the same folder.

**2. Edit `.env`:**

```env
GITHUB_USERNAME=fakhrulfaiz

JWT_SECRET=replace_with_a_long_random_string

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_password

# Path to your videos on this machine
VIDEO_DIR_1=C:/Users/me/Videos      # Windows
# VIDEO_DIR_1=/home/me/videos       # Linux
```

**3. Start:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

Open **http://localhost:8080**.

---

## Multiple video libraries

Mount each folder separately and list all the container paths in `VIDEO_DIRS`:

**In `docker-compose.prod.yml`** — add a line under `volumes:` for each library:

```yaml
volumes:
  - db_data:/data
  - ${VIDEO_DIR_1}:/media/lib1:ro
  - ${VIDEO_DIR_2}:/media/lib2:ro
  - ${VIDEO_DIR_3}:/media/lib3:ro
```

**In `.env`** — set the host paths and the comma-separated container paths:

```env
VIDEO_DIR_1=C:/Videos/Courses
VIDEO_DIR_2=C:/Videos/Tutorials
VIDEO_DIR_3=D:/Archive

VIDEO_DIRS=/media/lib1,/media/lib2,/media/lib3
```

With `docker run`, add multiple `-v` and update `-e VIDEO_DIRS`:

```bash
docker run -d \
  -v /videos/courses:/media/lib1:ro \
  -v /videos/tutorials:/media/lib2:ro \
  -e VIDEO_DIRS=/media/lib1,/media/lib2 \
  ...
```

---

## Skip login (open access mode)

For a trusted private network where you don't want any login at all:

```bash
# docker run
-e AUTH_DISABLED=true

# .env
AUTH_DISABLED=true
```

Restart the container and the login screen is gone.

---

## Folder structure

Organise your videos into folders — the scanner turns them directly into courses and sections:

```
Your Videos/
├── Python Crash Course/          ← Course
│   ├── 01 - Getting Started/     ← Section
│   │   ├── 01 - Introduction.mp4
│   │   └── 02 - Variables.mp4
│   └── 02 - Functions/
│       └── 01 - Functions.mp4
└── Docker for Beginners/
    └── 01 - Basics/
        ├── 01 - What is Docker.mp4
        └── 01 - What is Docker.en.vtt    ← subtitle (language code before extension)
```

After starting, click **Scan** on the Courses page to detect your files.

Supported video formats: `mp4`, `webm`, `mkv`, `avi`, `mov`  
Supported subtitle formats: `.en.vtt`, `.pt_BR.srt`, etc.

---

## Upgrading

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Your data (`homecourse_data` volume) and video files are never touched during an upgrade.

---

## Migrating from a previous PostgreSQL version

If you used an older version of this app backed by PostgreSQL:

1. **Export** your data from the old instance — click **Export Data** in the UI.
2. **Start** the new version with the steps above.
3. **Import** your data — click **Import Data** in the UI and select the exported file.

Your watch progress, enrollments, and accounts are all restored automatically.

---

## Configuration reference

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | **Required.** Long random string for signing login tokens |
| `JWT_EXPIRES_IN` | `7d` | How long login sessions last |
| `AUTH_DISABLED` | `false` | `true` = no login required |
| `ADMIN_EMAIL` | — | Auto-create an admin account with this email on first boot |
| `ADMIN_PASSWORD` | — | Password for the auto-created admin |
| `VIDEO_DIRS` | `/media/videos` | Comma-separated container paths to scan |
| `VIDEO_DIR_1` | — | Host path for your first library (used in compose) |
| `VIDEO_DIR_2` | — | Host path for a second library (optional) |
| `ALLOWED_VIDEO_FORMATS` | `mp4,webm,mkv,avi,mov` | File extensions the scanner picks up |
| `HTTP_PORT` | `8080` | Host port the app listens on (compose only) |

---

## Backups

All data is in a single SQLite file inside the `homecourse_data` Docker volume.

```bash
# Linux / Mac
docker run --rm \
  -v homecourse_data:/data \
  -v $(pwd):/backup \
  alpine cp /data/app.db /backup/app.db

# Windows (PowerShell)
docker run --rm `
  -v homecourse_data:/data `
  -v ${PWD}:/backup `
  alpine cp /data/app.db /backup/app.db
```

---

## Development

```bash
git clone https://github.com/fakhrulfaiz/HomeCourse.git
cd HomeCourse

cp .env.example .env
# edit .env for local dev

# Start with hot reload
docker compose up -d

# Or run natively (Node 20+)
cd backend  && npm install && npm run dev
cd frontend && npm install && npm run dev
```
