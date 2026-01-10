import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { taskService } from '../services/api';
import type { Task, TaskType } from '../types';

export const TaskList = () => {
    const { t } = useLanguage();
    const { currentUser } = useUser();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filterDept, setFilterDept] = useState<TaskType | 'ALL'>('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
    }, []);

    // Reset filter when user role/dept changes to be helpful
    useEffect(() => {
        if (currentUser.role === 'STAFF') {
            setFilterDept(currentUser.department);
        } else {
            setFilterDept('ALL');
        }
    }, [currentUser]);

    const loadTasks = async () => {
        try {
            const data = await taskService.findAll();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // "Visibility by Department" logic
    let visibleTasks = tasks;

    if (currentUser.role === 'STAFF') {
        // Staff only see their department's tasks
        // (In a real app, backend would filter this, but we simulate it here)
        visibleTasks = tasks.filter(t => t.type === currentUser.department);
    } else {
        // Managers see everything, but can filter
        if (filterDept !== 'ALL') {
            visibleTasks = tasks.filter(t => t.type === filterDept);
        }
    }

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'P1': return 'var(--danger-color)';
            case 'P2': return 'var(--accent-color)';
            default: return 'var(--secondary-color)';
        }
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>{t('task.list.title')}</h2>
                {currentUser.role !== 'STAFF' && (
                    <span style={{ fontSize: '0.8rem', color: 'gray' }}>Manager View</span>
                )}
            </div>

            {/* Filter ScrollView - Only for Managers */}
            {currentUser.role !== 'STAFF' && (
                <div className="filter-scroll">
                    {['ALL', 'HK', 'MAINTENANCE', 'FRONT_DESK', 'SPA'].map((dept) => (
                        <button
                            key={dept}
                            className={`chip ${filterDept === dept ? 'active' : ''}`}
                            onClick={() => setFilterDept(dept as any)}
                        >
                            {dept === 'ALL' ? 'All' : dept}
                        </button>
                    ))}
                </div>
            )}

            <div className="task-list">
                {loading ? <p>Loading...</p> : visibleTasks.map(task => {
                    const color = getPriorityColor(task.priority);
                    return (
                        <div key={task.id} className="ticket-card" onClick={() => {/* Navigate to detail later */ }}>
                            <div className="ticket-stripe" style={{ background: color }}></div>
                            <div className="ticket-content">
                                <div className="ticket-header">
                                    <span>#{task.id.slice(0, 4)}</span>
                                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="ticket-title">{task.title}</h3>
                                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                    {task.space ? task.space.name : `Rm ${task.spaceId}`}
                                </div>

                                <div className="ticket-footer">
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <span className="status-pill" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                                            {task.type}
                                        </span>
                                        {task.isGuestImpact && (
                                            <span className="status-pill" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                                                GUEST
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: color }}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {!loading && visibleTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        {currentUser.role === 'STAFF'
                            ? `No tasks found for ${currentUser.department}.`
                            : 'No tasks found.'}
                    </div>
                )}
            </div>

            <style>{`
            .filter-scroll {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding-bottom: 8px;
                margin-bottom: 16px;
                scrollbar-width: none;
            }
            .filter-scroll::-webkit-scrollbar { display: none; }
            
            .chip {
                padding: 6px 12px;
                border-radius: 20px;
                background: var(--bg-input);
                color: var(--text-secondary);
                white-space: nowrap;
                font-size: 0.85rem;
                border: 1px solid transparent;
            }
            .chip.active {
                background: var(--primary-color);
                color: white;
            }
        `}</style>
        </div>
    );
};
