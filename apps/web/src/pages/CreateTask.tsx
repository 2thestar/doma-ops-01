import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { taskService } from '../services/api';
import type { TaskPriority, TaskType } from '../types';
import { useNotifications } from '../hooks/useNotifications';

export const CreateTask = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { sendNotification } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [spaces, setSpaces] = useState<{ id: string, name: string }[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'HK' as TaskType,
        priority: 'P3' as TaskPriority,
        spaceId: '',
        isGuestImpact: false,
        images: [] as string[]
    });

    useEffect(() => {
        const loadSpaces = async () => {
            try {
                // Dynamic import to avoid circular dependency issues if any, or just standard import
                const api = await import('../services/api');
                const data = await api.spacesService.findAll();
                setSpaces(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } catch (e) {
                console.error('Failed to load spaces', e);
            }
        };
        loadSpaces();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await taskService.create(formData);
            sendNotification('New Task Assigned', `${formData.type}: ${formData.title}`);
            navigate('/');
        } catch (error) {
            console.error('Failed to create task', error);
            alert('Error creating task');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = () => {
        // Mock upload
        const mockImage = 'https://placehold.co/100x100?text=Img';
        setFormData(prev => ({ ...prev, images: [...prev.images, mockImage] }));
    };

    return (
        <div className="fade-in">
            <h2 style={{ marginBottom: '16px' }}>{t('lbl.create')}</h2>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label className="input-label">{t('lbl.title')}</label>
                    <input
                        className="form-control"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Broken AC"
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">{t('lbl.department')}</label>
                    <select
                        className="form-control"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as TaskType })}
                    >
                        <option value="HK">Housekeeping</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="FRONT_DESK">Front Desk</option>
                        <option value="SPA">Spa</option>
                        <option value="FNB">F&B</option>
                        <option value="INSPECTION">Inspection</option>
                        <option value="PREVENTIVE">Preventive</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div className="input-group">
                    <label className="input-label">{t('lbl.location')}</label>
                    <select
                        className="form-control"
                        value={formData.spaceId}
                        onChange={e => setFormData({ ...formData, spaceId: e.target.value })}
                        required
                    >
                        <option value="">Select a Room / Space...</option>
                        {spaces.map(space => (
                            <option key={space.id} value={space.id}>
                                {space.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group" style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">{t('lbl.priority')}</label>
                        <select
                            className="form-control"
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                        >
                            <option value="P1">P1 - Urgent</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Normal</option>
                        </select>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('lbl.guestImpact')}</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={formData.isGuestImpact}
                            onChange={e => setFormData({ ...formData, isGuestImpact: e.target.checked })}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="input-group">
                    <label className="input-label">{t('lbl.uploadImage')}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn" style={{ background: '#E5E7EB', width: 'auto' }} onClick={handleImageUpload}>
                            📷 Add Photo
                        </button>
                        {formData.images.map((img, idx) => (
                            <img key={idx} src={img} alt="preview" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                        ))}
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">{t('lbl.description')}</label>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : t('lbl.create')}
                </button>
            </form>

            <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--primary-color);
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
      `}</style>
        </div>
    );
};
