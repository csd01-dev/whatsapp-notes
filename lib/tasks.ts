/**
 * Tasks stored in the existing wa_notes table using source='task' + JSON content.
 * No new table needed — works with the existing Supabase schema.
 *
 * Layout in wa_notes:
 *   source  = 'task'
 *   content = JSON: { title, description, due_date, is_completed, priority }
 *   summary = task title  (for quick display)
 *   tags    = ['__task__', 'priority:high' | 'priority:normal' | 'priority:low']
 */

import { supabase } from './supabase';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function rowToTask(row: Record<string, unknown>): Task {
  let parsed: Partial<Task> = {};
  try {
    parsed = JSON.parse(row.content as string);
  } catch {
    parsed = { title: (row.summary as string) || 'Untitled' };
  }
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: parsed.title ?? (row.summary as string) ?? 'Untitled',
    description: parsed.description ?? '',
    due_date: parsed.due_date ?? null,
    is_completed: parsed.is_completed ?? false,
    priority: parsed.priority ?? 'normal',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function taskToContent(task: Partial<Task>) {
  return JSON.stringify({
    title: task.title ?? '',
    description: task.description ?? '',
    due_date: task.due_date ?? null,
    is_completed: task.is_completed ?? false,
    priority: task.priority ?? 'normal',
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createTask(
  userId: string,
  task: {
    title: string;
    description?: string;
    due_date?: string | null;
    priority?: 'low' | 'normal' | 'high';
  }
): Promise<string> {
  const priority = task.priority ?? 'normal';
  const { data, error } = await supabase
    .from('wa_notes')
    .insert({
      user_id: userId,
      source: 'task',
      summary: task.title,
      content: taskToContent({ ...task, is_completed: false, priority }),
      tags: ['__task__', `priority:${priority}`],
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data.id;
}

export async function listTasks(
  userId: string,
  filter: 'all' | 'pending' | 'completed' | 'today' = 'all'
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('wa_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'task')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  const tasks = (data ?? []).map(rowToTask);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  switch (filter) {
    case 'pending':
      return tasks.filter(t => !t.is_completed);
    case 'completed':
      return tasks.filter(t => t.is_completed);
    case 'today':
      return tasks.filter(t => {
        if (t.is_completed || !t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= todayStart && d < todayEnd;
      });
    default:
      return tasks;
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    due_date?: string | null;
    priority?: 'low' | 'normal' | 'high';
    is_completed?: boolean;
  }
): Promise<void> {
  // Fetch existing to merge
  const { data: existing, error: fetchErr } = await supabase
    .from('wa_notes')
    .select('content, summary')
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('source', 'task')
    .single();

  if (fetchErr || !existing) throw new Error('Task not found');

  let current: Partial<Task> = {};
  try { current = JSON.parse(existing.content); } catch { /* ignore */ }

  const merged: Partial<Task> = { ...current, ...updates };
  const priority = merged.priority ?? 'normal';

  const { error } = await supabase
    .from('wa_notes')
    .update({
      summary: merged.title ?? existing.summary,
      content: taskToContent(merged),
      tags: ['__task__', `priority:${priority}`],
    })
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('wa_notes')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('source', 'task');

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

export async function toggleTaskComplete(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  await updateTask(userId, taskId, { is_completed: completed });
}
