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
                {loading ? <p>Loading...</p> : visibleTasks.map(task => (
                    <div key={task.id} className="card task-card" style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}>
                        <div className="task-header">
                            <span className="task-id">#{task.id.slice(0, 4)}</span>
                            <span className="task-date">{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="task-title">{task.title}</h3>
                        <div className="task-meta">
                            <span className="badge">{task.type}</span>
                            <span className="badge space">Rm {task.spaceId}</span>
                            {task.isGuestImpact && <span className="badge alert">Guest!</span>}
                        </div>
                    </div>
                ))}

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
            
            .task-card {
                display: flex;
                flex-direction: column;
                gap: 8px;
                position: relative;
            }
            
            .task-header {
                display: flex;
                justify-content: space-between;
                font-size: 0.75rem;
                color: var(--text-muted);
            }
            
            .task-title {
                font-size: 1.1rem;
                margin: 0;
            }
            
            .task-meta {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .badge {
                font-size: 0.7rem;
                padding: 4px 8px;
                border-radius: 4px;
                background: #F3F4F6;
                color: var(--text-secondary);
                font-weight: 600;
            }

            .badge.space {
                background: #E0F2FE;
                color: #0369A1;
            }

            .badge.alert {
                background: #FEE2E2;
                color: #991B1B;
            }
        `}</style>
        </div>
    );
};
