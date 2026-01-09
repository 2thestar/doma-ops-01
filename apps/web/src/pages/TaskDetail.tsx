import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskService } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import type { Task } from '../types';

export const TaskDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { sendNotification } = useNotifications();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadTask(id);
    }, [id]);

    const loadTask = async (taskId: string) => {
        // Since findAll returns everything for now, we can just find it there or impl findOne in frontend api
        // But for better structure let's fetch list and find. 
        // Real app would hit /tasks/:id
        try {
            const tasks = await taskService.findAll();
            const found = tasks.find(t => t.id === taskId);
            setTask(found || null);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!task) return;
        try {
            await taskService.updateStatus(task.id, newStatus);
            setTask(prev => prev ? ({ ...prev, status: newStatus as any }) : null);
            sendNotification('Task Updated', `Status changed to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    if (loading) return <div className="fade-in">Loading...</div>;
    if (!task) return <div className="fade-in">Task not found</div>;

    return (
        <div className="fade-in">
            <button className="btn" style={{ marginBottom: 16, width: 'auto' }} onClick={() => navigate(-1)}>
                ← Back
            </button>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span className="badge" style={{ marginBottom: 8 }}>{task.type}</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(task.createdAt).toLocaleString()}</span>
                </div>

                <h2 style={{ marginBottom: 8 }}>{task.title}</h2>
                <p style={{ color: '#444', marginBottom: 16 }}>{task.description || 'No description provided.'}</p>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label className="input-label">Location</label>
                        <strong>{task.spaceId}</strong>
                    </div>
                    <div>
                        <label className="input-label">Priority</label>
                        <strong style={{
                            color: task.priority === 'P1' ? 'var(--danger-color)' : 'inherit'
                        }}>{task.priority}</strong>
                    </div>
                    <div>
                        <label className="input-label">Status</label>
                        <strong>{task.status}</strong>
                    </div>
                </div>

                {task.isGuestImpact && (
                    <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 8, borderRadius: 4, marginBottom: 16 }}>
                        ⚠️ Guest Impact Issue
                    </div>
                )}

                {task.images && task.images.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label">Photos</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {task.images.map((img, i) => (
                                <img key={i} src={img} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                    {task.status !== 'DONE' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => handleStatusChange('DONE')}
                        >
                            Mark as Done
                        </button>
                    )}
                    {task.status === 'DONE' && (
                        <button
                            className="btn"
                            style={{ background: 'var(--secondary-color)', color: 'white' }}
                        >
                            Verfied ✓
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <h3>History / Audit Log</h3>
                <div style={{ marginTop: 16, fontSize: '0.9rem' }}>
                    <div style={{ paddingBottom: 8, borderBottom: '1px solid #eee', marginBottom: 8 }}>
                        <strong>Created</strong> by {task.reporterId || 'System'} <br />
                        <span style={{ color: '#888', fontSize: '0.8rem' }}>{new Date(task.createdAt).toLocaleString()}</span>
                    </div>
                    {/* Mock history items for demo since backend Log fetch isn't hooked to frontend list yet */}
                    {task.status === 'DONE' && (
                        <div style={{ paddingBottom: 8 }}>
                            <strong>Callback</strong> changed status to DONE <br />
                            <span style={{ color: '#888', fontSize: '0.8rem' }}>{new Date().toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .badge {
                    background: #eee;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
};
