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
        'nav.rooms': 'Locations',
        'nav.kanban': 'Kanban',
        'nav.equipment': 'Inventory',
        'nav.analytics': 'Analytics',
        'nav.shifts': 'Shifts',
        'nav.team': 'Team',
        'nav.profile': 'Profile',
        'nav.create': 'Create',
        'task.create.title': 'New Request',
        'task.list.title': 'Task Board',
        'lbl.title': 'Title',
        'lbl.description': 'Description',
        'lbl.department': 'Department',
        'lbl.location': 'Location / Space',
        'lbl.priority': 'Priority',
        'lbl.create': 'Create Task',
        'lbl.guestImpact': 'Guest Impact?',
        'lbl.uploadImage': 'Upload Image',
        'lbl.save': 'Save Configuration',
        'lbl.settings': 'Settings',
        'lbl.language': 'Language / Idioma',
        'lbl.sla': 'SLA Thresholds (Hours)',
        'lbl.user_info': 'User Information',
        'lbl.role': 'Role',
        'lbl.team_dept': 'Team / Department',
        'lbl.logged_in_as': 'Logged in as',
        'lbl.assigned_to': 'Assign To',
        'lbl.no_description': 'No description provided.',
        'lbl.start_task': 'Start Task (In Progress)',
        'lbl.mark_done': 'Mark as Complete',
        'lbl.escalate': 'Report Issue / Escalate',
        'lbl.reset': 'Mistake? Reset to "Not Started"',
        'lbl.close': 'Close',
        'lbl.report_other': 'Report Issue at Other Location',
        'lbl.sync_mews': 'Sync with MEWS',
        'lbl.room_list': 'Location List',
        'status.new': 'New',
        'status.done': 'Done',
        'status.dirty': 'Dirty',
        'status.cleaning': 'Cleaning',
        'status.inspected': 'Inspected',
        'status.ready': 'Ready',
        'status.occupied': 'Occupied',
        'status.ooo': 'Out of Order',
        'status.out_of_order': 'Out of Order',
        'status.assigned': 'Assigned',
        'status.in_progress': 'In Progress',
        'status.blocked': 'Blocked',
        'status.triaged': 'Triaged',
        'status.verified': 'Verified',
        'role.admin': 'Admin',
        'role.manager': 'Manager',
        'role.staff': 'Staff',
        'alert.sync_confirm': 'Are you sure you want to sync with MEWS?',
        'alert.sync_success': 'Sync Successful!',
        'alert.sync_failed': 'Sync Failed. Check console.',
        'alert.status_error': 'Failed to update status',
        'type.hk': 'Housekeeping',
        'type.maintenance': 'Maintenance',
        'type.reception': 'Reception',
        'def.cleaning_request': 'Cleaning Request',
        'def.maintenance_issue': 'Maintenance Issue',
        'def.service_request': 'Service Request',
        'lbl.select_room_list': 'Select from Room List',
        'lbl.select_option': 'Select Option',
        'lbl.no_tasks_found': 'No tasks found for your filtered selection.',
        'lbl.request_status': 'Request Status',
        'lbl.my_requests': 'Created by Me',
        'lbl.team_requests': 'Created by Team',
        'lbl.lapses': 'Lapse',
        'lbl.created': 'Created',
        'lbl.assigned_to': 'Assigned To',
    },
    pt: {
        'app.title': 'DOMA Ops',
        'nav.tasks': 'Tarefas',
        'nav.rooms': 'Locais',
        'nav.kanban': 'Kanban',
        'nav.equipment': 'Inventário',
        'nav.analytics': 'Analítica',
        'nav.shifts': 'Turnos',
        'nav.team': 'Equipa',
        'nav.profile': 'Perfil',
        'nav.create': 'Criar',
        'task.create.title': 'Novo Pedido',
        'task.list.title': 'Quadro de Tarefas',
        'lbl.title': 'Título',
        'lbl.description': 'Descrição',
        'lbl.department': 'Departamento',
        'lbl.location': 'Local / Espaço',
        'lbl.priority': 'Prioridade',
        'lbl.create': 'Criar Tarefa',
        'lbl.request_status': 'Estado dos Pedidos',
        'lbl.my_requests': 'Criado por Mim',
        'lbl.team_requests': 'Criado pela Equipa',
        'lbl.lapses': 'Tempo Decorrido',
        'lbl.created': 'Criado',
        'lbl.assigned_to': 'Atribuído a',
        'lbl.request_status': 'Estado dos Pedidos',
        'lbl.my_requests': 'Criado por Mim',
        'lbl.team_requests': 'Criado pela Equipa',

        'lbl.guestImpact': 'Impacto Hóspede?',
        'lbl.uploadImage': 'Enviar Foto',
        'lbl.save': 'Guardar Configuração',
        'lbl.settings': 'Definições',
        'lbl.language': 'Idioma',
        'lbl.sla': 'Limites SLA (Horas)',
        'lbl.user_info': 'Informação do Utilizador',
        'lbl.role': 'Função',
        'lbl.team_dept': 'Equipa / Departamento',
        'lbl.logged_in_as': 'Sessão iniciada como',
        'lbl.assigned_to': 'Atribuído a',
        'lbl.no_description': 'Sem descrição fornecida.',
        'lbl.start_task': 'Iniciar Tarefa (Em Curso)',
        'lbl.mark_done': 'Marcar como Concluída',
        'lbl.escalate': 'Reportar Problema / Escalar',
        'lbl.reset': 'Engano? Redefinir para "Não Iniciada"',
        'lbl.close': 'Fechar',
        'lbl.report_other': 'Reportar noutro local',
        'lbl.sync_mews': 'Sincronizar com MEWS',
        'lbl.room_list': 'Lista de Locais',
        'status.new': 'Novo',
        'status.done': 'Concluído',
        'status.dirty': 'Sujo',
        'status.cleaning': 'Limpeza',
        'status.inspected': 'Inspecionado',
        'status.ready': 'Pronto',
        'status.occupied': 'Ocupado',
        'status.ooo': 'Fora de Serviço',
        'status.out_of_order': 'Fora de Serviço',
        'status.assigned': 'Atribuído',
        'status.in_progress': 'Em Curso',
        'status.blocked': 'Bloqueado',
        'status.triaged': 'Triagem',
        'status.verified': 'Verificado',
        'role.admin': 'Administrador',
        'role.manager': 'Gerente',
        'role.staff': 'Staff',
        'alert.sync_confirm': 'Tem a certeza que deseja sincronizar com o MEWS?',
        'alert.sync_success': 'Sincronização com Sucesso!',
        'alert.sync_failed': 'Falha na Sincronização. Verifique a consola.',
        'alert.status_error': 'Falha ao atualizar estado',
        'type.hk': 'Limpeza',
        'type.maintenance': 'Manutenção',
        'type.reception': 'Receção',
        'def.cleaning_request': 'Pedido de Limpeza',
        'def.maintenance_issue': 'Problema de Manutenção',
        'def.service_request': 'Pedido de Serviço',
        'lbl.select_room_list': 'Selecionar da Lista de Quartos',
        'lbl.select_option': 'Selecionar Opção',
        'lbl.no_tasks_found': 'Nenhuma tarefa encontrada para a sua seleção.',
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
