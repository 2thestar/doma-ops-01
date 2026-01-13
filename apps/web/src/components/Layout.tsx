import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

export const Layout: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser } = useUser();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {/* OBSERVER: Only Create & Profile */}
        {currentUser.role === 'OBSERVER' ? (
          <>
            <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">➕</span>
              <span className="label">{t('nav.create')}</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">👤</span>
              <span className="label">{t('nav.profile')}</span>
            </NavLink>
          </>
        ) : (
          /* NON-OBSERVER (Staff, Manager, Admin) */
          <>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">📋</span>
              <span className="label">{t('nav.tasks')}</span>
            </NavLink>
            <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">➕</span>
              <span className="label">{t('nav.create')}</span>
            </NavLink>
            <NavLink to="/requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">📨</span>
              <span className="label">Requests</span>
            </NavLink>
            <NavLink to="/rooms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">🏨</span>
              <span className="label">Locations</span>
            </NavLink>

            {/* ADMIN ONLY: Assets */}
            {currentUser.role === 'ADMIN' && (
              <NavLink to="/equipment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="icon">📦</span>
                <span className="label">Assets</span>
              </NavLink>
            )}

            {/* MANAGER & ADMIN: Team */}
            {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
              <NavLink to="/team" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="icon">👥</span>
                <span className="label">Team</span>
              </NavLink>
            )}

            {/* MANAGER & ADMIN: Analytics */}
            {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
              <>
                <NavLink to="/inspection" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="icon">🧐</span>
                  <span className="label">Inspect</span>
                </NavLink>
                <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="icon">📊</span>
                  <span className="label">Analytics</span>
                </NavLink>
              </>
            )}

            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">👤</span>
              <span className="label">{t('nav.profile')}</span>
            </NavLink>
          </>
        )}
      </nav>

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: var(--bg-body);
        }
        
        .app-header {
          background: var(--bg-card);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-sm);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .app-header h1 {
            font-size: 1.25rem;
            color: var(--primary-color);
            margin: 0;
        }
        
        .app-content {
          flex: 1;
          padding: var(--spacing-md);
          padding-bottom: 80px; /* Space for bottom nav */
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(30, 30, 40, 0.95); /* darker translucent */
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: space-evenly;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          z-index: 100;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: rgba(255,255,255,0.4);
          font-size: 0.7rem;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          padding: 6px 0;
          flex: 1;
          max-width: 64px;
        }

        .nav-item .icon {
          font-size: 1.4rem;
          margin-bottom: 4px;
          filter: grayscale(1);
          transition: transform 0.2s;
        }

        .nav-item.active {
          color: white;
        }

        .nav-item.active .icon {
          filter: grayscale(0);
          transform: translateY(-2px);
          text-shadow: 0 0 12px var(--primary-color-alpha, rgba(59, 130, 246, 0.5));
        }

        /* Active Indicator Dot */
        .nav-item.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            width: 4px;
            height: 4px;
            background: var(--primary-color);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--primary-color);
        }

      `}</style>
    </div>
  );
};
