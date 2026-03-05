import Anthropic from '@anthropic-ai/sdk';
import {
  saveNote,
  searchNotes,
  listRecentNotes,
  deleteNote,
  updateNote,
  getConversationHistory,
  saveConversationMessage,
} from './notes';
import {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from './tasks';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

// ─────────────────────────────────────────
// Tool definitions for Claude
// ─────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'save_note',
    description:
      'Save a new note, reminder, idea, task, or any information the user wants to remember. Use this whenever the user shares something they want stored.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The full content of the note exactly as the user shared it',
        },
        summary: {
          type: 'string',
          description: 'A concise one-line summary (max 80 chars)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Relevant tags e.g. ["reminder", "work", "idea", "meeting", "personal", "shopping"]',
        },
      },
      required: ['content', 'summary'],
    },
  },
  {
    name: 'search_notes',
    description:
      'Search the user\'s saved notes by keywords, topics, or tags. Use when the user asks "what did I note about...", "find my notes on...", "do I have anything about..."',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Keywords or topic to search for',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_recent_notes',
    description:
      'List the most recent notes. Use when the user asks "show my notes", "what have I saved recently", "list everything".',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Number of notes to return (default 5, max 10)',
        },
      },
    },
  },
  {
    name: 'update_note',
    description: 'Update the content of an existing note by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'ID of the note to update' },
        content: { type: 'string', description: 'New content for the note' },
        summary: { type: 'string', description: 'New summary for the note' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated tags',
        },
      },
      required: ['note_id'],
    },
  },
  {
    name: 'delete_note',
    description:
      'Permanently delete a note by its ID. Only use after confirming with the user which note to delete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'ID of the note to delete' },
      },
      required: ['note_id'],
    },
  },
  // ── Task tools ──
  {
    name: 'create_task',
    description:
      'Create a new task or reminder. Use when the user says "remind me", "task", "todo", "don\'t forget", or mentions something to be done by a certain time/date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short task title' },
        description: { type: 'string', description: 'Additional details about the task' },
        due_date: {
          type: 'string',
          description: 'ISO 8601 date-time string e.g. "2025-03-15T09:00:00+05:30". Use IST timezone.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          description: 'Priority level (default: normal)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description:
      'List the user\'s tasks/reminders. Use when the user asks "show my tasks", "what do I need to do", "pending tasks", "reminders".',
    input_schema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'pending', 'completed', 'today'],
          description: 'Filter tasks: pending (not done), completed, today (due today), or all',
        },
      },
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed or uncompleted by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'ID of the task to update' },
        completed: {
          type: 'boolean',
          description: 'true to mark done, false to mark undone (default: true)',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'ID of the task to delete' },
      },
      required: ['task_id'],
    },
  },
];

// ─────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────

function getSystemPrompt(): string {
  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `You are a personal AI assistant on WhatsApp.
You help the user save notes, manage tasks/reminders, and find things they've saved.

Current date/time (IST): ${now}

Guidelines:
- Keep responses SHORT and WhatsApp-friendly (no heavy markdown, no asterisks for bold)
- When saving a note: "Saved! 📝 [summary]"
- When creating a task: "Task added! ✅ [title]" + mention due date if set
- When listing notes, use a numbered list with summary and date
- When listing tasks, use checkboxes: ☑ done, ☐ pending — include due date if set
- If the message mentions "remind me", "task", "todo", "don't forget" → create_task (not save_note)
- If the message is clearly a note/idea/info to remember → save_note
- Support Hindi messages too — save as-is
- Be conversational and friendly

Note commands:
- "show notes" / "list all" → list_recent_notes
- "find [topic]" → search_notes
- "delete note [x]" → confirm then delete_note

Task commands:
- "show tasks" / "my reminders" → list_tasks (filter: pending)
- "done with [task]" → complete_task
- "delete task [x]" → delete_task
- "remind me to [x] at [time]" → create_task with due_date`;
}

// ─────────────────────────────────────────
// Main processor
// ─────────────────────────────────────────

