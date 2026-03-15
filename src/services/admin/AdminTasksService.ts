import { supabase } from '../../lib/supabase';

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface AdminTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  tags: string[];
  subtasks: TaskSubtask[];
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTask extends AdminTaskRow {}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assignee_name: string;
  tags: string[];
  subtasks: TaskSubtask[];
}

export const AdminTasksService = {
  async getTasks(): Promise<AdminTask[]> {
    const { data, error } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as AdminTaskRow[];
  },

  async saveTask(formData: TaskFormData, editingId?: string): Promise<void> {
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      assigned_to: null,
      assignee_name: formData.assignee_name.trim() || null,
      tags: formData.tags,
      subtasks: formData.subtasks,
      completed_at: formData.status === 'done' ? new Date().toISOString() : null
    };

    if (editingId) {
      const { error } = await supabase
        .from('admin_tasks')
        .update(payload)
        .eq('id', editingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('admin_tasks')
      .insert([payload]);

    if (error) throw error;
  },

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const { error } = await supabase
      .from('admin_tasks')
      .update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('admin_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
