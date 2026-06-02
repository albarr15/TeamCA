import api from './api';

export interface TaskTemplateData {
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  recurrenceRule: 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  customRecurrenceDays?: number;
  defaultAssignee?: string;
  departmentId: string;
}

export const taskTemplateService = {
  getTemplates: async (departmentId?: string) => {
    // Cast the config to any to satisfy strict InternalAxiosRequestConfig checks
    const config = departmentId ? { params: { departmentId } } : {};
    const response = await api.get('/task-templates', config as any);
    return response.data;
  },

  createTemplate: async (data: TaskTemplateData) => {
    const response = await api.post('/task-templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<TaskTemplateData>) => {
    const response = await api.put(`/task-templates/${id}`, data);
    return response.data;
  },

  spawnTask: async (templateId: string, payload: { dueDate: Date; assignedTo?: string }) => {
    const response = await api.post(`/task-templates/${templateId}/spawn`, payload);
    return response.data;
  }
};