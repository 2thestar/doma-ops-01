import { useRef, useEffect } from 'react';

export const useNotifications = () => {
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            // Request permission on mount
            if ('Notification' in window) {
                Notification.requestPermission();
            }
            initialized.current = true;
        }
    }, []);

    const sendNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        } else {
            // Fallback for demo if permissions denied or not supported (e.g. standard alert/toast)
            console.log('Notification:', title, body);
            // In a real app we'd use a toast library here
        }
    };

    return { sendNotification };
};
