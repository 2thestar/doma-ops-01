// Re-export specific Prisma Enums if needed, or define compatible ones.
// Ideally, we import these from @prisma/client if this package depends on it, 
// but for a lightweight shared package, we might duplicate strictly or use a type-only import.
// For now, let's strictly define them to avoid referencing the heavy prisma client in frontend bundle if not careful.

export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'STAFF' | 'EXECUTOR' | 'OWNER' | 'INSPECTOR';

export type TaskStatus = 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'VERIFIED' | 'CLOSED';

export type TaskPriority = 'P1' | 'P2' | 'P3';

export type TaskType = 'HK' | 'MAINTENANCE' | 'FRONT_DESK' | 'SPA' | 'FNB' | 'INSPECTION' | 'PREVENTIVE' | 'OTHER';

export type SpaceStatus = 'DIRTY' | 'CLEANING' | 'INSPECTED' | 'READY' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE';

export type SpaceType = 'ROOM' | 'PUBLIC' | 'OUTDOOR' | 'BOH' | 'VENUE';

export interface User {
    id: string;
    telegramId: string | null;
    name: string;
    email: string | null;
    role: UserRole;
    createdAt: Date | string; // Allow string for JSON response
    updatedAt: Date | string;
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    spaceId: string;
    equipmentId: string | null;
    assigneeId: string | null;
    reporterId: string | null;
    dueAt: Date | string | null;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    isGuestImpact: boolean;
    images: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
    // Relations (Optional in list view, present in detail)
    space?: Space;
    assignee?: User;
    reporter?: User;
}

export interface Space {
    id: string;
    name: string;
    type: SpaceType;
    status: SpaceStatus;
    zoneId: string;
}

// --- API Payloads (DTO Interfaces) ---

export interface CreateTaskPayload {
    title: string;
    description?: string;
    type: TaskType;
    priority: TaskPriority;
    spaceId: string;
    assigneeId?: string;
    reporterId?: string;
    equipmentId?: string;
    dueAt?: string;
    isGuestImpact?: boolean;
    images?: string[];
    status?: TaskStatus;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> { }

export interface CreateSpacePayload {
    name: string;
    type: SpaceType;
    status?: SpaceStatus;
    zoneId: string;
}

export interface UpdateSpacePayload extends Partial<CreateSpacePayload> { }
