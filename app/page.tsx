import Link from 'next/link';

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="text-5xl mb-3">📝</div>
        <h1 className="text-white text-2xl font-bold mb-1">Notes AI</h1>
        <p className="text-slate-400 text-sm mb-6">Your personal AI note assistant is live.</p>

        {/* Dashboard CTA */}
        <Link
          href="/dashboard"
          className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-center mb-6"
        >
          Open Dashboard →
        </Link>

        {/* Status */}
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-4 py-2 mb-6 flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Webhook active at /api/webhook</span>
        </div>

        {/* Capabilities */}
        <div className="text-left">
          <p className="text-slate-300 text-sm font-semibold mb-2">Your bot can:</p>
          <ul className="text-slate-400 text-sm space-y-1.5">
            <li>📝 Save notes, ideas, and reminders via text</li>
            <li>🎤 Transcribe and save voice notes</li>
            <li>✅ Create and manage tasks &amp; reminders</li>
            <li>🔍 Search your notes by keyword</li>
            <li>🗑️ Delete or update notes and tasks</li>
          </ul>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-6">
        Install as app: open dashboard on mobile → Add to Home Screen
      </p>
    </div>
  );
}
