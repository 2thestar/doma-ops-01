import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'pt';

type Translations = {
    [key in Language]: {
        [key: string]: string;
    };
};

const translations: Translations = {
    en: {
        'app.title': 'DOMA Ops',
        'nav.tasks': 'Tasks',
        'nav.create': 'Create',
        'nav.profile': 'Profile',
        'task.create.title': 'New Task',
        'task.list.title': 'My Tasks',
        'lbl.title': 'Title',
        'lbl.description': 'Description',
        'lbl.department': 'Department',
        'lbl.location': 'Location / Space',
        'lbl.priority': 'Priority',
        'lbl.create': 'Create Task',
        'lbl.guestImpact': 'Guest Impact?',
        'lbl.uploadImage': 'Upload Image',
        'role.manager': 'Manager',
        'role.staff': 'Staff',
        'status.new': 'New',
        'status.done': 'Done',
    },
    pt: {
        'app.title': 'DOMA Ops',
        'nav.tasks': 'Tarefas',
        'nav.create': 'Criar',
        'nav.profile': 'Perfil',
        'task.create.title': 'Nova Tarefa',
        'task.list.title': 'Minhas Tarefas',
        'lbl.title': 'Título',
        'lbl.description': 'Descrição',
        'lbl.department': 'Departamento',
        'lbl.location': 'Local / Espaço',
        'lbl.priority': 'Prioridade',
        'lbl.create': 'Criar Tarefa',
        'lbl.guestImpact': 'Impacto Hóspede?',
        'lbl.uploadImage': 'Enviar Foto',
        'role.manager': 'Gerente',
        'role.staff': 'Staff',
        'status.new': 'Novo',
        'status.done': 'Feito',
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('en');

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
