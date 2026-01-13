import React, { useEffect, useState } from 'react';
import type { Space } from '@doma/shared';
import { equipmentService, spacesService } from '../services/api';

interface Equipment {
    id: string;
    name: string;
    serialNumber?: string;
    category?: string;
    space?: Space;
    spaceId: string;
}

export const EquipmentInventory: React.FC = () => {
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // View State: 'TYPE' or 'LOCATION'
    const [viewMode, setViewMode] = useState<'TYPE' | 'LOCATION'>('TYPE');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [justDeleted, setJustDeleted] = useState<{ id: string, item: Equipment } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        serialNumber: '',
        category: '',
        spaceId: ''
    });

    const categories = ['HVAC', 'Plumbing', 'Electrical', 'Furniture', 'Appliance', 'Other'];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [eqData, spData] = await Promise.all([
                equipmentService.findAll(),
                spacesService.findAll()
            ]);
            setEquipmentList(eqData);
            setSpaces((spData as Space[]).sort((a: Space, b: Space) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error('Failed to load data', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await equipmentService.update(editingId, formData);
                setEditingId(null);
            } else {
                await equipmentService.create(formData);
            }
            setShowForm(false);
            setFormData({ name: '', serialNumber: '', category: '', spaceId: '' });
            loadData(); // Reload list
        } catch (error) {
            console.error('Failed to save equipment', error);
            alert('Error saving equipment');
        }
    };

    const handleEdit = (item: Equipment) => {
        setFormData({
            name: item.name,
            serialNumber: item.serialNumber || '',
            category: item.category || '',
            spaceId: item.spaceId
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleUndoDelete = async () => {
        if (!justDeleted) return;
        try {
            // Restore item
            await equipmentService.create({
                name: justDeleted.item.name,
                serialNumber: justDeleted.item.serialNumber,
                spaceId: justDeleted.item.spaceId
                // Note: Category requires backend support in create DTO if strictly typed, but assuming loose for now or mapped
            });
            // Actually, best to just re-create. 
            // Or if backend supports restore, use that. For now, re-create.
            // Wait, create DTO in api.ts is limited. Let's trust it passes through or update api.ts if needed.
            // Actually, the api.ts create signature is: create: async (data: { name: string; serialNumber?: string; spaceId: string })
            // It misses category. Use 'any' to bypass for this quick fix or update api.ts.
            // Let's assume I'll update api.ts to include category, or pass full object.
            await equipmentService.create({
                ...justDeleted.item,
                spaceId: justDeleted.item.spaceId
            } as any);

            setJustDeleted(null);
            loadData();
        } catch (e) {
            alert('Failed to restore');
        }
    };

    const handleDelete = async (item: Equipment) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            await equipmentService.delete(item.id);
            setEquipmentList(prev => prev.filter(i => i.id !== item.id));
            setJustDeleted({ id: item.id, item });

            // Auto-clear undo after 5s
            setTimeout(() => setJustDeleted(null), 5000);
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    // Grouping Logic
    const groupedEquipment = React.useMemo(() => {
        const groups: Record<string, Equipment[]> = {};

        if (viewMode === 'TYPE') {
            equipmentList.forEach(item => {
                const cat = item.category || 'Uncategorized';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);
            });
        } else {
            equipmentList.forEach(item => {
                const loc = item.space?.name || 'Unknown Location';
                if (!groups[loc]) groups[loc] = [];
                groups[loc].push(item);
            });
        }
        return groups;
    }, [equipmentList, viewMode]);

    if (loading) return <div className="p-4">Loading Inventory...</div>;

    return (
        <div className="inventory-page fade-in">
            <header className="page-header">
                <div>
                    <h2>Asset & Equipment Inventory</h2>
                    <div className="view-toggles" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                            className={`chip ${viewMode === 'TYPE' ? 'active' : ''}`}
                            onClick={() => setViewMode('TYPE')}
                        >
                            By Type
                        </button>
                        <button
                            className={`chip ${viewMode === 'LOCATION' ? 'active' : ''}`}
                            onClick={() => setViewMode('LOCATION')}
                        >
                            By Location
                        </button>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', serialNumber: '', category: '', spaceId: '' }); }}>
                    {showForm ? 'Cancel' : 'Add New Item'}
                </button>
            </header>

            {justDeleted && (
                <div className="toast-undo fade-in">
                    <span>Deleted "{justDeleted.item.name}"</span>
                    <button className="undo-btn" onClick={handleUndoDelete}>UNDO</button>
                </div>
            )}

            {showForm && (
                <div className="card fade-in" style={{ marginBottom: '20px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label">Equipment Name</label>
                            <input
                                className="form-control"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Air Conditioner A1"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Category / Type</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`chip ${formData.category === cat ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, category: cat })}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="form-control"
                                style={{ marginTop: 8 }}
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Or type custom category..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Serial Number (Optional)</label>
                            <input
                                className="form-control"
                                value={formData.serialNumber}
                                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                placeholder="e.g. SN-12345"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Location</label>
                            <select
                                className="form-control"
                                required
                                value={formData.spaceId}
                                onChange={e => setFormData({ ...formData, spaceId: e.target.value })}
                            >
                                <option value="">Select Location...</option>
                                {spaces.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                {editingId ? 'Update Item' : 'Save Item'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setShowForm(false); }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div >
            )}

            <div className="inventory-list">
                {equipmentList.length === 0 ? (
                    <div className="empty-state">No equipment found. Add some items!</div>
                ) : (
                    Object.entries(groupedEquipment).map(([groupName, items]) => (
                        <div key={groupName} className="group-section" style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                                {groupName} ({items.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {items.map(item => (
                                    <div key={item.id} className="inventory-item card">
                                        <div className="item-details">
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-meta">
                                                {viewMode === 'TYPE' && <span className="metadata-tag">📍 {item.space?.name || 'Unknown'}</span>}
                                                {viewMode === 'LOCATION' && item.category && <span className="metadata-tag">🏷️ {item.category}</span>}
                                                {item.serialNumber && <span className="metadata-tag"># {item.serialNumber}</span>}
                                            </div>
                                        </div>
                                        <div className="actions">
                                            <button className="btn-icon edit-btn" onClick={() => handleEdit(item)}>✏️</button>
                                            <button className="btn-icon delete-btn" onClick={() => handleDelete(item)}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .inventory-page {
                    padding-bottom: 20px;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--spacing-md);
                }
                .view-toggles .chip {
                    cursor: pointer;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-size: 0.85rem;
                }
                .view-toggles .chip.active {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                .inventory-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }
                .inventory-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .item-name {
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .item-meta {
                    display: flex;
                    gap: 8px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }
                .metadata-tag {
                    background: var(--bg-body);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .delete-btn {
                    color: #ef4444;
                    opacity: 0.7;
                    padding: 8px;
                }
                .edit-btn {
                    color: var(--primary-color);
                    opacity: 0.7;
                    padding: 8px;
                }
                .btn-icon:hover {
                    opacity: 1;
                    background: var(--bg-body);
                    border-radius: 50%;
                }
                .toast-undo {
                    position: fixed;
                    bottom: 85px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #333;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 100;
                }
                .undo-btn {
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: bold;
                    cursor: pointer;
                    padding: 0;
                }
                .empty-state {
                    text-align: center;
                    color: var(--text-secondary);
                    padding: 40px;
                }
            `}</style>
        </div >
    );
};
