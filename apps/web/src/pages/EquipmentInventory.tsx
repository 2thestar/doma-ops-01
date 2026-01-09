import React, { useEffect, useState } from 'react';
import type { Space } from '@doma/shared';
import { equipmentService, spacesService } from '../services/api';

interface Equipment {
    id: string;
    name: string;
    serialNumber?: string;
    space?: Space;
    spaceId: string;
}

export const EquipmentInventory: React.FC = () => {
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        serialNumber: '',
        spaceId: ''
    });

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
            await equipmentService.create(formData);
            setShowForm(false);
            setFormData({ name: '', serialNumber: '', spaceId: '' });
            loadData(); // Reload list
        } catch (error) {
            console.error('Failed to create equipment', error);
            alert('Error creating equipment');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            await equipmentService.delete(id);
            setEquipmentList(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    if (loading) return <div className="p-4">Loading Inventory...</div>;

    return (
        <div className="inventory-page">
            <header className="page-header">
                <h2>Asset & Equipment Inventory</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'Add New Item'}
                </button>
            </header>

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
                        <button type="submit" className="btn btn-primary">Save Item</button>
                    </form>
                </div>
            )}

            <div className="inventory-list">
                {equipmentList.length === 0 ? (
                    <div className="empty-state">No equipment found. Add some items!</div>
                ) : (
                    equipmentList.map(item => (
                        <div key={item.id} className="inventory-item card">
                            <div className="item-details">
                                <div className="item-name">{item.name}</div>
                                <div className="item-meta">
                                    <span className="metadata-tag">📍 {item.space?.name || 'Unknown'}</span>
                                    {item.serialNumber && <span className="metadata-tag"># {item.serialNumber}</span>}
                                </div>
                            </div>
                            <button className="btn-icon delete-btn" onClick={() => handleDelete(item.id)}>🗑️</button>
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
                    align-items: center;
                    margin-bottom: var(--spacing-md);
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
                }
                .delete-btn:hover {
                    opacity: 1;
                }
                .empty-state {
                    text-align: center;
                    color: var(--text-secondary);
                    padding: 40px;
                }
            `}</style>
        </div>
    );
};
