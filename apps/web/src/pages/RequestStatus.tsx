
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext'; // Keeping context but ignoring keys as requested
import { taskService } from '../services/api';
import type { Task } from '../types';

// --- SLA TYPES & CONFIG ---
type SLAStatus = 'OVERDUE' | 'DUE' | 'CLOSED' | 'NO_SLA';

interface SLAInfo {
    status: SLAStatus;
    deltaString: string; // "1h 12m"
    eta: Date;
    color: string;
    effectiveMinutes: number;
    source: 'URGENT' | 'MEDIUM' | 'ROUTINE';
}

const SLA_CONFIG = {
    URGENT: 60,
    MEDIUM: 240, // 4 hours
};

// --- HELPER: SLA Calculation ---
const calculateSLA = (task: Task): SLAInfo | null => {
    // 1. Closed?
    if (['DONE', 'CLOSED', 'CANCELLED'].includes(task.status)) {
        return {
            status: 'CLOSED',
            deltaString: 'Closed',
            eta: task.completedAt ? new Date(task.completedAt) : new Date(task.updatedAt),
            color: 'green',
            effectiveMinutes: 0,
            source: 'ROUTINE'
        };
    }

    // 2. Determine Effective Minutes
    let effectiveMinutes: number = 0;
    let source: SLAInfo['source'] = 'ROUTINE';

    // Priority Overrides
    if (task.priority === 'P1') { // Assumption: P1=Urgent
        effectiveMinutes = SLA_CONFIG.URGENT;
        source = 'URGENT';
    } else if (task.priority === 'P2') { // Assumption: P2=Medium
        effectiveMinutes = SLA_CONFIG.MEDIUM;
        source = 'MEDIUM';
    } else {
        // Routine: Use task.responseTimeMinutes if available
        // Note: We need to cast or access if it exists. Ideally Types should be updated.
        // For now, assuming it might be returned by backend even if type definition lags slightly.
        const routineMins = (task as any).responseTimeMinutes;
        if (routineMins) {
            effectiveMinutes = routineMins;
            source = 'ROUTINE';
        } else {
            return null; // No SLA
        }
    }

    // 3. Calc Due Date
    // If task has manual dueAt, use it. Else CreatedAt + Mins
    const created = new Date(task.createdAt);
    const dueAt = task.dueAt ? new Date(task.dueAt) : new Date(created.getTime() + effectiveMinutes * 60000);

    // 4. Calc Delta
    const now = new Date();
    const diffMs = now.getTime() - dueAt.getTime(); // Positive = Overdue
    const isOverdue = diffMs > 0;
    const absDiffMs = Math.abs(diffMs);

    // Format Delta (Max 2 units, e.g. 1h 12m)
    const totalMins = Math.floor(absDiffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    let days = 0;
    let deltaString = '';

    if (hrs >= 24) {
        days = Math.floor(hrs / 24);
        deltaString = `${days}d ${hrs % 24}h`;
    } else if (hrs > 0) {
        deltaString = `${hrs}h ${mins}m`;
    } else {
        deltaString = `${mins}m`;
    }

    // 5. Status & Color
    let status: SLAStatus = isOverdue ? 'OVERDUE' : 'DUE';
    let color = isOverdue ? '#ff4444' : '#00cc00'; // Default Green for Due

    // Amber if Due Soon (< 30m) and NOT overdue
    if (!isOverdue && totalMins < 30) {
        color = '#ffbb33'; // Amber
    }

    return {
        status,
        deltaString: isOverdue ? `Overdue ${deltaString}` : `Due in ${deltaString}`,
        eta: dueAt,
        color,
        effectiveMinutes,
        source
    };
};

const RequestStatus: React.FC = () => {
    const { currentUser } = useUser();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [viewMode, setViewMode] = useState<'MY_REQUESTS' | 'TEAM_REQUESTS'>('MY_REQUESTS');
    const [loading, setLoading] = useState(false);

    // Drawer State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTaskLogs, setSelectedTaskLogs] = useState<any[]>([]); // New state for logs
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [viewMode, currentUser]);

    const fetchTasks = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            let filters: any = {};
            if (viewMode === 'MY_REQUESTS') {
                if (!currentUser.id) throw new Error("No User ID");
                filters.reporterId = currentUser.id;
            } else {
                if (!currentUser.department) {
                    setTasks([]);
                    setLoading(false);
                    return;
                }
                filters.reporterDepartment = currentUser.department;
            }
            const data = await taskService.findAll(filters);
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Full Task Details (including logs) when drawer opens
    const fetchTaskDetails = async (taskId: string) => {
        try {
            const fullTask = await taskService.findOne(taskId);
            if (fullTask) {
                // Assuming findOne returns logs. If not, backend might need 'include activityLogs'
                // Based on service code, findOne DOES include activityLogs.
                setSelectedTask(fullTask);
                if ((fullTask as any).activityLogs) {
                    setSelectedTaskLogs((fullTask as any).activityLogs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }
            }
        } catch (e) {
            console.error('Failed to fetch full task details', e);
        }
    };

    const handleRowClick = (task: Task) => {
        setSelectedTask(task); // Show immediate info
        setSelectedTaskLogs([]); // Reset logs
        setIsDrawerOpen(true);
        fetchTaskDetails(task.id); // Fetch logs
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedTask(null);
        setSelectedTaskLogs([]);
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || !selectedTask || !currentUser) return;
        setIsPosting(true);
        try {
            if (!currentUser.id) throw new Error("User ID missing");
            await taskService.addComment(selectedTask.id, commentText, currentUser.id);
            setCommentText('');
            // Refresh logs
            await fetchTaskDetails(selectedTask.id);
        } catch (e) {
            console.error('Failed to post comment', e);
            alert('Failed to post comment.');
        } finally {
            setIsPosting(false);
        }
    };

    const renderSLAColumn = (task: Task) => {
        const sla = calculateSLA(task);
        if (!sla) return <div style={{ color: '#888' }}>No SLA</div>;

        if (sla.status === 'CLOSED') {
            return (
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#00cc00', fontWeight: 'bold' }}>Closed</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        {sla.eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            );
        }

        return (
            <div style={{ textAlign: 'right' }}>
                <div style={{ color: sla.color, fontWeight: 'bold' }}>{sla.deltaString}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    ETA {sla.eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container" style={{ padding: '0', background: '#121212', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* --- HEADER --- */}
            <div style={{ padding: '16px 20px', background: '#1e1e1e', borderBottom: '1px solid #333' }}>
                <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Requests</h1>
                <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                    <div
                        onClick={() => setViewMode('MY_REQUESTS')}
                        style={{
                            cursor: 'pointer',
                            paddingBottom: 8,
                            borderBottom: viewMode === 'MY_REQUESTS' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: viewMode === 'MY_REQUESTS' ? 'white' : '#888',
                            fontWeight: 500
                        }}
                    >
                        My requests
                    </div>
                    {currentUser?.department && (
                        <div
                            onClick={() => setViewMode('TEAM_REQUESTS')}
                            style={{
                                cursor: 'pointer',
                                paddingBottom: 8,
                                borderBottom: viewMode === 'TEAM_REQUESTS' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: viewMode === 'TEAM_REQUESTS' ? 'white' : '#888',
                                fontWeight: 500
                            }}
                        >
                            Team requests
                        </div>
                    )}
                </div>
            </div>

            {/* --- LIST --- */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: 20, color: '#888' }}>Loading...</div>
                ) : tasks.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>No requests found</div>
                ) : (
                    tasks.map(task => {
                        const spaceName = task.space?.name || 'Unknown Loc';
                        return (
                            <div
                                key={task.id}
                                onClick={() => handleRowClick(task)}
                                style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid #2a2a2a',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: '#121212'
                                }}
                            >
                                {/* Left: Info */}
                                <div style={{ minWidth: 0, paddingRight: 16 }}>
                                    <div style={{ color: 'white', fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.title}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                        {spaceName} · {task.type} · {task.priority}
                                    </div>
                                    <div style={{ marginTop: 6 }}>
                                        <span className={`status-pill status-${task.status.toLowerCase()}`} style={{ fontSize: '0.7em', padding: '2px 8px' }}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: SLA */}
                                <div style={{ flexShrink: 0 }}>
                                    {renderSLAColumn(task)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* --- DRAWER --- */}
            {isDrawerOpen && selectedTask && (
                <>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}
                        onClick={closeDrawer}
                    />

                    {/* Panel */}
                    <div style={{
                        position: 'fixed',
                        top: 0, bottom: 0, right: 0,
                        width: '85%', maxWidth: '400px',
                        background: '#1e1e1e',
                        borderLeft: '1px solid #333',
                        zIndex: 1001,
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
                        transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {/* Header */}
                        <div style={{ padding: 16, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Request Details</h2>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>ID: #{selectedTask.id.substring(0, 8)}</span>
                            </div>
                            <button onClick={closeDrawer} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                            <h3 style={{ marginTop: 0 }}>{selectedTask.title}</h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>{selectedTask.description || 'No description provided.'}</p>

                            <hr style={{ borderColor: '#333', margin: '20px 0' }} />

                            {/* SLA Section */}
                            <h4 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>SLA Breakdown</h4>
                            {(() => {
                                const sla = calculateSLA(selectedTask);
                                if (!sla) return <div style={{ color: '#666' }}>No active SLA for this request.</div>;
                                return (
                                    <div style={{ background: '#252525', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ color: '#ccc' }}>Source</span>
                                            <span style={{ color: 'white', fontWeight: 500 }}>{sla.source} ({sla.effectiveMinutes}m)</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ color: '#ccc' }}>Created</span>
                                            <span style={{ color: 'white' }}>{new Date(selectedTask.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ color: '#ccc' }}>Due (ETA)</span>
                                            <span style={{ color: 'white' }}>{sla.eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #333' }}>
                                            <span style={{ color: '#ccc' }}>Status</span>
                                            <span style={{ color: sla.color, fontWeight: 'bold' }}>{sla.deltaString}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <hr style={{ borderColor: '#333', margin: '20px 0' }} />

                            {/* Timeline */}
                            <h4 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Timeline</h4>
                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                {/* Render Activity Logs */}
                                {selectedTaskLogs.length > 0 ? (
                                    selectedTaskLogs.map((log) => (
                                        <div key={log.id} style={{ marginBottom: 12, borderLeft: '2px solid #333', paddingLeft: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: log.action === 'COMMENT' ? 'white' : '#888', fontWeight: log.action === 'COMMENT' ? 600 : 400 }}>
                                                    {log.action === 'COMMENT' ? 'Comment' : log.action.replace('STATUS_CHANGE_', '')}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#555' }}>
                                                    {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {log.action === 'COMMENT' && (log.metadata as any)?.text && (
                                                <div style={{ color: '#ccc', marginTop: 4, background: '#252525', padding: 8, borderRadius: 6 }}>
                                                    {(log.metadata as any).text}
                                                </div>
                                            )}
                                            {log.action === 'CREATED' && <div style={{ fontSize: '0.8em', color: '#666' }}>Task Created</div>}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontStyle: 'italic', color: '#666' }}>No activity logs found.</div>
                                )}
                            </div>
                        </div>

                        {/* Footer Comment Input */}
                        <div style={{ padding: 16, borderTop: '1px solid #333', background: '#1e1e1e' }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                    disabled={isPosting}
                                    style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #444', background: '#121212', color: 'white' }}
                                />
                                <button
                                    onClick={handlePostComment}
                                    disabled={isPosting || !commentText.trim()}
                                    style={{
                                        background: isPosting ? '#555' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '0 16px',
                                        fontWeight: 600,
                                        cursor: isPosting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isPosting ? '...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RequestStatus;
