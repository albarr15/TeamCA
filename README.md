# TeamCA

Comprehensive intern management system with task tracking, DTR (daily time record), and role-based access control.

The repo is an npm workspaces monorepo with four packages:

| Workspace | Stack | Default port |
| --- | --- | --- |
| `backend` | Express 5 + Mongoose + Socket.IO (TypeScript, ESM) | `3000` |
| `frontend` | Astro + React + Tailwind | `4321` |
| `website` | Astro marketing site | `4322` |
| `documentation` | Astro Starlight docs | `4323` |

## Prerequisites

- Node.js `>=18` and npm `>=9`
- A MongoDB instance (local `mongod` or an Atlas connection string)
- Docker + Docker Compose (optional, only if you use the container workflow)

## Setup

```bash
git clone https://github.com/JorellAndreiFinez/teamca.git
npm install
```

`npm install` at the root installs every workspace.

### Environment variables

Create `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/teamca
JWT_SECRET=replace-with-a-long-random-string
FRONTEND_URL=http://localhost:4321
CORS_ORIGINS=http://localhost:4321
NODE_ENV=development
```

Create `frontend/.env`:

```env
PUBLIC_BACKEND_URL=http://localhost:3000
```

#### Variable Documentation

**Backend (`backend/.env`)**
*   **Required (All Environments):** 
    *   `MONGODB_URI`: Database connection string.
*   **Required (Production Only):**
    *   `JWT_SECRET`: Secure string for signing auth tokens. The app will exit on startup if missing in production.
    *   `FRONTEND_URL` & `CORS_ORIGINS`: Required in production for custom domains. (Local development automatically allows `localhost:4321`).
*   **Optional:** 
    *   `PORT`: Backend server port (defaults to `3000`).
    *   `NODE_ENV`: Environment mode (defaults to `development`).

**Frontend (`frontend/.env`)**
*   **Required:** 
    *   `PUBLIC_BACKEND_URL`: The base URL connecting to the backend API.

## Running locally

From the repo root:

```bash
# backend API on http://localhost:3000
npm run backend:dev

# frontend app on http://localhost:4321
npm run frontend:dev

# marketing site
npm run website:dev

# docs
npm run docs:dev
```

Run them in separate terminals. `npm run dev` from the root starts every workspace in parallel.

## Production builds

```bash
npm run backend:build && npm run -w backend start
npm run frontend:build && npm run -w frontend preview
npm run website:build && npm run -w website preview
npm run docs:build   && npm run -w documentation preview
```

## Docker

`docker-compose.yml` builds and runs the backend and frontend together:

```bash
docker compose up --build
```

The backend reads `./.env` at the repo root in that mode, so copy `backend/.env` there (or add an `env_file` for `frontend`) before bringing the stack up.

## Useful scripts

```bash
npm run lint:backend         # ESLint backend
npm run lint:frontend        # ESLint frontend
npm run lint:fix:all         # auto-fix everything lintable
npm run format               # Prettier across workspaces
npm test                     # workspace test scripts (where defined)
```

## Project layout

```
teamca/
├── backend/         # Express API, Mongoose models, Socket.IO
├── frontend/        # Astro + React app (intern/admin UI)
├── website/         # Public marketing site
├── documentation/   # Starlight docs
└── docker-compose.yml
```