import React, { useEffect, useState } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@doma/shared';
// Avoid using Enum as value due to potential build/import issues in frontend
import { taskService } from '../services/api';

const COLUMNS: TaskStatus[] = [
    'NEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'DONE',
    'VERIFIED'
] as TaskStatus[];

export const KanbanBoard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const data = await taskService.findAll();
            setTasks(data);
        } catch (e) {
            console.error('Failed to load tasks', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        const taskId = draggedTaskId;
        if (!taskId) return;

        // Optimistic update
        const originalTasks = [...tasks];
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
        setDraggedTaskId(null);

        try {
            await taskService.updateStatus(taskId, status);
        } catch (error) {
            console.error('Failed to update status', error);
            // Revert
            setTasks(originalTasks);
            alert('Failed to move task. Please try again.');
        }
    };

    const getPriorityColor = (p: TaskPriority) => {
        switch (p) {
            case 'P1': return '#ef4444'; // Red
            case 'P2': return '#f59e0b'; // Amber
            case 'P3': return '#3b82f6'; // Blue
            default: return '#9ca3af';
        }
    };

    if (loading) return <div className="p-4">Loading Board...</div>;

    return (
        <div className="kanban-page">
            <header className="page-header">
                <h2>Task Board</h2>
                <button onClick={loadTasks} className="refresh-btn">🔄</button>
            </header>

            <div className="board-container">
                {COLUMNS.map(status => (
                    <div
                        key={status}
                        className="board-column"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <h3 className="column-header">
                            {status.replace(/_/g, ' ')}
                            <span className="count">
                                {tasks.filter(t => t.status === status).length}
                            </span>
                        </h3>
                        <div className="column-content">
                            {tasks
                                .filter(t => t.status === status)
                                .map(task => (
                                    <div
                                        key={task.id}
                                        className="kanban-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                    >
                                        <div className="card-priority" style={{ backgroundColor: getPriorityColor(task.priority) }} />
                                        <div className="card-content">
                                            <span className="card-title">{task.title}</span>
                                            <span className="card-meta">
                                                {task.assignee?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .kanban-page {
                    height: calc(100vh - 140px);
                    display: flex;
                    flex-direction: column;
                    padding-bottom: 20px;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: var(--spacing-sm);
                }
                .board-container {
                    display: flex;
                    gap: var(--spacing-md);
                    overflow-x: auto;
                    height: 100%;
                    padding-bottom: var(--spacing-md);
                }
                .board-column {
                    min-width: 280px;
                    background: var(--bg-body);
                    border-radius: var(--radius-md);
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--border-color);
                }
                .column-header {
                    padding: var(--spacing-sm) var(--spacing-md);
                    font-size: 0.9rem;
                    font-weight: 600;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    background: var(--bg-card);
                    border-radius: var(--radius-md) var(--radius-md) 0 0;
                }
                .count {
                    background: var(--bg-body);
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                }
                .column-content {
                    flex: 1;
                    padding: var(--spacing-sm);
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }
                .kanban-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-sm);
                    box-shadow: var(--shadow-sm);
                    padding: var(--spacing-sm);
                    cursor: grab;
                    display: flex;
                    gap: var(--spacing-sm);
                    border: 1px solid transparent;
                }
                .kanban-card:hover {
                    border-color: var(--primary-color);
                }
                .card-priority {
                    width: 4px;
                    border-radius: 2px;
                    flex-shrink: 0;
                }
                .card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    overflow: hidden;
                }
                .card-title {
                    font-size: 0.9rem;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .card-meta {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};