export async function processWhatsAppMessage(
  userId: string,
  message: string,
  source: 'text' | 'voice' = 'text'
): Promise<string> {
  // Prepend voice indicator so Claude knows it was transcribed
  const processedMessage =
    source === 'voice' ? `[Voice note transcribed]: ${message}` : message;

  // Save user message to history
  await saveConversationMessage(userId, 'user', processedMessage);

  // Load last 10 conversation turns as context
  const history = await getConversationHistory(userId, 10);

  // Build messages array (history already includes this user turn since we saved above)
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // If history is empty or last message isn't the one we just saved, add it
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== processedMessage) {
    messages.push({ role: 'user', content: processedMessage });
  }

  let currentMessages = [...messages];

  // ── Agentic tool-use loop ──
  while (true) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: getSystemPrompt(),
      tools,
      messages: currentMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      const replyText = textBlock?.type === 'text' ? textBlock.text : 'Done!';
      await saveConversationMessage(userId, 'assistant', replyText);
      return replyText;
    }

    if (response.stop_reason === 'tool_use') {
      currentMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let result = '';
        const input = block.input as Record<string, unknown>;

        try {
          switch (block.name) {
            case 'save_note': {
              const noteId = await saveNote(userId, {
                content: input.content as string,
                summary: input.summary as string,
                tags: (input.tags as string[]) ?? [],
                source,
              });
              result = JSON.stringify({ success: true, note_id: noteId });
              break;
            }

            case 'search_notes': {
              const results = await searchNotes(
                userId,
                input.query as string,
                (input.limit as number) ?? 5
              );
              result = JSON.stringify(
                results.map((n) => ({
                  id: n.id,
                  summary: n.summary,
                  content: n.content,
                  tags: n.tags,
                  saved_on: new Date(n.created_at).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  }),
                }))
              );
              break;
            }

            case 'list_recent_notes': {
              const notes = await listRecentNotes(
                userId,
                (input.limit as number) ?? 5
              );
              result = JSON.stringify(
                notes.map((n) => ({
                  id: n.id,
                  summary: n.summary,
                  tags: n.tags,
                  saved_on: new Date(n.created_at).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                  }),
                }))
              );
              break;
            }

            case 'update_note': {
              await updateNote(userId, input.note_id as string, {
                content: input.content as string | undefined,
                summary: input.summary as string | undefined,
                tags: input.tags as string[] | undefined,
              });
              result = JSON.stringify({ success: true });
              break;
            }

            case 'delete_note': {
              await deleteNote(userId, input.note_id as string);
              result = JSON.stringify({ success: true });
              break;
            }

            case 'create_task': {
              const taskId = await createTask(userId, {
                title: input.title as string,
                description: input.description as string | undefined,
                due_date: input.due_date as string | undefined,
                priority: input.priority as 'low' | 'normal' | 'high' | undefined,
              });
              result = JSON.stringify({ success: true, task_id: taskId });
              break;
            }

            case 'list_tasks': {
              const tasks = await listTasks(
                userId,
                (input.filter as 'all' | 'pending' | 'completed' | 'today') ?? 'all'
              );
              result = JSON.stringify(
                tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  due_date: t.due_date
                    ? new Date(t.due_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    : null,
                  is_completed: t.is_completed,
                  priority: t.priority,
                  created_at: new Date(t.created_at).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                  }),
                }))
              );
              break;
            }

            case 'complete_task': {
              await toggleTaskComplete(
                userId,
                input.task_id as string,
                (input.completed as boolean) ?? true
              );
              result = JSON.stringify({ success: true });
              break;
            }

            case 'delete_task': {
              await deleteTask(userId, input.task_id as string);
              result = JSON.stringify({ success: true });
              break;
            }

            default:
              result = JSON.stringify({ error: 'Unknown tool' });
          }
        } catch (err) {
          result = JSON.stringify({ error: String(err) });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return "Sorry, something went wrong. Please try again.";
}
