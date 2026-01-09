import React, { useEffect, useState } from 'react';
import type { Space, SpaceStatus } from '@doma/shared';
import { spacesService } from '../services/api';

export const RoomStatusGrid: React.FC = () => {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSpaces();
    }, []);

    const loadSpaces = async () => {
        try {
            const data = await spacesService.findAll();
            // Sort by Zone then Name
            const sorted = data.sort((a: Space, b: Space) => a.name.localeCompare(b.name));
            setSpaces(sorted);
        } catch (e) {
            console.error('Failed to load spaces', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: SpaceStatus) => {
        switch (status) {
            case 'DIRTY': return 'var(--status-new)'; // Red-ish
            case 'CLEANING': return 'var(--status-progress)'; // Blue
            case 'INSPECTED': return 'var(--primary-color)'; // Purple/Gold
            case 'READY': return 'var(--status-done)'; // Green
            case 'OUT_OF_ORDER': return '#999';
            default: return '#ccc';
        }
    };

    if (loading) return <div className="p-4">Loading Rooms...</div>;

    return (
        <div className="room-grid-page">
            <header className="page-header">
                <h2>Live Room Status</h2>
                <button onClick={loadSpaces} className="refresh-btn">🔄</button>
            </header>

            <div className="grid-container">
                {spaces.map(space => (
                    <div key={space.id} className="room-card" style={{ borderColor: getStatusColor(space.status) }}>
                        <div className="room-header" style={{ background: getStatusColor(space.status) }}>
                            <span className="room-name">{space.name}</span>
                        </div>
                        <div className="room-body">
                            <span className="room-status">{space.status}</span>
                            <span className="room-type">{space.type}</span>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-md);
                }
                .grid-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: var(--spacing-sm);
                }
                .room-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    border: 2px solid transparent;
                    display: flex;
                    flex-direction: column;
                }
                .room-header {
                    padding: 4px 8px;
                    color: white;
                    font-weight: bold;
                    text-align: center;
                    font-size: 0.9rem;
                }
                .room-body {
                    padding: 8px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .room-status {
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .room-type {
                    font-size: 0.65rem;
                    color: var(--text-secondary);
                }
                .refresh-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};
