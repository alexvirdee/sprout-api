# Sprout — Server

REST API for Sprout: Express + TypeScript + MongoDB (Mongoose), JWT auth with
rotating refresh tokens, and Google OAuth groundwork.

## Run

```bash
cp .env.example .env     # fill in MONGODB_URI + JWT secrets
npm install
npm run dev              # http://localhost:4000  (GET /api/health)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Hot-reload dev server (tsx watch). |
| `npm run build` | Compile to `dist/`. |
| `npm start` | Run compiled output. |
| `npm run typecheck` | `tsc --noEmit`. |

## Folder structure

```
sprout-server/
└── src/
    ├── index.ts                 # entry: connect DB → listen → graceful shutdown
    ├── app.ts                   # express app: helmet, cors, json, morgan, routes
    ├── config/                  # env (zod-validated), db (mongoose)
    ├── models/                  # User, Garden, Plant, Task, RefreshToken
    ├── controllers/             # auth, user, garden, plant, task
    ├── routes/                  # per-resource routers + index (mounts /api/*)
    ├── middleware/              # protect (JWT), validate (zod), error handler
    ├── services/                # auth, token (JWT + refresh rotation), google
    ├── validators.ts            # zod request schemas
    ├── types/                   # express Request augmentation
    └── utils/                   # AppError, asyncHandler, logger
```

## Data models

- **User** — `name, email, passwordHash (hidden), avatar, authProvider (local|google), googleId`.
- **Garden** — `userId, name, type, locationLabel, cityOrZip, sunExposure, growingZone, sizeType, dimensions {length, width, unit}, notes, plantCount, taskCount, healthStatus, archivedAt`. `DELETE` soft-archives (sets `archivedAt`); the list endpoint returns only non-archived gardens. Enums: type · sunExposure · sizeType.
- **Plant** — `gardenId, name, variety, emoji, plantedDate, status, progress, location, notes`.
- **Task** — `plantId, userId, type, title, dueDate, completed, completedAt`.
- **RefreshToken** — `userId, tokenHash, expiresAt, revokedAt` (TTL-indexed).

`toJSON` maps `_id → id`, drops `__v`, and strips the password hash.

## Auth flow

1. **Register / login** → returns `{ user, tokens: { accessToken, refreshToken } }`.
   Passwords are hashed with bcrypt; access tokens are short-lived JWTs.
2. **Authenticated requests** send `Authorization: Bearer <accessToken>`; the
   `protect` middleware verifies and sets `req.userId`.
3. **Refresh** (`POST /api/auth/refresh`) verifies the refresh JWT, confirms its
   hash is stored and not revoked, then **rotates** it (old one revoked, new pair
   issued) — limiting the blast radius of a leaked token.
4. **Logout** revokes the presented refresh token.
5. **Google** (`POST /api/auth/google`) verifies a Google **ID token** with
   `google-auth-library` and finds-or-creates the user.

## Conventions

- Throw `AppError` (e.g. `AppError.notFound()`) from services/controllers; the
  error middleware renders a consistent `{ message, status, details? }`.
- Wrap async handlers in `asyncHandler` so rejections reach the error middleware.
- Validate input with `validate(schema)` route middleware before controllers.
- All garden/plant/task queries are scoped by the authenticated `userId`.

## Security notes for production

- Set strong, distinct `JWT_*` secrets and a tight `CLIENT_ORIGINS` list.
- Add rate limiting (e.g. `express-rate-limit`) on `/api/auth/*`.
- Serve over HTTPS and consider httpOnly cookies if you add a web client.
