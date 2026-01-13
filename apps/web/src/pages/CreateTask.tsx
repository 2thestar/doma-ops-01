import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { taskService } from '../services/api';
import type { TaskPriority, TaskType } from '../types';
import { useNotifications } from '../hooks/useNotifications';

// Simple SVGs for sharpness
const Icons = {
    Broom: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6c0 4-4 8-10 8" /><path d="M12 2v20" /><path d="M18 10a4 4 0 0 0 0-8c-4 0-8 4-8 10" /></svg>,
    Wrench: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
    Bell: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    Camera: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
    User: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Lock: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
};

export const CreateTask = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { sendNotification } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [spaces, setSpaces] = useState<{ id: string, name: string }[]>([]);

    const { currentUser } = useUser();
    // const isAdmin = currentUser.role === 'ADMIN';

    const [isCustomLocation, setIsCustomLocation] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'HK' as TaskType, // Default to Housekeeping
        department: 'Housekeeping',
        priority: 'P3' as TaskPriority,
        spaceId: '',
        customLocation: '',
        equipmentId: '',
        assigneeId: '',
        dueAt: '',
        blockLocationUntil: '',
        isGuestImpact: false,
        isBlocking: false,
        blockingReason: '',
        images: [] as string[]
    });

    const [allEquipment, setAllEquipment] = useState<{ id: string, name: string, spaceId: string, serialNumber?: string }[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const api = await import('../services/api');
                const [spacesData, equipmentData] = await Promise.all([
                    api.spacesService.findAll(),
                    api.equipmentService.findAll(),
                ]);

                setSpaces(spacesData.sort((a: any, b: any) => a.name.localeCompare(b.name)));
                setAllEquipment(equipmentData);

                // Check URL params for pre-fill
                const params = new URLSearchParams(window.location.search);
                if (params.get('customLocation') === 'true') {
                    setIsCustomLocation(true);
                } else {
                    const preSpaceId = params.get('spaceId');
                    const preType = params.get('type') as TaskType;

                    setFormData(prev => ({
                        ...prev,
                        spaceId: preSpaceId || prev.spaceId,
                        type: preType || prev.type,
                        department: preType === 'MAINTENANCE' ? 'Maintenance' :
                            preType === 'FRONT_DESK' ? 'Reception' : 'Housekeeping'
                    }));
                }

            } catch (e) {
                console.error('Failed to load data', e);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Destructure to remove 'department' from payload
            // Destructure to remove 'department' and 'dueAt' for special handling
            const { department, dueAt, customLocation, spaceId, isBlocking, blockingReason, ...rest } = formData;
            const payload: any = { ...rest };

            if (isCustomLocation) {
                payload.customLocation = customLocation;
                // spaceId is undefined/null
            } else {
                payload.spaceId = spaceId;
            }

            // Only add dueAt if it has a value, and ensure it's ISO
            if (dueAt) payload.dueAt = new Date(dueAt).toISOString();
            if (payload.blockLocationUntil) payload.blockLocationUntil = new Date(payload.blockLocationUntil).toISOString();

            // Handle Blocking Logic: If blocking is requested, append reason or set flag
            if (formData.isBlocking && formData.blockingReason) {
                // If the backend expects a specifically formatted description for blocking, we can append it
                // Or if we want to trigger OOO, we might need to set blockLocationUntil to "now" if not set
                // For now, let's append the blocking reason to the title or description if supported
                payload.description = `[BLOCKING REQUEST]: ${formData.blockingReason}`;
                // We can also set blockLocationUntil to current time to trigger the logic if needed, 
                // but let's rely on description for now as per user instruction "triggers OOO". 
                // Actually, the previous implementation relied on blockLocationUntil existence. 
                // Let's set it to a future date (e.g., 24h) to trigger the backend logic if we want OOO
                // OR just rely on the description modification.
                // Given the constraint "trigger OOO state", and previous backend logic checked for blockLocationUntil...
                // I will set blockLocationUntil to a default future date if not present, to ensure backend triggers OOO.
                if (!payload.blockLocationUntil) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    payload.blockLocationUntil = tomorrow.toISOString();
                }
            }

            if (!payload.assigneeId) delete payload.assigneeId;

            // Add Reporter ID
            if (currentUser?.id) {
                payload.reporterId = currentUser.id;
            }

            // Auto-generate title if empty based on type
            if (!payload.title) {
                if (payload.type === 'HK') payload.title = t('def.cleaning_request');
                else if (payload.type === 'MAINTENANCE') payload.title = t('def.maintenance_issue');
                else payload.title = t('def.service_request');
            }

            console.log('Payload being sent:', payload);

            await taskService.create(payload);
            sendNotification(t('task.create.title'), `${formData.type}: ${payload.title}`);
            navigate('/');
        } catch (error: any) {
            console.error('Task Creation Error:', error);
            const msg = error.response?.data?.message
                ? JSON.stringify(error.response.data.message)
                : error.message;
            alert(`Failed: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.src = ev.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5); // 50% Quality
                    setFormData(prev => ({ ...prev, images: [...prev.images, compressedDataUrl] }));
                };
            };
            reader.readAsDataURL(file);
        }
    };

    // Priority Slider Logic
    const getPriorityMeta = (p: string) => {
        if (p === 'P1') return { text: 'URGENT', color: '#EF4444', percent: 100 };
        if (p === 'P2') return { text: 'HIGH', color: '#F59E0B', percent: 50 };
        return { text: 'REGULAR', color: '#10B981', percent: 0 };
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        let p: TaskPriority = 'P3';
        if (val === 3) p = 'P1';
        if (val === 2) p = 'P2';
        setFormData(prev => ({ ...prev, priority: p }));
    };

    const getSliderValue = () => {
        if (formData.priority === 'P1') return 3;
        if (formData.priority === 'P2') return 2;
        return 1;
    };

    const currentMeta = getPriorityMeta(formData.priority);

    return (
        <div className="container fade-in">
            {/* Header Removed as requested */}

            <form onSubmit={handleSubmit}>

                {/* 1. Feature Cards for Task Type */}
                <div className="type-grid">
                    <button
                        type="button"
                        className={`feature-card ${formData.type === 'HK' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, type: 'HK', department: 'Housekeeping', title: '' })}
                    >
                        <div className="card-icon"><Icons.Broom /></div>
                        <span className="card-label">Needs cleaning</span>
                    </button>

                    <button
                        type="button"
                        className={`feature-card ${formData.type === 'MAINTENANCE' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, type: 'MAINTENANCE', department: 'Maintenance', title: '' })}
                    >
                        <div className="card-icon"><Icons.Wrench /></div>
                        <span className="card-label">Report issue</span>
                    </button>

                    <button
                        type="button"
                        className={`feature-card ${formData.type === 'FRONT_DESK' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, type: 'FRONT_DESK', department: 'Reception', title: '' })}
                    >
                        <div className="card-icon"><Icons.Bell /></div>
                        <span className="card-label">Guest request</span>
                    </button>
                </div>

                {/* 2. Primary Inputs */}
                <div className="section-block">
                    <div className="input-split">
                        <div className="input-group">
                            <label className="input-label">{t('lbl.location')}</label>
                            <div className="select-wrapper">
                                {isCustomLocation ? (
                                    <input
                                        className="modern-input"
                                        placeholder={t('lbl.location') + '...'}
                                        value={formData.customLocation}
                                        onChange={e => setFormData({ ...formData, customLocation: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                ) : (
                                    <select
                                        className="modern-select"
                                        value={formData.spaceId}
                                        onChange={e => setFormData({ ...formData, spaceId: e.target.value })}
                                        required={!isCustomLocation}
                                    >
                                        <option value="">{t('lbl.location')}...</option>
                                        {spaces.map(space => (
                                            <option key={space.id} value={space.id}>{space.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.8rem', textAlign: 'right' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomLocation(!isCustomLocation)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {isCustomLocation ? 'Select from Room List' : t('lbl.report_other') + '?'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="input-group">
                        <input
                            className="modern-input"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Explain specific issue or leave blank"
                            style={{ height: '112px', fontSize: '1.1rem', resize: 'none' }}
                        />
                        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <label className="action-upload-square">
                                <Icons.Camera />
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>

                            {/* Thumbnails next to camera */}
                            {formData.images.length > 0 && (
                                <div className="image-strip-inline">
                                    {formData.images.map((img, idx) => (
                                        <div key={idx} className="thumb-container-small">
                                            <img src={img} alt="preview" />
                                            <button
                                                type="button"
                                                className="btn-remove-img-small"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, i) => i !== idx)
                                                }))}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {formData.type === 'MAINTENANCE' && ((!isCustomLocation && formData.spaceId) || isCustomLocation) && (
                        <div className="input-group" style={{ marginTop: 12 }}>
                            <label className="input-label">{t('nav.equipment')} <span style={{ opacity: 0.6, fontWeight: 'normal' }}>({t('lbl.no_description')})</span></label>
                            <div className="select-wrapper">
                                <select
                                    className="modern-select"
                                    value={formData.equipmentId}
                                    onChange={e => setFormData({ ...formData, equipmentId: e.target.value })}
                                >
                                    <option value="">-- {t('lbl.no_description')} --</option>

                                    {!isCustomLocation ? (
                                        // Specific Room Selected: Simple List
                                        allEquipment
                                            .filter(eq => eq.spaceId === formData.spaceId)
                                            .map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.name} {eq.serialNumber ? `(#${eq.serialNumber})` : ''}</option>
                                            ))
                                    ) : (
                                        // Custom Location: Grouped by Room
                                        spaces.map(space => {
                                            const spaceEq = allEquipment.filter(eq => eq.spaceId === space.id);
                                            if (spaceEq.length === 0) return null;
                                            return (
                                                <optgroup key={space.id} label={space.name}>
                                                    {spaceEq.map(eq => (
                                                        <option key={eq.id} value={eq.id}>{eq.name} {eq.serialNumber ? `(#${eq.serialNumber})` : ''}</option>
                                                    ))}
                                                </optgroup>
                                            );
                                        })
                                    )}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Priority & Impact Block */}
                <div className="section-block">
                    <div className="priority-control">
                        <div className="priority-info">
                            <label className="input-label">{t('lbl.priority')}</label>
                            <span className="priority-badge" style={{ backgroundColor: currentMeta.color + '20', color: currentMeta.color }}>
                                {formData.priority}
                            </span>
                        </div>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="1"
                                value={getSliderValue()}
                                onChange={handleSliderChange}
                                className="styled-slider"
                                style={{
                                    background: `linear-gradient(to right, ${currentMeta.color} ${currentMeta.percent}%, var(--border-color) ${currentMeta.percent}%)`
                                }}
                            />
                            <div className="slider-ticks">
                                <span className={getSliderValue() === 1 ? 'active' : ''}>Regular</span>
                                <span className={getSliderValue() === 2 ? 'active' : ''}>High</span>
                                <span className={getSliderValue() === 3 ? 'active' : ''}>Urgent</span>
                            </div>
                        </div>
                    </div>




                    {/* Guest Impact & Block Location Row */}
                    <div className="actions-row" style={{ marginTop: 24, justifyContent: 'flex-start', gap: 16 }}>
                        <button
                            type="button"
                            className={`action-toggle ${formData.isGuestImpact ? 'active-danger' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, isGuestImpact: !prev.isGuestImpact }))}
                        >
                            <div className="toggle-content">
                                <Icons.User />
                                <span>{t('lbl.guestImpact')}</span>
                            </div>
                            <div className={`checkbox-circle ${formData.isGuestImpact ? 'checked' : ''}`}></div>
                        </button>

                        <button
                            type="button"
                            className={`action-toggle ${formData.isBlocking ? 'active-warning' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, isBlocking: !prev.isBlocking }))}
                        >
                            <div className="toggle-content">
                                <Icons.Lock />
                                <span>Request location block</span>
                            </div>
                            <div className={`checkbox-circle ${formData.isBlocking ? 'checked' : ''}`}></div>
                        </button>
                    </div>

                    {/* Blocking Reason Input */}
                    {formData.isBlocking && (
                        <div className="input-group fade-in" style={{ marginTop: 16 }}>
                            <label className="input-label" style={{ color: '#F59E0B' }}>Explain location block <span style={{ opacity: 0.6 }}>*</span></label>
                            <input
                                className="modern-input"
                                value={formData.blockingReason}
                                onChange={e => setFormData({ ...formData, blockingReason: e.target.value })}
                                placeholder="Reason for blocking this location..."
                                required={formData.isBlocking}
                                style={{ borderColor: '#F59E0B' }}
                            />
                        </div>
                    )}

                    {/* Old Image Upload & Thumbnails Removed from here */}


                </div>

                <div className="fab-container">
                    <button
                        type="submit"
                        className={`submit-fab ${(!formData.spaceId && !formData.customLocation) ? 'disabled' : ''}`}
                        disabled={(!formData.spaceId && !formData.customLocation) || loading}
                    >
                        {loading ? '...' : t('lbl.create')}
                    </button>
                </div>
            </form >

            <style>{`
                /* Layout */
                .container { padding-bottom: 100px; }
                .section-block { margin-bottom: 24px; }

                /* 1. Feature Cards */
                .type-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 32px;
                }
                .feature-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 20px 12px;
                    background: var(--bg-card);
                    border: 2px solid transparent;
                    border-radius: 16px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: var(--shadow-sm);
                }
                .feature-card:hover { transform: translateY(-2px); }
                .feature-card.active {
                    background: #1E293B; /* Distinct active bg */
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                    box-shadow: var(--shadow-glow);
                }
                .card-icon svg { width: 28px; height: 28px; }
                .card-label { font-size: 0.85rem; font-weight: 600; }

                /* Upload Square */
                .action-upload-square {
                    width: 50px;
                    height: 50px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-secondary);
                    flex-shrink: 0;
                }
                .image-strip-inline {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 2px;
                }
                .thumb-container-small {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                }
                .thumb-container-small img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .btn-remove-img-small {
                    position: absolute;
                    top: 0; right: 0;
                    width: 16px; height: 16px;
                    background: rgba(0,0,0,0.6);
                    color: #fff;
                    border: none;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .submit-fab {
                    width: 100%;
                    padding: 16px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 16px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    cursor: pointer;
                    box-shadow: var(--shadow-md);
                    transition: transform 0.2s;
                }
                .submit-fab.disabled {
                    background: var(--text-secondary); /* Grey out */
                    opacity: 0.3;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .action-toggle.active-warning {
                    background: rgba(245, 158, 11, 0.1);
                    border-color: #F59E0B;
                    color: #F59E0B;
                }
                .action-toggle.active-warning .checkbox-circle {
                    border-color: #F59E0B;
                }
                .action-toggle.active-warning .checkbox-circle.checked {
                   background: #F59E0B;
                }

                /* 2. Inputs */
                .modern-input, .modern-select {
                    width: 100%;
                    padding: 16px;
                    background: var(--bg-input);
                    border: 1px solid transparent;
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 1rem;
                    transition: all 0.2s;
                }
                .modern-input:focus, .modern-select:focus {
                    outline: none;
                    background: var(--bg-card);
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }

                /* 3. Slider */
                .priority-control {
                    background: var(--bg-card);
                    padding: 20px;
                    border-radius: 16px;
                    margin-bottom: 16px;
                }
                .priority-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .priority-badge {
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                }
                .styled-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 8px;
                    border-radius: 4px;
                    outline: none;
                    transition: background 0.2s;
                    cursor: pointer;
                }
                .styled-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                .styled-slider:active::-webkit-slider-thumb { transform: scale(1.2); }
                .slider-ticks {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 12px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .slider-ticks span.active { color: var(--text-primary); }

                /* 4. Action Row */
                .actions-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .action-toggle, .action-upload {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: var(--bg-card);
                    border-radius: 16px;
                    border: 1px solid transparent;
                    cursor: pointer;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                    height: 64px;
                }
                .action-toggle:active, .action-upload:active { transform: scale(0.98); }
                .toggle-content, .action-upload { display: flex; align-items: center; gap: 12px; font-weight: 500; }
                
                .checkbox-circle {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid var(--text-muted);
                    transition: all 0.2s;
                }
                .action-toggle.active-danger {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.3);
                    color: var(--danger-color);
                }
                .checkbox-circle.checked {
                    background: var(--danger-color);
                    border-color: var(--danger-color);
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
                }

                .action-upload:hover { border-color: var(--primary-color); color: var(--primary-color); }

                /* 5. Images */
                .image-strip {
                    display: flex;
                    gap: 12px;
                    margin-top: 16px;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }
                .thumb-container {
                    width: 80px;
                    height: 80px;
                    border-radius: 12px;
                    overflow: hidden;
                    flex-shrink: 0;
                    position: relative;
                }
                .thumb-container img { width: 100%; height: 100%; object-fit: cover; }
                .btn-remove-img {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: rgba(0,0,0,0.6);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    cursor: pointer;
                }

                /* 6. Submit FAB */
                .fab-container {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    right: 24px;
                    z-index: 100;
                }
                .submit-fab {
                    width: 100%;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 16px;
                    padding: 16px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);
                    transition: transform 0.2s;
                    max-width: 600px;
                    margin: 0 auto;
                    display: block;
                }
                .submit-fab:active { transform: scale(0.98); }
                .submit-fab:disabled { background: var(--text-muted); box-shadow: none; }
            `}</style>
        </div >
    );
};
