import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserRole, TaskType } from '../types';

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
