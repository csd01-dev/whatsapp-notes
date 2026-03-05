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

  return `You are a personal note-keeping assistant on WhatsApp.
You help the user save, find, and manage their notes, reminders, and ideas.

Current date/time (IST): ${now}

Guidelines:
- Keep responses SHORT and WhatsApp-friendly (no heavy markdown, no asterisks for bold)
- When saving a note, briefly confirm: e.g. "Saved! 📝 [summary]"
- When listing notes, use a numbered list with summary and date
- When searching, show matches with a short excerpt
- If the message is clearly a note/reminder/idea, save it automatically without asking
- Support Hindi messages too — transcribe and save as-is
- For reminders, note the time/date mentioned in the content
- Be conversational and friendly

Commands the user might use:
- "show notes" / "list all" → list_recent_notes
- "find [topic]" / "search [topic]" → search_notes
- "delete [note]" → confirm then delete_note
- "clear all" → list then ask for confirmation before deleting
- Anything else → likely a new note to save`;
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
