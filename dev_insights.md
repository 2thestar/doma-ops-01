
# Development Insights & Context

## Project Overview
DOMA Ops is a housekeeping and maintenance task management system. It relies on a Monorepo structure (Nx-like) with `apps/api` (NestJS) and `apps/web` (React/Vite).

## Key Architectural Decisions

### 1. Simple Activity Logging
- **Implementation**: `ActivityLog` is a separate model linked to `Task` and `User`. 
- **Trigger**: We decided NOT to use database triggers or middleware. Instead, logging is handled explicitly in `TasksService` and `SpacesService`.
- **Reasoning**: Keeps business logic visible in the Service layer. easier to maintain for this scale.

### 2. Auto-Assignment & Space Status
- **HMR / Reloads**: Frontend uses React Context + simulated roles. Hard refreshes needed for Translation updates.
- **Space Status**:
    - **HK Task Created** -> Sets Room to `DIRTY`.
    - **Task Assigned/Started** -> Sets Room to `CLEANING`.
    - **Task Done** -> Sets Room to `READY`.
    - **Logic Location**: `TasksService.ts` (Side Effect).

### 3. Authentication & Roles
- **Current State**: Simulation Mode.
- **Mechanism**: `UserContext` holds a `currentUser` object. `Profile.tsx` allows hot-swapping users (Debug Mode).
- **Security**: Backend `update` endpoints authenticate via `userId` query param (rudimentary) or assume 'system' for automated actions.
- **Improvement Needed**: Real JWT Guard.

### 4. Build & Deployment
- **Strict Mode**: The Cloud build (Render/Docker) runs in strict mode (`tsc -b`). It validates unused variables (`TS6133`) and implicit inputs.
    - *Lesson*: Always remove unused imports/variables before pushing.
    - *Lesson*: Do not duplicate keys in object literals (especially in `LanguageContext`), as this breaks the build.
- **Shared Types**: `packages/shared/src/types.ts` is the source of truth for interfaces used by both FE and BE.
    - *Rule*: Always update shared types when modifying Prisma schema or DTOs to prevent `Property 'x' does not exist` errors on the frontend.

## Debugging Tips
- **"Failed to Assign"**: Usually `ActivityLog` Foreign Key constraint. Ensure `userId` passed to log creation exists in DB.
- **"Stale Data"**: We used static UUIDs in `seed_full.ts` to prevent session loss on DB resets.
- **CORS**: Enabled in `main.ts` for localhost development.
- **"500 Internal Server Error" during Task Create**: Often due to `reporterId` missing in DB or Schema mismatch. Check if `blockLocationUntil` is handled in Prisma input.

## Known Quirks
- **Timestamps**: Older tasks (pre-logging implementation) lack `startedAt`/`completedAt`.
- **Escalation**: Field append on description + status change to `BLOCKED`.
- **Blocking**: "Request location block" sets Space to `OUT_OF_ORDER`. This is a hard overwrite.

## Common Commands
- **Seed**: `npx ts-node src/seed_full.ts` (in `apps/api`)
- **Schema Push**: `npx prisma db push --schema=../../packages/shared/schema.prisma`

### Recent Learnings (Jan 2026)
- **Monorepo Build Paths**: `npm run build` inside a workspace might output to `dist/src/main` instead of `dist/main` if internal folders (like `scripts`) are included in compilation. Always verify `dist` structure locally before changing Docker `CMD`.
- **Crash Loops**: NestJS applications will crash immediately if `PrismaService` fails to connect in `onModuleInit`.
    - *Fix*: Wrap `$connect()` in a try/catch block to allow the app to boot into "Safe Mode". This enables access to debug endpoints (like `/debug-db`) even when the DB is unreachable.
- **Dependency Caching**: Docker caches can hold onto old `packages/shared` builds. If a type error persists despite a fix, forced casting (`as any`) can be used as a temporary unblocker.
