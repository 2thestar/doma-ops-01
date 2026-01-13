import React, { useEffect, useState } from 'react';
import { usersService } from '../services/api';
import type { User, UserRole } from '@doma/shared';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

export const TeamManagement: React.FC = () => {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Access Control
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
            navigate('/');
            return;
        }
        loadUsers();
    }, [currentUser, navigate]);

    const loadUsers = async () => {
        try {
            const data = await usersService.findAll();

            // Filter: Managers only see their own department
            let visibleUsers = data;
            if (currentUser.role === 'MANAGER' && currentUser.department) {
                visibleUsers = data.filter((u: User) => u.department === currentUser.department);
            }

            // Sort: Managers first, then alphabetical
            const sorted = (visibleUsers as User[]).sort((a, b) => {
                const roleOrder = { ADMIN: 0, MANAGER: 1, STAFF: 2, OWNER: 3, PENDING: 4, OBSERVER: 5 };
                const ra = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
                const rb = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
                if (ra !== rb) return ra - rb;
                return a.name.localeCompare(b.name);
            });
            setUsers(sorted);
        } catch (e) {
            console.error('Failed to load users', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            await usersService.update(userId, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e) {
            alert('Failed to update role');
        }
    };

    const handleDeptChange = async (userId: string, newDept: string) => {
        try {
            await usersService.update(userId, { department: newDept });
            // Since User interface might not have department yet in shared types (it was added to prisma but maybe not types), 
            // we cast to any or update types. Assuming shared types has it or we largely ignore frontend strictness here for speed.
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, department: newDept } as any : u));
        } catch (e) {
            alert('Failed to update department');
        }
    };

    const handleShiftToggle = async (userId: string, currentStatus: boolean) => {
        try {
            await usersService.updateShift(userId, !currentStatus);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isOnShift: !currentStatus } : u));
        } catch (e) {
            alert('Failed to update shift status');
        }
    };

    if (loading) return <div className="p-4">Loading Team...</div>;

    const roles: UserRole[] = ['ADMIN', 'MANAGER', 'STAFF', 'OBSERVER'];
    const teams = [
        { id: 'HK', label: 'Housekeeping' },
        { id: 'MAINTENANCE', label: 'Maintenance' },
        { id: 'FRONT_DESK', label: 'Front Desk' }
    ];

    return (
        <div className="team-page fade-in">
            <header className="page-header">
                <h2>Team Management</h2>
                <button className="btn-icon" onClick={loadUsers}>🔄</button>
            </header>

            <div className="table-container">
                <table className="team-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Team</th>
                            <th>Status</th>
                            <th>Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className={user.isOnShift ? 'active-row' : ''}>
                                <td className="name-cell">
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-email">{user.email || 'No Email'}</div>
                                </td>
                                <td>
                                    <select
                                        className="role-select"
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                        disabled={currentUser.role === 'MANAGER' && user.role === 'ADMIN'}
                                    >
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </td>
                                <td>
                                    {(user.role === 'ADMIN' || user.role === 'OBSERVER') ? (
                                        <div className="text-secondary" style={{ fontSize: '0.8rem', padding: '6px' }}>—</div>
                                    ) : (
                                        <select
                                            className="dept-select"
                                            value={user.department || ''}
                                            onChange={(e) => handleDeptChange(user.id, e.target.value)}
                                        >
                                            <option value="" disabled>Select Team</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </td>
                                <td>
                                    <button
                                        className={`shift-toggle ${user.isOnShift ? 'on' : 'off'}`}
                                        onClick={() => handleShiftToggle(user.id, !!user.isOnShift)}
                                        title="Toggle Shift Status"
                                    >
                                        {user.isOnShift ? 'ON DUTY' : 'OFF'}
                                    </button>
                                </td>
                                <td>
                                    <button
                                        className="btn-icon"
                                        onClick={() => {
                                            const botName = 'doma_tasks_bot'; // TODO: Move to env
                                            const link = `https://t.me/${botName}?start=${user.id}`;
                                            navigator.clipboard.writeText(link);
                                            alert(`🔗 Invite Link Copied!\n\nSend this to ${user.name}:\n\n${link}`);
                                        }}
                                        title="Copy Telegram Invite Link"
                                    >
                                        🔗
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .table-container {
                    background: var(--bg-card);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .team-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .team-table th {
                    text-align: left;
                    padding: 12px 16px;
                    background: rgba(0,0,0,0.2);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                }
                .team-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                    vertical-align: middle;
                }
                .name-cell .user-name {
                    font-weight: 600;
                }
                .name-cell .user-email {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }
                select {
                    background: var(--bg-body);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    padding: 6px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    width: 100%;
                }
                .shift-toggle {
                    border: none;
                    padding: 6px 12px;
                    border-radius: 99px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    cursor: pointer;
                    width: 80px;
                    transition: all 0.2s;
                }
                .shift-toggle.on {
                    background: var(--success-color, #10B981);
                    color: white;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
                }
                .shift-toggle.off {
                    background: var(--bg-body);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                }
                .active-row {
                    background: rgba(16, 185, 129, 0.05); /* Subtle green tint for active staff */
                }
            `}</style>
        </div>
    );
};
