import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usersService } from '../services/api';
import type { User } from '../types';

export const ShiftManager = () => {
    const { t } = useLanguage();
    // Add t usage to avoid lint, e.g. title

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await usersService.findAll();
            setUsers(data);
        } catch (e) {
            console.error('Failed to load users', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleShift = async (userId: string, currentStatus: boolean) => {
        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, isOnShift: !currentStatus } : u));
        try {
            await usersService.updateShift(userId, !currentStatus);
        } catch (e) {
            console.error('Failed to update shift', e);
            // Revert
            setUsers(users.map(u => u.id === userId ? { ...u, isOnShift: currentStatus } : u));
            alert('Failed to update shift status');
        }
    };

    // Group by Department (mocking specific departmens based on role or if we added Dept field? 
    // We added 'department' to schema. Types might not update immediately in frontend 'User' type definition unless I update it manually or it's shared.)
    // For now I'll use the 'department' field if it exists, otherwise fallback to role.

    const groupedUsers = users.reduce((acc, user) => {
        const dept = (user as any).department || 'Unassigned';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(user);
        return acc;
    }, {} as Record<string, User[]>);

    return (
        <div className="fade-in">
            <h2>{t('lbl.shift_management') || 'Shift Management 🗓️'}</h2>
            <p style={{ color: 'gray', marginBottom: 24 }}>Select who is working today to enable auto-assignment.</p>

            {loading ? <p>Loading...</p> : Object.entries(groupedUsers).map(([dept, team]) => (
                <div key={dept} style={{ marginBottom: 32 }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16 }}>{dept} Team</h3>
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {team.map(user => (
                            <div key={user.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'gray' }}>{user.role}</div>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={(user as any).isOnShift || false}
                                        onChange={() => toggleShift(user.id, (user as any).isOnShift)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

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
          background-color: #10B981;
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
      `}</style>
        </div>
    );
};
