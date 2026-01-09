import { useEffect, useState } from 'react';
import { taskService } from '../services/api';

export const Analytics = () => {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        overdue: 0,
        avgTime: '2.4h'
    });

    useEffect(() => {
        // Mock analytics calculation from live tasks
        const fetchStats = async () => {
            const tasks = await taskService.findAll();
            setStats({
                total: tasks.length,
                active: tasks.filter(t => t.status !== 'DONE' && t.status !== 'CLOSED').length,
                overdue: 0, // Need backend logic for real overdue check
                avgTime: '2.4h' // Mock
            });
        };
        fetchStats();
    }, []);

    return (
        <div className="fade-in">
            <h2>Analytics</h2>

            <div className="stats-grid">
                <div className="card stat-card">
                    <span className="stat-value">{stats.active}</span>
                    <span className="stat-label">Active Issues</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-value" style={{ color: 'var(--danger-color)' }}>{stats.overdue}</span>
                    <span className="stat-label">Overdue</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-value">{stats.avgTime}</span>
                    <span className="stat-label">Avg Resolve Time</span>
                </div>
            </div>

            <div className="card">
                <h3>Top Departments</h3>
                <div className="bar-chart">
                    <div className="bar-row">
                        <span>HK</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width: '70%' }}></div></div>
                        <span>12</span>
                    </div>
                    <div className="bar-row">
                        <span>Maint</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width: '40%', background: 'var(--accent-color)' }}></div></div>
                        <span>5</span>
                    </div>
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
