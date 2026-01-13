import { TaskType, TaskPriority, TaskStatus } from '@doma/shared';
import { CreateTaskPayload } from '@doma/shared';

export class CreateTaskDto implements CreateTaskPayload {
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
    blockLocationUntil?: string;
    images?: string[];
    status?: TaskStatus;
}
