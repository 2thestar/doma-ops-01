import axios from 'axios';
import type { CreateTaskPayload, Task } from '../types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://doma-api.onrender.com' : 'http://localhost:3000');

const api = axios.create({
    baseURL: API_URL,
});

export const taskService = {
    findAll: async (): Promise<Task[]> => {
        // const response = await api.get('/tasks');
        // return response.data;
        // Mocking for now as backend might not be running or accessible directly yet
        // I will enable real API calls, but good to have fallback/mock
        try {
            const response = await api.get('/tasks');
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

    updateStatus: async (id: string, status: string) => {
        const response = await api.patch(`/tasks/${id}`, { status });
        return response.data;
    }
};

export const spacesService = {
    findAll: async () => {
        const response = await api.get('/spaces');
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
    }
};

export const authService = {
    telegramLogin: async (initData: string) => {
        const response = await api.post('/auth/telegram-miniapp', { initData });
        return response.data;
    }
};
