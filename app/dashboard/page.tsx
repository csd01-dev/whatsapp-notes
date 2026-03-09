'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Trash2, Mic, MicOff, Send, Plus, X, Check,
  LogOut, ChevronRight, Tag, Calendar, AlertCircle, Volume2,
  CalendarDays, Home, FileText, CheckSquare, MessageSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  content: string;
  summary: string;
  tags: string[];
  source: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function isOverdue(due_date: string | null) {
  if (!due_date) return false;
  return new Date(due_date) < new Date();
}

function priorityDot(p: string) {
  return p === 'high' ? 'bg-red-500' : p === 'low' ? 'bg-green-500' : 'bg-amber-400';
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (phone: string) => void }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const raw = phone.trim();
      const waPhone = raw.startsWith('whatsapp:') ? raw : `whatsapp:${raw}`;
      const res1 = await fetch(`/api/notes?phone=${encodeURIComponent(waPhone)}&limit=1`);
      const data1 = await res1.json();
      if (data1.userId) { onLogin(waPhone); return; }

      const res2 = await fetch(`/api/notes?phone=${encodeURIComponent(raw)}&limit=1`);
      const data2 = await res2.json();
      if (data2.userId) { onLogin(raw); return; }

      setError('Account not found. Send a message to the WhatsApp bot first.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Notes AI</h1>
          <p className="text-gray-500 mt-1 text-sm">Your personal AI assistant</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-gray-900 font-semibold text-base mb-1">Sign In</h2>
          <p className="text-gray-400 text-sm mb-5">Enter your WhatsApp number.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="tel"
              placeholder="+91 98206 54756"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-base bg-gray-50"
              autoFocus
            />

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Checking...' : 'Open Dashboard →'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          No password needed — just your WhatsApp number
        </p>
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({
  phone,
  calendarConnected,
  calendarEvents,
  onNavigate,
}: {
  phone: string;
  calendarConnected: boolean;
  calendarEvents: CalendarEvent[];
  onNavigate: (tab: 'notes' | 'tasks' | 'chat') => void;
}) {
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [notesRes, tasksRes] = await Promise.all([
          fetch(`/api/notes?phone=${encodeURIComponent(phone)}&limit=4`),
          fetch(`/api/tasks?phone=${encodeURIComponent(phone)}&filter=today`),
        ]);
        const notesData = await notesRes.json();
        const tasksData = await tasksRes.json();
        setRecentNotes(notesData.notes ?? []);
        setTodayTasks(tasksData.tasks ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [phone]);

  const nextEvent = calendarEvents[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar next event */}
      {calendarConnected && nextEvent && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays size={17} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-indigo-900 font-medium text-sm truncate">{nextEvent.title}</p>
            <p className="text-indigo-500 text-xs mt-0.5">
              {new Date(nextEvent.start).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Notes section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Notes</h2>
          <button onClick={() => onNavigate('notes')} className="text-indigo-600 text-xs font-medium flex items-center gap-0.5">
            All <ChevronRight size={13} />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100" />)}
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-6 text-center">
            <p className="text-gray-400 text-sm">No notes yet</p>
            <p className="text-gray-300 text-xs mt-1">Send a message to your WhatsApp bot</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            {recentNotes.map(note => (
              <button
                key={note.id}
                onClick={() => onNavigate('notes')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg shrink-0">{note.source === 'voice' ? '🎤' : '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{note.summary || note.content.slice(0, 60)}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{formatDate(note.created_at)}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Tasks section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Today</h2>
          <button onClick={() => onNavigate('tasks')} className="text-indigo-600 text-xs font-medium flex items-center gap-0.5">
            All tasks <ChevronRight size={13} />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-xl h-12 animate-pulse border border-gray-100" />)}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-6 text-center">
            <p className="text-gray-400 text-sm">No tasks due today</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            {todayTasks.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDot(task.priority)}`} />
                <p className={`flex-1 text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                {task.due_date && (
                  <span className={`text-xs shrink-0 ${isOverdue(task.due_date) && !task.is_completed ? 'text-red-500' : 'text-gray-400'}`}>
                    {new Date(task.due_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Note Content Renderer ────────────────────────────────────────────────────
// Lightweight markdown renderer — handles tables, bullet lists, numbered lists,
// code blocks, and plain text. No external dependencies.

function NoteContent({ content }: { content: string }) {
  const lines = content.split('\n');

  // Detect markdown table: lines that start/end with |
  const isTableLine = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');
  const isSeparatorLine = (l: string) => /^\|[\s\-|:]+\|$/.test(l.trim());

  // Group lines into blocks
  type Block =
    | { type: 'table'; rows: string[][] }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'code'; text: string }
    | { type: 'text'; text: string };

  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    // Table
    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isSeparatorLine(lines[i])) tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map(r =>
        r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      );
      blocks.push({ type: 'table', rows });
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Plain text / empty line
    if (line.trim() === '') { i++; continue; }
    blocks.push({ type: 'text', text: line });
    i++;
  }

  return (
    <div className="space-y-2 text-sm text-gray-600">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          const [header, ...body] = block.rows;
          return (
            <div key={idx} className="overflow-x-auto w-full rounded-lg border border-gray-200">
              <table className="min-w-full text-xs border-collapse">
                {header && (
                  <thead className="bg-gray-100">
                    <tr>
                      {header.map((h, j) => (
                        <th key={j} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, c) => (
                        <td key={c} className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc list-inside space-y-0.5 pl-1">
              {block.items.map((item, j) => <li key={j} className="text-gray-600">{item}</li>)}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal list-inside space-y-0.5 pl-1">
              {block.items.map((item, j) => <li key={j} className="text-gray-600">{item}</li>)}
            </ol>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={idx} className="overflow-x-auto bg-gray-100 rounded-lg p-2 text-xs font-mono text-gray-700 whitespace-pre">{block.text}</pre>
          );
        }
        return <p key={idx} className="leading-relaxed">{block.text}</p>;
      })}
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ phone, refreshTrigger }: { phone: string; refreshTrigger: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async (q?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = q
        ? `/api/notes?phone=${encodeURIComponent(phone)}&search=${encodeURIComponent(q)}&limit=50`
        : `/api/notes?phone=${encodeURIComponent(phone)}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setNotes(data.notes ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { if (refreshTrigger > 0) fetchNotes(undefined, true); }, [refreshTrigger]);

  function handleSearch(val: string) {
    setSearch(val);
    setActiveTag(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotes(val || undefined), 350);
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    setDeletingId(id);
    await fetch(`/api/notes/${id}?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeletingId(null);
  }

  const allTags = [...new Set(notes.flatMap(n => n.tags))].filter(Boolean);
  const displayed = activeTag ? notes.filter(n => n.tags.includes(activeTag)) : notes;

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm shadow-sm"
        />
        {search && (
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!activeTag ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${activeTag === tag ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
            >
              <Tag size={9} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400 text-sm">{search ? 'No notes match your search' : 'No notes yet.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {displayed.map(note => (
            <div key={note.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                  className="flex-1 text-left"
                >
                  <p className="text-gray-900 text-sm font-medium leading-snug">
                    {note.summary || note.content.slice(0, 80)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-gray-400 text-xs">{formatDate(note.created_at)}</span>
                    {note.source === 'voice' && (
                      <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                        <Volume2 size={10} /> Voice
                      </span>
                    )}
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-indigo-500 text-xs">#{tag}</span>
                    ))}
                  </div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={deletingId === note.id}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                    className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    {expandedId === note.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {expandedId === note.id && (
                <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 overflow-x-auto">
                  <NoteContent content={note.content} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ phone, refreshTrigger }: { phone: string; refreshTrigger: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'today'>('pending');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/tasks?phone=${encodeURIComponent(phone)}&filter=${filter}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [phone, filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (refreshTrigger > 0) fetchTasks(true); }, [refreshTrigger]);

  async function addTask() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      due_date: newDue ? new Date(newDue).toISOString() : null,
      is_completed: false,
      priority: newPriority,
      created_at: new Date().toISOString(),
    };
    setTasks(prev => [optimisticTask, ...prev]);
    setNewTitle(''); setNewDesc(''); setNewDue(''); setNewPriority('normal');
    setShowAddForm(false);
    setSaving(false);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        title: optimisticTask.title,
        description: optimisticTask.description,
        due_date: optimisticTask.due_date,
        priority: optimisticTask.priority,
      }),
    });
    if (res.ok) fetchTasks(true);
  }

  async function toggleComplete(task: Task) {
    const updated = !task.is_completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: updated } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, is_completed: updated }),
    });
  }

  async function saveEditTitle(task: Task) {
    if (!editTitle.trim()) { setEditingId(null); return; }
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, title: editTitle.trim() }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: editTitle.trim() } : t));
    setEditingId(null);
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tasks/${id}?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' });
  }

  const filterLabels = { all: 'All', pending: 'Pending', today: 'Today', completed: 'Done' };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(['pending', 'today', 'all', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-indigo-300'}`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <h3 className="text-gray-900 font-semibold text-sm">New Task</h3>
          <input
            type="text"
            placeholder="Task title *"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm bg-gray-50"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm bg-gray-50"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm bg-gray-50"
            />
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as 'low' | 'normal' | 'high')}
              className="border border-gray-200 rounded-xl px-2 py-2.5 text-gray-900 focus:outline-none focus:border-indigo-400 text-sm bg-gray-50"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTask}
              disabled={saving || !newTitle.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Adding...' : 'Add Task'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-400 text-sm">
            {filter === 'completed' ? 'No completed tasks' :
             filter === 'today' ? 'Nothing due today' :
             'No tasks yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-start gap-3 px-4 py-3 ${task.is_completed ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => toggleComplete(task)}
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.is_completed ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-indigo-400'}`}
              >
                {task.is_completed && <Check size={10} className="text-white" strokeWidth={3} />}
              </button>

              <div className="flex-1 min-w-0">
                {editingId === task.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditTitle(task); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-indigo-400 focus:outline-none bg-indigo-50 text-gray-900"
                      autoFocus
                    />
                    <button onClick={() => saveEditTitle(task)} className="text-green-500 hover:text-green-600 p-1">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    className={`text-sm font-medium text-left w-full ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                  >
                    {task.title}
                  </button>
                )}

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${priorityDot(task.priority)}`} title={task.priority} />
                  {task.due_date && (
                    <span className={`flex items-center gap-1 text-xs ${isOverdue(task.due_date) && !task.is_completed ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      <Calendar size={10} />
                      {formatDateTime(task.due_date)}
                    </span>
                  )}
                  {task.description && (
                    <span className="text-gray-400 text-xs truncate max-w-[160px]">{task.description}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 mt-0.5"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ phone }: { phone: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your Notes AI assistant. Ask me anything about your notes and tasks, or tell me something new to save.', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: Date.now() }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: msg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, no response.', timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob);
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.text) setInput(data.text);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone access denied.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 160px)' }}>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-end gap-2 pt-3 border-t border-gray-100">
        <div className="flex-1 relative">
          <textarea
            value={transcribing ? 'Transcribing...' : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            disabled={loading || transcribing}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm resize-none leading-5 max-h-32 overflow-y-auto shadow-sm"
            style={{ minHeight: '44px' }}
          />
        </div>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading || transcribing}
          className={`shrink-0 p-3 rounded-xl transition-colors disabled:opacity-40 ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 shadow-sm'}`}
        >
          {recording ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="shrink-0 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add Modal ──────────────────────────────────────────────────────────

function QuickAddModal({ phone, onClose, onSuccess }: { phone: string; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'note' | 'task'>('note');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {};
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob);
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.text) setText(data.text);
        } finally { setTranscribing(false); }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { alert('Microphone access required'); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      if (mode === 'note') {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, content: text.trim(), summary: text.slice(0, 80) }),
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, title: text.trim() }),
        });
      }
      onSuccess();
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl border border-gray-100">
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          {(['note', 'task'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {m === 'note' ? '📝 Note' : '✅ Task'}
            </button>
          ))}
        </div>

        <textarea
          value={transcribing ? 'Transcribing...' : text}
          onChange={e => setText(e.target.value)}
          placeholder={mode === 'note' ? 'Type a note...' : 'Task title...'}
          rows={3}
          disabled={recording || transcribing}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm resize-none bg-gray-50"
          autoFocus
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            className={`p-3 rounded-xl transition-colors ${recording ? 'bg-red-500 text-white animate-pulse' : 'border border-gray-200 text-gray-500 hover:border-indigo-300 bg-white'}`}
          >
            {recording ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving...' : `Save ${mode === 'note' ? 'Note' : 'Task'}`}
          </button>
          <button
            onClick={onClose}
            className="p-3 border border-gray-200 text-gray-500 rounded-xl transition-colors hover:bg-gray-50 bg-white"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Strip ───────────────────────────────────────────────────────────

function CalendarStrip({
  phone,
  connected,
  events,
  onConnect,
  onDisconnect,
}: {
  phone: string;
  connected: boolean;
  events: CalendarEvent[];
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/calendar?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' });
      onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div className="mx-4 mt-3 mb-1 flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <CalendarDays size={15} />
          <span>Connect Google Calendar</span>
        </div>
        <a
          href={`/api/auth/google?phone=${encodeURIComponent(phone)}`}
          onClick={onConnect}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Connect
        </a>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 mb-1">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase tracking-wide">
          <CalendarDays size={12} />
          <span>{events.length === 0 ? 'No upcoming events' : 'Upcoming'}</span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-gray-300 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
      {events.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {events.map((ev, i) => {
            const start = new Date(ev.start);
            const timeStr = start.toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });
            return (
              <div key={i} className="shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-2 min-w-[160px] max-w-[200px] shadow-sm">
                <p className="text-gray-900 text-xs font-medium truncate">{ev.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{timeStr}</p>
                {ev.location && <p className="text-gray-400 text-xs truncate mt-0.5">{ev.location}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [phone, setPhone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'notes' | 'tasks' | 'chat'>('home');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarBanner, setCalendarBanner] = useState<'connected' | 'error' | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  async function fetchCalendar(p: string) {
    try {
      const res = await fetch(`/api/calendar?phone=${encodeURIComponent(p)}`);
      const data = await res.json();
      setCalendarConnected(data.connected ?? false);
      setCalendarEvents(data.events ?? []);
    } catch { /* calendar is optional */ }
  }

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('wa_phone');
    if (saved) setPhone(saved);

    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') setCalendarBanner('connected');
    if (params.get('calendar') === 'error') {
      setCalendarBanner('error');
      setCalendarError(params.get('reason') ?? null);
    }
    if (params.has('calendar')) window.history.replaceState({}, '', '/dashboard');
  }, []);

  useEffect(() => {
    if (phone) fetchCalendar(phone);
  }, [phone]);

  function handleLogin(p: string) {
    localStorage.setItem('wa_phone', p);
    setPhone(p);
  }

  function handleLogout() {
    localStorage.removeItem('wa_phone');
    setPhone(null);
  }

  if (!mounted) return null;
  if (!phone) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'notes' as const, label: 'Notes', icon: FileText },
    { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-sm">📝</span>
          </div>
          <h1 className="text-gray-900 font-bold text-base">Notes AI</h1>
        </div>
        <div className="flex items-center gap-2">
          {calendarConnected && (
            <span className="flex items-center gap-1 bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full border border-green-100">
              <CalendarDays size={10} />
              Cal
            </span>
          )}
          <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full max-w-[120px] truncate">
            {phone.replace('whatsapp:', '')}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Calendar banner */}
      {calendarBanner && (
        <div className={`mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${calendarBanner === 'connected' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          {calendarBanner === 'connected'
            ? '✅ Google Calendar connected!'
            : `❌ Calendar error${calendarError ? `: ${calendarError}` : ''}`}
          <button onClick={() => setCalendarBanner(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Calendar strip */}
      <CalendarStrip
        phone={phone}
        connected={calendarConnected}
        events={calendarEvents}
        onConnect={() => {}}
        onDisconnect={() => { setCalendarConnected(false); setCalendarEvents([]); }}
      />

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeTab
            phone={phone}
            calendarConnected={calendarConnected}
            calendarEvents={calendarEvents}
            onNavigate={tab => setActiveTab(tab)}
          />
        </div>
        <div className={activeTab === 'notes' ? 'block' : 'hidden'}>
          <NotesTab phone={phone} refreshTrigger={refreshKey} />
        </div>
        <div className={activeTab === 'tasks' ? 'block' : 'hidden'}>
          <TasksTab phone={phone} refreshTrigger={refreshKey} />
        </div>
        <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
          <ChatTab phone={phone} />
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB */}
      {activeTab !== 'chat' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-20 right-4 w-13 h-13 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center z-40 transition-all active:scale-95"
        >
          <Plus size={22} />
        </button>
      )}

      {/* Quick Add Modal */}
      {showModal && (
        <QuickAddModal
          phone={phone}
          onClose={() => setShowModal(false)}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
