import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import type { TaskType, UserRole } from '../types';

export const Profile = () => {
    const { language, setLanguage, t } = useLanguage();
    const { currentUser, updateRole, updateDepartment } = useUser();

    return (
        <div className="fade-in">
            <h2>{t('nav.profile')}</h2>

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Settings</h3>

                <div className="input-group">
                    <label className="input-label">Language / Idioma</label>
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
                            Português 🇧🇷
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3>User Information</h3>
                <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: '0.9rem', color: 'gray', marginBottom: 8 }}>Simulation Controls:</p>

                    <div className="input-group">
                        <label className="input-label">Role</label>
                        <select
                            className="form-control"
                            value={currentUser.role}
                            onChange={(e) => updateRole(e.target.value as UserRole)}
                        >
                            <option value="MANAGER">Manager</option>
                            <option value="STAFF">Staff</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Department</label>
                        <select
                            className="form-control"
                            value={currentUser.department}
                            onChange={(e) => updateDepartment(e.target.value as TaskType)}
                        >
                            <option value="HK">Housekeeping</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="FRONT_DESK">Front Desk</option>
                        </select>
                    </div>
                </div>

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <p>Logged in as: <strong>{currentUser.name}</strong></p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>ID: {currentUser.id}</p>
            </div>
        </div>
    );
};
