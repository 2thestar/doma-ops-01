import React, { useEffect, useState } from 'react';
import type { Space, SpaceStatus, SpaceType } from '@doma/shared';
import { spacesService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

export const RoomStatusGrid: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const { currentUser } = useUser();
    const isAdmin = currentUser.role === 'ADMIN';

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);


    // Form State
    const [formData, setFormData] = useState<{
        name: string;
        type: SpaceType;
        zoneId: string;
        description: string;
        businessUnit: 'HOTEL' | 'FNB' | 'EVENTS' | 'ATMOS' | '';
    }>({ name: '', type: 'ROOM', zoneId: '', description: '', businessUnit: '' });

    const [filterCategory, setFilterCategory] = useState<'ROOMS' | 'PUBLIC' | 'WELLNESS' | 'OTHERS'>('ROOMS');

    // Load Data
    const loadSpaces = async () => {
        try {
            setLoading(true);
            const data = await spacesService.findAll();
            setSpaces(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSpaces();
    }, []);

    // Filters & Sorting
    const filteredSpaces = spaces.filter(s => {
        if (filterCategory === 'ROOMS') return s.type === 'ROOM';
        if (filterCategory === 'PUBLIC') return ['PUBLIC', 'SERVICE', 'BOH'].includes(s.type);
        if (filterCategory === 'WELLNESS') return ['WELLNESS', 'ATMOS', 'OUTDOOR'].includes(s.type);
        if (filterCategory === 'OTHERS') return !['ROOM', 'PUBLIC', 'SERVICE', 'BOH', 'WELLNESS', 'ATMOS', 'OUTDOOR'].includes(s.type);
        return true;
    }).sort((a, b) => {
        // Numeric sort if possible, else alphabetical
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        if (numA && numB) return numA - numB;
        return a.name.localeCompare(b.name);
    });

    // Styles Helper
    const getStatusStyle = (status: SpaceStatus) => {
        switch (status) {
            case 'OCCUPIED': return { bg: '#E9D5FF', color: '#6B21A8' }; // Purple
            case 'DIRTY': return { bg: '#FCA5A5', color: '#991B1B' }; // Red
            case 'CLEANING': return { bg: '#FDE68A', color: '#92400E' }; // Amber
            case 'READY': return { bg: '#6EE7B7', color: '#065F46' }; // Green
            case 'INSPECTED': return { bg: '#93C5FD', color: '#1E40AF' }; // Blue
            case 'OUT_OF_ORDER': return { bg: '#4B5563', color: '#F3F4F6' }; // Gray
            case 'OUT_OF_SERVICE': return { bg: '#374151', color: '#9CA3AF' }; // Dark Gray
            default: return { bg: 'var(--bg-card)', color: 'var(--text-primary)' };
        }
    };

    const formatStatus = (status: SpaceStatus) => {
        const key = `status.${status.toLowerCase()}`;
        return t(key) !== key ? t(key) : status.replace(/_/g, ' ');
    };

    // Handlers
    const handleTileClick = (space: Space) => {
        if (isEditMode) {
            setEditingSpace(space);
            setFormData({
                name: space.name,
                type: space.type,
                zoneId: space.zoneId || '',
                description: space.description || '',
                businessUnit: space.businessUnit || '' as any
            });
            setShowAddModal(true);
        } else {
            setSelectedSpace(space);
        }
    };

    const handleStatusChange = async (newStatus: SpaceStatus) => {
        if (!selectedSpace) return;
        try {
            // Optimistic update
            const updatedSpace = { ...selectedSpace, status: newStatus };
            setSpaces(prev => prev.map(s => s.id === selectedSpace.id ? updatedSpace : s));
            setSelectedSpace(updatedSpace);

            await spacesService.update(selectedSpace.id, { status: newStatus });
        } catch (error) {
            console.error(error);
            alert(t('alert.status_error'));
            loadSpaces(); // Revert on failure
        }
    };

    const handleSaveSpace = async () => {
        try {
            if (editingSpace) {
                await spacesService.update(editingSpace.id, formData as any);
            } else {
                await spacesService.create(formData as any);
            }
            setShowAddModal(false);
            setEditingSpace(null);
            loadSpaces();
        } catch (error) {
            console.error(error);
            alert('Failed to save location');
        }
    };

    const handleDeleteSpace = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        try {
            await spacesService.delete(id);
            setShowAddModal(false);
            setEditingSpace(null);
            loadSpaces();
        } catch (error) {
            console.error(error);
            alert('Failed to delete location');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading Locations...</div>;

    return (
        <div className="room-grid-page">
            <header className="page-header">
                <div>
                    <h2>{t('lbl.room_list')}</h2>
                    <div className="category-tabs">
                        {(['ROOMS', 'PUBLIC', 'WELLNESS', 'OTHERS'] as const).map(cat => (
                            <button
                                key={cat}
                                className={`tab-btn ${filterCategory === cat ? 'active' : ''}`}
                                onClick={() => setFilterCategory(cat)}
                            >
                                {cat.charAt(0) + cat.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="actions">
                    {isAdmin && (
                        <button
                            className={`btn-icon ${isEditMode ? 'active-mode' : ''}`}
                            onClick={() => setIsEditMode(!isEditMode)}
                            title="Manage Locations"
                            style={{ border: isEditMode ? '2px solid var(--primary-color)' : '' }}
                        >
                            ⚙️
                        </button>
                    )}
                </div>
            </header>

            {isEditMode ? (
                <button
                    className="btn"
                    style={{
                        width: '100%',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                    onClick={() => {
                        setFormData({ name: '', type: 'ROOM', zoneId: spaces[0]?.zoneId || '', description: '', businessUnit: '' });
                        setShowAddModal(true);
                    }}
                >
                    ➕ Add New Location
                </button>
            ) : (
                <button
                    className="btn"
                    style={{
                        width: '100%',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    onClick={() => navigate('/create?customLocation=true')}
                >
                    <span>📍</span> {t('lbl.report_other')}
                </button>
            )}

            <div className="grid-container">
                {filteredSpaces.map(space => {
                    const style = getStatusStyle(space.status);
                    const roomNumber = space.name.replace(/[^0-9]/g, '');

                    return (
                        <div
                            key={space.id}
                            className={`room-tile ${isEditMode ? 'shake' : ''}`}
                            style={{
                                backgroundColor: style.bg,
                                color: style.color,
                                opacity: isEditMode ? 0.9 : 1
                            }}
                            onClick={() => handleTileClick(space)}
                        >
                            <span className="tile-number" style={{ wordBreak: 'break-word', fontSize: '1.4rem', lineHeight: '1.1' }}>
                                {isEditMode && <span style={{ fontSize: '0.8rem' }}>✏️ </span>}
                                {roomNumber || space.name}
                            </span>

                            <div className="tile-footer">
                                <span className="tile-status">{formatStatus(space.status)}</span>
                                {space.status === 'DIRTY' && <span>🧹</span>}
                                {space.status === 'READY' && <span>✨</span>}
                                {space.status === 'OCCUPIED' && <span>👤</span>}
                                {space.status === 'OUT_OF_ORDER' && <span>🛠️</span>}
                                {space.tasks && space.tasks.length > 0 && <span title="Active Maintenance">🔧</span>}
                            </div>

                            {/* Timestamp */}
                            {space.updatedAt && !isEditMode && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '6px',
                                    right: '8px',
                                    fontSize: '0.65rem',
                                    opacity: 0.7,
                                    fontFamily: 'monospace'
                                }}>{new Date(space.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status Modal (Normal Mode) */}
            {selectedSpace && !isEditMode && (
                <div className="modal-overlay" onClick={() => setSelectedSpace(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Room {selectedSpace.name}</h3>
                        <p className="status-label">{t('lbl.role')}: <strong>{formatStatus(selectedSpace.status)}</strong></p>

                        <div className="status-actions">
                            <button className="btn-status occupied" onClick={() => handleStatusChange('OCCUPIED')}>
                                👤 <br />{t('status.occupied')?.substring(0, 4)}
                            </button>
                            <button className="btn-status dirty" onClick={() => handleStatusChange('DIRTY')}>
                                🧹 <br />{t('status.dirty')}
                            </button>
                            <button className="btn-status cleaning" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }} title="Managed by Tasks">
                                🧴 <br />{t('status.cleaning')?.substring(0, 5)}
                            </button>
                            <button className="btn-status ready" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }} title="Managed by Tasks">
                                ✨ <br />{t('status.ready')}
                            </button>
                            <button className="btn-status inspected" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }} title="Managed by Tasks">
                                ✅ <br />{t('status.inspected')?.substring(0, 4)}
                            </button>
                            <button className="btn-status out-order" onClick={() => handleStatusChange('OUT_OF_ORDER')}>
                                🛠️ <br />{t('status.ooo')?.substring(0, 3)}
                            </button>
                        </div>

                        <hr className="divider" />

                        <button
                            className="btn-secondary full-width"
                            onClick={() => navigate(`/create?spaceId=${selectedSpace.id}`)}
                        >
                            📝 {t('lbl.create')}
                        </button>

                        <button className="btn-text" onClick={() => setSelectedSpace(null)} style={{ marginTop: '12px' }}>
                            {t('lbl.close')}
                        </button>
                    </div>
                </div>
            )}

            {/* Edit / Add Modal (Admin Mode) */}
            {(showAddModal || editingSpace) && (
                <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingSpace(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{editingSpace ? 'Edit Location' : 'Add Location'}</h3>
                        <div style={{ textAlign: 'left', marginBottom: 12 }}>
                            <label className="input-label">Name</label>
                            <input className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. 101 or Pool" />
                        </div>
                        {editingSpace && (
                            <div style={{ textAlign: 'left', marginBottom: 12 }}>
                                <label className="input-label">Location ID</label>
                                <input className="form-control" value={editingSpace.id} disabled style={{ opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                            </div>
                        )}
                        <div style={{ textAlign: 'left', marginBottom: 12 }}>
                            <label className="input-label">Type</label>
                            <select className="form-control" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                <option value="ROOM">Room</option>
                                <option value="PUBLIC">Public Area</option>
                                <option value="WELLNESS">Wellness (Spa/Gym)</option>
                                <option value="OUTDOOR">Outdoors</option>
                                <option value="ATMOS">ATMOS</option>
                                <option value="SERVICE">Service Location</option>
                            </select>
                        </div>
                        <div style={{ textAlign: 'left', marginBottom: 12 }}>
                            <label className="input-label">Description</label>
                            <textarea className="form-control" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Freeform description..." />
                        </div>
                        <div style={{ textAlign: 'left', marginBottom: 12 }}>
                            <label className="input-label">Business Unit</label>
                            <select className="form-control" value={formData.businessUnit} onChange={e => setFormData({ ...formData, businessUnit: e.target.value as any })}>
                                <option value="">-- Select --</option>
                                <option value="HOTEL">Hotel</option>
                                <option value="FNB">FnB</option>
                                <option value="EVENTS">Events</option>
                                <option value="ATMOS">ATMOS</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            {editingSpace && (
                                <button className="btn btn-outline-danger" onClick={() => handleDeleteSpace(editingSpace.id)}>Delete</button>
                            )}
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveSpace}>Save</button>
                        </div>
                        <button className="btn-text" onClick={() => { setShowAddModal(false); setEditingSpace(null); }} style={{ marginTop: '12px' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding: 0 8px; }
                .category-tabs { display: flex; gap: 8px; margin-top: 8px; }
                .tab-btn { padding: 6px 12px; border-radius: 20px; background: var(--bg-input); color: var(--text-secondary); border: 1px solid transparent; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
                .tab-btn.active { background: var(--primary-color); color: white; }
                .btn-icon { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; color: var(--text-primary); margin-left: 8px; }
                .btn-icon.active-mode { background: var(--bg-input); color: var(--primary-color); }
                .grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-bottom: 80px; }
                .room-tile { aspect-ratio: 1; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.1s; position: relative; overflow: hidden; }
                .room-tile:active { transform: scale(0.96); }
                .room-tile.shake { animation: shake 2s infinite; }
                @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(1deg); } 75% { transform: rotate(-1deg); } 100% { transform: rotate(0deg); } }
                .tile-number { font-size: 1.4rem; font-weight: 800; opacity: 0.9; text-align: center; width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .tile-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
                .room-tile::after { content: ''; position: absolute; top: 0; right: 0; width: 40%; height: 40%; background: rgba(255,255,255,0.1); border-bottom-left-radius: 100%; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease-out; }
                .modal-content { background: var(--bg-card); padding: 24px; border-radius: 20px; width: 90%; max-width: 360px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); animation: scaleIn 0.2s ease-out; }
                .modal-content h3 { margin: 0 0 16px 0; font-size: 1.5rem; }
                .status-label { margin-bottom: 24px; color: var(--text-secondary); text-transform: capitalize; }
                .status-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
                .btn-status { aspect-ratio: 1; padding: 8px; border: none; border-radius: 16px; font-weight: 600; font-size: 0.75rem; cursor: pointer; color: white; transition: transform 0.1s, opacity 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .btn-status:active { transform: scale(0.95); opacity: 0.9; }
                .occupied { background-color: #7C3AED; }
                .dirty { background-color: #DC2626; }
                .cleaning { background-color: #F59E0B; }
                .ready { background-color: #10B981; }
                .inspected { background-color: #2563EB; }
                .out-order { background-color: #374151; color: #D1D5DB; }
                .divider { border: 0; border-top: 1px solid var(--border-color); margin: 16px 0; }
                .full-width { width: 100%; padding: 12px; border-radius: 12px; }
                .btn-text { background: none; border: none; color: var(--text-secondary); text-decoration: underline; cursor: pointer; }
                .input-label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
                .form-control { width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid transparent; border-radius: 8px; color: var(--text-primary); font-size: 1rem; }
                .btn-primary { background: var(--primary-color); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .btn-outline-danger { background: transparent; color: var(--danger-color); border: 1px solid var(--danger-color); padding: 10px; border-radius: 8px; cursor: pointer; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};
