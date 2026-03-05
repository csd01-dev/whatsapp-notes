import { supabase } from './supabase';

export interface Note {
  id: string;
  user_id: string;
  content: string;
  summary: string;
  tags: string[];
  source: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

// ─────────────────────────────────────────
// User management
// ─────────────────────────────────────────

export async function getOrCreateUser(phone: string): Promise<User> {
  const { data: existing } = await supabase
    .from('wa_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existing) return existing as User;

  const { data: newUser, error } = await supabase
    .from('wa_users')
    .insert({ phone })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return newUser as User;
}

// ─────────────────────────────────────────
// Notes CRUD
// ─────────────────────────────────────────

export async function saveNote(
  userId: string,
  note: { content: string; summary: string; tags: string[]; source?: string }
): Promise<string> {
  const { data, error } = await supabase
    .from('wa_notes')
    .insert({
      user_id: userId,
      content: note.content,
      summary: note.summary,
      tags: note.tags ?? [],
      source: note.source ?? 'text',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save note: ${error.message}`);
  return data.id;
}

export async function searchNotes(
  userId: string,
  query: string,
  limit = 5
): Promise<Note[]> {
  const { data, error } = await supabase
    .from('wa_notes')
    .select('*')
    .eq('user_id', userId)
    .neq('source', 'task')
    .or(`content.ilike.%${query}%,summary.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 50));

  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data ?? []) as Note[];
}

export async function listRecentNotes(userId: string, limit = 5): Promise<Note[]> {
  const { data, error } = await supabase
    .from('wa_notes')
    .select('*')
    .eq('user_id', userId)
    .neq('source', 'task')  // exclude tasks — they show in the Tasks tab
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 200));

  if (error) throw new Error(`List failed: ${error.message}`);
  return (data ?? []) as Note[];
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const { error } = await supabase
    .from('wa_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId); // Security: only delete own notes

  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: { content?: string; summary?: string; tags?: string[] }
): Promise<void> {
  const { error } = await supabase
    .from('wa_notes')
    .update(updates)
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw new Error(`Update failed: ${error.message}`);
}

export async function getNoteCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('wa_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}

// ─────────────────────────────────────────
// Conversation history
// ─────────────────────────────────────────

export async function getConversationHistory(
  userId: string,
  limit = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data, error } = await supabase
    .from('wa_conversations')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Reverse to chronological order, then ensure starts with 'user'
  const history = data.reverse() as Array<{ role: 'user' | 'assistant'; content: string }>;
  const startIdx = history.findIndex((m) => m.role === 'user');
  return startIdx === -1 ? [] : history.slice(startIdx);
}

export async function saveConversationMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await supabase
    .from('wa_conversations')
    .insert({ user_id: userId, role, content });

  // Keep conversation history trimmed to last 30 messages per user
  const { data: old } = await supabase
    .from('wa_conversations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(30, 1000);

  if (old && old.length > 0) {
    await supabase
      .from('wa_conversations')
      .delete()
      .in('id', old.map((r) => r.id));
  }
}
