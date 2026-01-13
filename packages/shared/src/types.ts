// Re-export specific Prisma Enums if needed, or define compatible ones.
// Ideally, we import these from @prisma/client if this package depends on it, 
// but for a lightweight shared package, we might duplicate strictly or use a type-only import.
// For now, let's strictly define them to avoid referencing the heavy prisma client in frontend bundle if not careful.

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'OWNER' | 'PENDING' | 'OBSERVER';

export type TaskStatus = 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'READY_FOR_INSPECTION' | 'REOPENED' | 'DONE' | 'VERIFIED' | 'CLOSED';

export type TaskPriority = 'P1' | 'P2' | 'P3';

export type TaskType = 'HK' | 'MAINTENANCE' | 'FRONT_DESK' | 'WELLNESS' | 'FNB' | 'INSPECTION' | 'PREVENTIVE' | 'OTHER';

export type SpaceStatus = 'DIRTY' | 'CLEANING' | 'INSPECTED' | 'OCCUPIED' | 'READY' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE';

export type SpaceType = 'ROOM' | 'PUBLIC' | 'OUTDOOR' | 'BOH' | 'VENUE' | 'WELLNESS' | 'ATMOS' | 'SERVICE';
export type BusinessUnit = 'HOTEL' | 'FNB' | 'EVENTS' | 'ATMOS';

export interface User {
    id: string;
    name: string;
    email?: string | null;
    telegramId?: string | null;
    role: UserRole;
    department?: TaskType | null;
    isOnShift?: boolean;
}

export interface Task {
    id: string;
    friendlyId: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    spaceId: string | null; // Allow null for custom location
    customLocation?: string | null;
    equipmentId: string | null;
    assigneeId: string | null;
    reporterId: string | null;
    dueAt: Date | string | null;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    isGuestImpact: boolean;
    responseTimeMinutes?: number | null;
    blockLocationUntil?: Date | string | null;
    images: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
    // Inspection
    readyAt?: Date | string | null;
    inspectorId?: string | null;
    inspectionResult?: string | null;
    inspectionNotes?: string | null;
    reopenCount?: number;
    linkedTaskId?: string | null;
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
    description?: string;
    blockingReason?: string;
    blockedUntil?: Date | string | null;
    businessUnit?: BusinessUnit;
    zoneId: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tasks?: { id: string; priority: string }[];
}

// --- API Payloads (DTO Interfaces) ---

export interface CreateTaskPayload {
    title: string;
    description?: string;
    type: TaskType;
    priority: TaskPriority;
    spaceId?: string;
    customLocation?: string;
    assigneeId?: string;
    reporterId?: string;
    equipmentId?: string;
    dueAt?: string;
    isGuestImpact?: boolean;
    responseTimeMinutes?: number;
    blockLocationUntil?: string;
    images?: string[];
    status?: TaskStatus;
    // Inspection Updates
    inspectorId?: string;
    inspectionResult?: string;
    inspectionNotes?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> { }

export interface CreateSpacePayload {
    name: string;
    type: SpaceType;
    status?: SpaceStatus;
    zoneId: string;
}

export interface UpdateSpacePayload extends Partial<CreateSpacePayload> { }
