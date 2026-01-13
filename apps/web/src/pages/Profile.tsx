import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

export const Profile = () => {
    const { language, setLanguage, t } = useLanguage();
    const { currentUser, setCurrentUser, logout } = useUser();

    // SLA State
    const [slaConfig, setSlaConfig] = useState({ P1: 4, P2: 24, P3: 48 });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('doma_sla_config');
        if (savedData) {
            try {
                setSlaConfig(JSON.parse(savedData));
            } catch (e) {
                console.error('Failed to parse SLA config', e);
            }
        }
    }, []);

    const saveSLA = () => {
        localStorage.setItem('doma_sla_config', JSON.stringify(slaConfig));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="fade-in">
            <h2>{t('nav.profile')}</h2>

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>{t('lbl.settings')}</h3>

                <div className="input-group">
                    <label className="input-label">{t('lbl.language')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className={`btn ${language === 'en' ? 'btn-primary' : ''}`}
                            style={{ border: '1px solid #ddd' }}
                            onClick={() => setLanguage('en')}
                        >
                            English 🇺🇸
                        </button>
                        <button
                            className={`btn ${language === 'pt' ? 'btn-primary' : ''}`}
                            style={{ border: '1px solid #ddd' }}
                            onClick={() => setLanguage('pt')}
                        >
                            Português 🇵🇹
                        </button>
                    </div>
                </div>

                {/* ADMIN ONLY: SLA Settings */}
                {currentUser.role === 'ADMIN' && (
                    <div className="sla-section" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee' }}>
                        <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            ⚙️ {t('lbl.sla')}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
                            Time allowed before a task is flagged as overdue.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div className="input-group">
                                <label className="input-label" style={{ color: '#ef4444' }}>Urgent (P1)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={slaConfig.P1}
                                    onChange={e => setSlaConfig({ ...slaConfig, P1: Number(e.target.value) })}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" style={{ color: '#f59e0b' }}>High (P2)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={slaConfig.P2}
                                    onChange={e => setSlaConfig({ ...slaConfig, P2: Number(e.target.value) })}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label" style={{ color: '#3b82f6' }}>Routine (P3)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={slaConfig.P3}
                                    onChange={e => setSlaConfig({ ...slaConfig, P3: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                            {saved && <span className="fade-in" style={{ color: 'green', fontSize: '0.9rem' }}>✅ {t('lbl.save')}!</span>}
                            <button className="btn btn-primary" onClick={saveSLA}>
                                {t('lbl.save')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="card">
                <h3>{t('lbl.user_info')}</h3>
                <div style={{ marginTop: 16 }}>

                    <div className="info-row">
                        <label className="input-label">{t('lbl.role')}</label>
                        <div className="badge role-badge">
                            {t(`role.${currentUser.role.toLowerCase()}`)}
                        </div>
                    </div>

                    <div className="info-row">
                        <label className="input-label">{t('lbl.team_dept')}</label>
                        <div className="badge dept-badge">
                            {currentUser.department || 'None'}
                        </div>
                    </div>

                </div>

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <p>{t('lbl.logged_in_as')}: <strong>{currentUser.name}</strong></p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>ID: {currentUser.id}</p>

                <button
                    className="btn btn-outline-danger full-width"
                    style={{ marginTop: 24 }}
                    onClick={logout}
                >
                    🚪 Sign Out / Reset Session
                </button>
            </div>

            {/* DEBUG: User Switcher */}
            <div className="card" style={{ marginTop: '20px', borderTop: '4px solid #F59E0B' }}>
                <h3 style={{ color: '#F59E0B' }}>🐞 Debug: Role Switcher</h3>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: 12 }}>
                    Use this to simulate different users and verify permissions.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440099', name: 'Boris (Admin)', role: 'ADMIN', department: 'HK' })}>
                        Admin (Boris)
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Maria Manager', role: 'MANAGER', department: 'HK' })}>
                        Manager (Maria)
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440001', name: 'John Maintenance', role: 'STAFF', department: 'MAINTENANCE' })}>
                        Staff (John/Maint)
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440002', name: 'Sarah Housekeeper', role: 'STAFF', department: 'HK' })}>
                        Staff (Sarah/HK)
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440003', name: 'Reception Desk', role: 'STAFF', department: 'FRONT_DESK' })}>
                        Front Desk
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440005', name: 'Alice Wellness', role: 'STAFF', department: 'WELLNESS' })}>
                        Wellness (Alice)
                    </button>
                    <button className="btn" onClick={() => setCurrentUser({ id: '550e8400-e29b-41d4-a716-446655440006', name: 'Mike Maint Mgr', role: 'MANAGER', department: 'MAINTENANCE' })}>
                        Mgr (Mike/Maint)
                    </button>
                </div>
            </div>

            <style>{`
                .info-row {
                    margin-bottom: 16px;
                }
                .badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .role-badge {
                    background-color: #EFF6FF;
                    color: #1D4ED8;
                    border: 1px solid #BFDBFE;
                }
                .dept-badge {
                    background-color: #F3F4F6;
                    color: #374151;
                    border: 1px solid #E5E7EB;
                }
            `}</style>
        </div>
    );
};
