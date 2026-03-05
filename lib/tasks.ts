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

// ─────────────────────────────────────────
// Task CRUD
// ─────────────────────────────────────────

export async function createTask(
  userId: string,
  task: {
    title: string;
    description?: string;
    due_date?: string | null;
    priority?: 'low' | 'normal' | 'high';
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('wa_tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description ?? '',
      due_date: task.due_date ?? null,
      priority: task.priority ?? 'normal',
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
  let query = supabase
    .from('wa_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('is_completed', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filter === 'pending') {
    query = query.eq('is_completed', false);
  } else if (filter === 'completed') {
    query = query.eq('is_completed', true);
  } else if (filter === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    query = query
      .eq('is_completed', false)
      .gte('due_date', todayStart.toISOString())
      .lte('due_date', todayEnd.toISOString());
  }

  const { data, error } = await query.limit(50);
  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  return (data ?? []) as Task[];
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
  const { error } = await supabase
    .from('wa_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('wa_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

export async function toggleTaskComplete(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const { error } = await supabase
    .from('wa_tasks')
    .update({ is_completed: completed })
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to toggle task: ${error.message}`);
}
