import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/api';
import type { UserRole, TaskType } from '../types';

// Extend Window interface for TypeScript
declare global {
    interface Window {
        Telegram?: {
            WebApp: {
                initData: string;
                ready: () => void;
                expand: () => void;
            };
        };
    }
}

interface UserProfile {
    id: string;
    name: string;
    role: UserRole;
    department: TaskType;
}

interface UserContextType {
    currentUser: UserProfile;
    setCurrentUser: (user: UserProfile) => void;
    updateRole: (role: UserRole) => void;
    updateDepartment: (dept: TaskType) => void;
}

const defaultUser: UserProfile = {
    id: 'user-1',
    name: 'Boris',
    role: 'MANAGER', // Default to Manager for demo
    department: 'HK'
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUser);

    useEffect(() => {
        const initTelegram = async () => {
            if (window.Telegram?.WebApp?.initData) {
                try {
                    console.log('Detecting Telegram WebApp...');
                    window.Telegram.WebApp.ready();
                    window.Telegram.WebApp.expand(); // Open full height

                    const data = await authService.telegramLogin(window.Telegram.WebApp.initData);

                    if (data.user) {
                        setCurrentUser({
                            id: data.user.id,
                            name: data.user.name,
                            role: data.user.role as UserRole,
                            department: 'HK' // Default for now
                        });
                        console.log('Telegram Login Success:', data.user.name);
                    }
                } catch (e) {
                    console.error('Telegram Login Failed:', e);
                }
            }
        };

        initTelegram();
    }, []);

    const updateRole = (role: UserRole) => {
        setCurrentUser(prev => ({ ...prev, role }));
    };

    const updateDepartment = (department: TaskType) => {
        setCurrentUser(prev => ({ ...prev, department }));
    };

    return (
        <UserContext.Provider value={{ currentUser, setCurrentUser, updateRole, updateDepartment }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
