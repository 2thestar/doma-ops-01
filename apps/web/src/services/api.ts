import axios from 'axios';
import type { CreateTaskPayload, Task } from '../types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://doma-api.onrender.com' : 'http://127.0.0.1:3005');

const api = axios.create({
    baseURL: API_URL,
});

export const taskService = {
    findAll: async (filters: { userId?: string, reporterId?: string, reporterDepartment?: string } = {}): Promise<Task[]> => {
        try {
            // Check if argument is string (legacy) or object
            const params = typeof filters === 'string' ? { userId: filters } : filters;
            const response = await api.get('/tasks', { params });
            return response.data;
        } catch (e) {
            console.warn('API fetch failed, returning empty list', e);
            return [];
        }
    },

    create: async (data: CreateTaskPayload): Promise<Task> => {
        const response = await api.post('/tasks', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateTaskPayload>): Promise<Task> => {
        const response = await api.patch(`/tasks/${id}`, data);
        return response.data;
    },

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/tasks/${id}`, { status });
        return response.data;
    },

    findOne: async (id: string): Promise<Task> => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    addComment: async (id: string, text: string, userId: string) => {
        const response = await api.post(`/tasks/${id}/comments`, { text, userId });
        return response.data;
    }
};

export const spacesService = {
    findAll: async () => {
        const response = await api.get('/spaces');
        return response.data;
    },
    create: async (data: { name: string; type: string; zoneId: string; status?: string }) => {
        const response = await api.post('/spaces', data);
        return response.data;
    },
    update: async (id: string, data: Partial<{ name: string; type: string; status: string; zoneId: string }>) => {
        const response = await api.patch(`/spaces/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/spaces/${id}`);
        return response.data;
    }
};

export const equipmentService = {
    findAll: async () => {
        const response = await api.get('/equipment');
        return response.data;
    },
    create: async (data: { name: string; serialNumber?: string; spaceId: string }) => {
        const response = await api.post('/equipment', data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/equipment/${id}`);
        return response.data;
    },
    update: async (id: string, data: Partial<{ name: string; serialNumber: string; category: string; spaceId: string }>) => {
        const response = await api.patch(`/equipment/${id}`, data);
        return response.data;
    }
};

export const mewsService = {
    sync: async () => {
        const response = await api.post('/mews/sync');
        return response.data;
    }
};

export const usersService = {
    findAll: async () => {
        const response = await api.get('/users');
        return response.data;
    },
    updateShift: async (userId: string, isOnShift: boolean) => {
        const response = await api.patch(`/users/${userId}/shift`, { isOnShift });
        return response.data;
    },
    update: async (userId: string, data: { role?: string; department?: string }) => {
        const response = await api.patch(`/users/${userId}`, data);
        return response.data;
    }
};

export const authService = {
    telegramLogin: async (initData: string) => {
        const response = await api.post('/auth/telegram-miniapp', { initData });
        return response.data;
    }
};

export const analyticsService = {
    getStats: async () => {
        const response = await api.get('/analytics/stats');
        return response.data;
    }
};
