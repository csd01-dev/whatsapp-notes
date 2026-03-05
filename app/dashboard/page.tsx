'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Trash2, Mic, MicOff, Send, Plus, X, Check,
  LogOut, Notebook, CheckSquare, MessageSquare, ChevronDown,
  ChevronUp, Tag, Calendar, AlertCircle, Volume2,
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

function priorityColor(p: string) {
  return p === 'high' ? 'bg-red-500' : p === 'low' ? 'bg-green-500' : 'bg-yellow-500';
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
      const res = await fetch(`/api/notes?phone=${encodeURIComponent(phone.trim())}&limit=1`);
      if (!res.ok) throw new Error('Failed');
      onLogin(phone.trim());
    } catch {
      setError('Could not find your account. Make sure you\'ve sent a message to the WhatsApp bot first.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">📝</div>
          <h1 className="text-3xl font-bold text-white">Notes AI</h1>
          <p className="text-slate-400 mt-2 text-sm">Your personal AI assistant</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
          <h2 className="text-white font-semibold text-lg mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-5">Enter the WhatsApp number you use with the bot</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">WhatsApp Number</label>
              <input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Checking...' : 'Open Dashboard →'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          No password needed — just your WhatsApp number
        </p>
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ phone }: { phone: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/notes?phone=${encodeURIComponent(phone)}&search=${encodeURIComponent(q)}&limit=50`
        : `/api/notes?phone=${encodeURIComponent(phone)}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

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

  // Collect all unique tags
  const allTags = [...new Set(notes.flatMap(n => n.tags))].filter(Boolean);

  const displayed = activeTag
    ? notes.filter(n => n.tags.includes(activeTag))
    : notes;

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
        />
        {search && (
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!activeTag ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${activeTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              <Tag size={10} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">{search ? 'No notes match your search' : 'No notes yet. Start chatting with your WhatsApp bot!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(note => (
            <div
              key={note.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                  className="text-white font-medium text-sm text-left flex-1 leading-snug"
                >
                  {note.summary || note.content.slice(0, 80)}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {note.source === 'voice' && (
                    <span title="Voice note" className="text-slate-500">
                      <Volume2 size={13} />
                    </span>
                  )}
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={deletingId === note.id}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                    className="text-slate-500 hover:text-white transition-colors p-1"
                  >
                    {expandedId === note.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === note.id && (
                <div className="mt-2 mb-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap border-t border-slate-700 pt-2">
                  {note.content}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-500 text-xs">{formatDate(note.created_at)}</span>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {note.tags.map(tag => (
                      <span key={tag} className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ phone }: { phone: string }) {
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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?phone=${encodeURIComponent(phone)}&filter=${filter}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [phone, filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function addTask() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        title: newTitle.trim(),
        description: newDesc.trim(),
        due_date: newDue ? new Date(newDue).toISOString() : undefined,
        priority: newPriority,
      }),
    });
    if (res.ok) {
      setNewTitle(''); setNewDesc(''); setNewDue(''); setNewPriority('normal');
      setShowAddForm(false);
      await fetchTasks();
    }
    setSaving(false);
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
      {/* Filter tabs + Add button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['pending', 'today', 'all', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-slate-800 border border-indigo-600/50 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium text-sm">New Task</h3>
          <input
            type="text"
            placeholder="Task title *"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
            />
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as 'low' | 'normal' | 'high')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? 'Adding...' : 'Add Task'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="bg-slate-800 rounded-xl h-14 animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm">
            {filter === 'completed' ? 'No completed tasks yet' :
             filter === 'today' ? 'No tasks due today' :
             'No tasks yet. Add one above or ask the WhatsApp bot!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`bg-slate-800 border rounded-xl px-4 py-3 flex items-start gap-3 transition-colors ${task.is_completed ? 'border-slate-700 opacity-60' : 'border-slate-700 hover:border-slate-600'}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleComplete(task)}
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.is_completed ? 'border-green-500 bg-green-500' : 'border-slate-500 hover:border-indigo-400'}`}
              >
                {task.is_completed && <Check size={11} className="text-white" strokeWidth={3} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === task.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditTitle(task); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 bg-slate-700 text-white text-sm px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => saveEditTitle(task)} className="text-green-400 hover:text-green-300"><Check size={15} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white"><X size={15} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    className={`text-sm font-medium text-left w-full ${task.is_completed ? 'line-through text-slate-500' : 'text-white'}`}
                  >
                    {task.title}
                  </button>
                )}

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Priority dot */}
                  <span className={`w-2 h-2 rounded-full ${priorityColor(task.priority)}`} title={task.priority} />

                  {/* Due date */}
                  {task.due_date && (
                    <span className={`flex items-center gap-1 text-xs ${isOverdue(task.due_date) && !task.is_completed ? 'text-red-400' : 'text-slate-500'}`}>
                      <Calendar size={10} />
                      {formatDateTime(task.due_date)}
                    </span>
                  )}

                  {/* Description */}
                  {task.description && (
                    <span className="text-slate-500 text-xs truncate max-w-[180px]">{task.description}</span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteTask(task.id)}
                className="shrink-0 text-slate-600 hover:text-red-400 transition-colors p-1"
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
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: msg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Sorry, no response.',
        timestamp: Date.now(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {};
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
          if (data.text) {
            setInput(data.text);
          }
        } catch {
          // silently fail
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 pt-3 border-t border-slate-700">
        <div className="flex-1 relative">
          <textarea
            value={transcribing ? 'Transcribing...' : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask anything... (Enter to send)"
            rows={1}
            disabled={loading || transcribing}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm resize-none leading-5 max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Mic button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading || transcribing}
          className={`shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50 ${
            recording
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={recording ? 'Stop recording' : 'Voice input'}
        >
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Send button */}
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="shrink-0 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add Modal ──────────────────────────────────────────────────────────

function QuickAddModal({
  phone,
  onClose,
  onSuccess,
}: {
  phone: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' } : {};
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
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone access required');
    }
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setMode('note')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'note' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}
          >
            📝 Note
          </button>
          <button
            onClick={() => setMode('task')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'task' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}
          >
            ✅ Task
          </button>
        </div>

        {/* Input */}
        <textarea
          value={transcribing ? 'Transcribing...' : text}
          onChange={e => setText(e.target.value)}
          placeholder={mode === 'note' ? 'Type a note...' : 'Task title...'}
          rows={3}
          disabled={recording || transcribing}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            className={`p-3 rounded-xl transition-colors ${recording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            {recording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving...' : `Save ${mode === 'note' ? 'Note' : 'Task'}`}
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-400 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [phone, setPhone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'chat'>('notes');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('wa_phone');
    if (saved) setPhone(saved);
  }, []);

  function handleLogin(p: string) {
    localStorage.setItem('wa_phone', p);
    setPhone(p);
  }

  function handleLogout() {
    localStorage.removeItem('wa_phone');
    setPhone(null);
  }

  // Avoid SSR mismatch
  if (!mounted) return null;

  if (!phone) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id: 'notes' as const, label: 'Notes', icon: Notebook },
    { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <h1 className="text-white font-bold text-lg">Notes AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full border border-slate-700 max-w-[140px] truncate">
            {phone}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24">
        {activeTab === 'notes' && <NotesTab key={refreshKey} phone={phone} />}
        {activeTab === 'tasks' && <TasksTab key={refreshKey} phone={phone} />}
        {activeTab === 'chat' && <ChatTab phone={phone} />}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-30">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB — only on notes and tasks tabs */}
      {activeTab !== 'chat' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/50 flex items-center justify-center z-40 transition-all active:scale-95"
        >
          <Plus size={24} />
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
