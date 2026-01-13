import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { taskService } from '../services/api';
import type { Task, TaskStatus } from '../types';

export const InspectorQueue = () => {
    const { currentUser } = useUser();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Filter Logic:
    // Only 'READY_FOR_INSPECTION' tasks.
    // If not HK Manager, maybe restrict? Assuming Access Control is in sidebar.

    // SLA Config (Settings)
    const [slaConfig] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('doma_sla_config') || '{"P1":60,"P2":240,"P3":0}');
        } catch { return { P1: 60, P2: 240, P3: 0 }; }
    });

    useEffect(() => {
        loadQueue();
        const interval = setInterval(loadQueue, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const loadQueue = async () => {
        try {
            const allTasks = await taskService.findAll();
            const readyTasks = allTasks.filter(t => t.status === 'READY_FOR_INSPECTION');

            // SORTING: Overdue First, then Oldest ReadyAt
            readyTasks.sort((a, b) => {
                const slaA = calculateSLA(a);
                const slaB = calculateSLA(b);
                // If one is overdue and other isnt, overdue wins
                if (slaA.minutesRemaining < 0 && slaB.minutesRemaining >= 0) return -1;
                if (slaB.minutesRemaining < 0 && slaA.minutesRemaining >= 0) return 1;
                // Otherwise sort by readyAt (asc check, oldest first)
                const dateA = new Date(a.readyAt || a.updatedAt).getTime();
                const dateB = new Date(b.readyAt || b.updatedAt).getTime();
                return dateA - dateB;
            });

            setTasks(readyTasks);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateSLA = (task: Task) => {
        // Base time is READY_AT (start of inspection phase)
        // If readyAt missing, fallback to updatedAt
        const start = new Date(task.readyAt || task.updatedAt);

        let limit = 0;
        if (task.priority === 'P1') limit = slaConfig.P1;
        else if (task.priority === 'P2') limit = slaConfig.P2;
        else limit = task.responseTimeMinutes || 0; // Routine uses task-specific or 0

        if (limit === 0) return { status: 'NONE', text: 'No SLA', minutesRemaining: 9999 };

        const dueAt = new Date(start.getTime() + limit * 60000);
        const now = new Date();
        const minutesRemaining = (dueAt.getTime() - now.getTime()) / 60000;

        const format = (m: number) => {
            const abs = Math.abs(Math.floor(m));
            const hrs = Math.floor(abs / 60);
            const mins = abs % 60;
            return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        };

        if (minutesRemaining < 0) return {
            status: 'OVERDUE',
            text: `Overdue ${format(minutesRemaining)}`,
            color: '#EF4444',
            minutesRemaining
        };

        return {
            status: 'SAFE',
            text: `Due in ${format(minutesRemaining)}`,
            color: minutesRemaining < 30 ? '#F59E0B' : '#10B981',
            minutesRemaining
        };
    };

    // ACTIONS
    const handlePass = async () => {
        if (!selectedTask) return;
        if (!confirm('Mark room as INSPECTED and Released?')) return;

        await taskService.update(selectedTask.id, {
            status: 'DONE',
            inspectorId: currentUser.id,
            inspectionResult: 'PASS'
        });
        setSelectedTask(null);
        loadQueue();
    };

    const handleFail = async () => {
        if (!selectedTask) return;
        const reason = prompt('Reason for failure?');
        if (reason === null) return; // Cancelled

        await taskService.update(selectedTask.id, {
            status: 'REOPENED',
            inspectorId: currentUser.id,
            inspectionResult: 'FAIL',
            inspectionNotes: reason
        });
        setSelectedTask(null);
        loadQueue();
    };

    return (
        <div className="inspector-queue fade-in">
            <header className="queue-header">
                <h2>Inspector Queue 🧐</h2>
                <div className="queue-stats">
                    {tasks.length} Pending
                </div>
            </header>

            <div className="queue-list">
                {loading ? <p>Loading...</p> : tasks.length === 0 ? (
                    <div className="empty-state">
                        All clear! No rooms pending inspection.
                    </div>
                ) : (
                    tasks.map(task => {
                        const sla = calculateSLA(task);
                        return (
                            <div key={task.id} className="queue-item" onClick={() => setSelectedTask(task)}>
                                <div className="item-left">
                                    <div className="room-badge">{task.space?.name || 'Unknown'}</div>
                                    <div className="item-meta">
                                        <span className={`prio-dot ${task.priority}`}>•</span>
                                        {task.assignee?.name ? `Cleaned by ${task.assignee.name.split(' ')[0]}` : 'Unassigned'}
                                    </div>
                                </div>
                                <div className="item-right">
                                    <div className="sla-badge" style={{ color: sla.color, border: `1px solid ${sla.color}` }}>
                                        {sla.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* INSPECTION DRAWER */}
            {selectedTask && (
                <div className="drawer-overlay" onClick={() => setSelectedTask(null)}>
                    <div className="drawer-content bottom-sheet" onClick={e => e.stopPropagation()}>
                        <div className="drawer-header">
                            <h3>{selectedTask.space?.name}</h3>
                            <button className="close-btn" onClick={() => setSelectedTask(null)}>✕</button>
                        </div>

                        <div className="drawer-body">
                            <div className="task-info">
                                <strong>Task:</strong> {selectedTask.title}
                                <br />
                                <strong>Cleaner:</strong> {selectedTask.assignee?.name || 'Unknown'}
                                <br />
                                <span className="timestamp">Ready since {new Date(selectedTask.readyAt || selectedTask.updatedAt).toLocaleTimeString()}</span>
                            </div>

                            <hr />

                            <h4>Checklist</h4>
                            <div className="checklist">
                                <label><input type="checkbox" /> Bed is made correctly</label>
                                <label><input type="checkbox" /> Bathroom supplies restocked</label>
                                <label><input type="checkbox" /> Surfaces dusted</label>
                                <label><input type="checkbox" /> Floor vacuumed/mopped</label>
                                <label><input type="checkbox" /> No maintenance issues</label>
                            </div>

                            <div className="photos-section">
                                {selectedTask.images?.map((img, i) => (
                                    <img key={i} src={img} className="insp-thumb" />
                                ))}
                            </div>
                        </div>

                        <div className="drawer-actions">
                            <button className="btn-pass" onClick={handlePass}>
                                ✅ Pass → Mark Inspected
                            </button>
                            <div className="secondary-actions">
                                <button className="btn-fail" onClick={handleFail}>
                                    ⚠️ Fail → Reopen
                                </button>
                                {/* Escalation could go here */}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .inspector-queue { padding: 16px; max-width: 600px; margin: 0 auto; }
                .queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .queue-header h2 { margin: 0; font-size: 1.5rem; }
                .queue-stats { background: #374151; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; }

                .queue-list { display: flex; flex-direction: column; gap: 12px; }
                .queue-item { background: #1F2937; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #374151; }
                .queue-item:hover { border-color: #4B5563; }

                .room-badge { font-size: 1.2rem; font-weight: 800; color: white; margin-bottom: 4px; }
                .item-meta { color: #9CA3AF; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
                .prio-dot.P1 { color: #EF4444; }
                .prio-dot.P2 { color: #F59E0B; }
                .prio-dot.P3 { color: #10B981; }

                .sla-badge { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; }

                .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; justify-content: center; align-items: flex-end; }
                .drawer-content { background: #111827; width: 100%; max-width: 500px; border-radius: 20px 20px 0 0; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); padding: 24px; animation: slideUp 0.2s ease-out; max-height: 90vh; overflow-y: auto; }
                
                .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .drawer-header h3 { margin: 0; font-size: 1.5rem; }
                .close-btn { background: none; border: none; font-size: 1.5rem; color: #9CA3AF; cursor: pointer; }

                .task-info { color: #D1D5DB; margin-bottom: 20px; line-height: 1.5; }
                .timestamp { font-size: 0.8rem; color: #6B7280; }
                
                .checklist { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
                .checklist label { display: flex; gap: 12px; color: #D1D5DB; font-size: 1rem; align-items: center; cursor: pointer; }
                .checklist input { transform: scale(1.2); accent-color: #10B981; }

                .photos-section { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 24px; }
                .insp-thumb { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; border: 1px solid #374151; }

                .drawer-actions { display: flex; flex-direction: column; gap: 12px; }
                .btn-pass { background: #10B981; color: white; border: none; padding: 16px; border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; width: 100%; }
                .secondary-actions { display: flex; gap: 12px; }
                .btn-fail { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid #EF4444; flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; }

                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .empty-state { text-align: center; padding: 40px; color: #6B7280; font-style: italic; }
            `}</style>
        </div>
    );
};
