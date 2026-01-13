import { useEffect, useState } from 'react';
import { analyticsService } from '../services/api';

export const Analytics = () => {
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        highPriority: 0,
        byType: {} as Record<string, number>
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await analyticsService.getStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-4">Loading Data...</div>;

    // Calculate percentages for bars
    const maxCount = Math.max(...Object.values(stats.byType), 1);

    return (
        <div className="fade-in">
            <h2>Operations Health 📊</h2>

            <div className="stats-grid">
                <div className="card stat-card">
                    <span className="stat-value">{stats.pendingTasks}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-value" style={{ color: 'var(--danger-color)' }}>{stats.highPriority}</span>
                    <span className="stat-label">High Priority</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-value" style={{ color: 'var(--status-done)' }}>{stats.completedTasks}</span>
                    <span className="stat-label">Completed</span>
                </div>
            </div>

            <div className="card">
                <h3>Workload by Team</h3>
                <div className="bar-chart">
                    {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="bar-row">
                            <span style={{ width: '80px' }}>{type}</span>
                            <div className="bar-track">
                                <div
                                    className="bar-fill"
                                    style={{
                                        width: `${(count / maxCount) * 100}%`,
                                        background: type === 'HK' ? 'var(--primary-color)' :
                                            type === 'MAINTENANCE' ? 'var(--accent-color)' : '#999'
                                    }}
                                ></div>
                            </div>
                            <span>{count}</span>
                        </div>
                    ))}
                    {Object.keys(stats.byType).length === 0 && <p style={{ color: 'gray' }}>No data yet.</p>}
                </div>
            </div>

            <style>{`
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 24px;
                }
                .stat-card {
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    margin-bottom: 0;
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--primary-color);
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    margin-top: 4px;
                }

                .bar-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                    font-size: 0.8rem;
                }
                .bar-track {
                    flex: 1;
                    height: 8px;
                    background: var(--bg-input);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .bar-fill {
                    height: 100%;
                    background: var(--primary-color);
                    border-radius: 4px;
                }
             `}</style>
        </div>
    );
};

