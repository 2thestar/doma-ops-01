import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const Layout: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📋</span>
          <span className="label">{t('nav.tasks')}</span>
        </NavLink>
        <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">➕</span>
          <span className="label">{t('nav.create')}</span>
        </NavLink>
        <NavLink to="/rooms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">🏨</span>
          <span className="label">Rooms</span>
        </NavLink>
        <NavLink to="/kanban" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📌</span>
          <span className="label">Board</span>
        </NavLink>
        <NavLink to="/equipment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📦</span>
          <span className="label">Assets</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">📊</span>
          <span className="label">Analytics</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="icon">👤</span>
          <span className="label">{t('nav.profile')}</span>
        </NavLink>
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
          background: var(--bg-card);
          display: flex;
          justify-content: space-around;
          padding: var(--spacing-sm) 0;
          box-shadow: 0 -1px 3px rgba(0,0,0,0.1);
          z-index: 20;
          padding-bottom: max(var(--spacing-sm), env(safe-area-inset-bottom));
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .nav-item.active {
          color: var(--primary-color);
        }

        .nav-item .icon {
          font-size: 1.5rem;
          margin-bottom: 2px;
        }

      `}</style>
    </div>
  );
};
