import { TaskType, TaskPriority, TaskStatus } from '@doma/shared';
import { CreateTaskPayload } from '@doma/shared';

export class CreateTaskDto implements CreateTaskPayload {
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
