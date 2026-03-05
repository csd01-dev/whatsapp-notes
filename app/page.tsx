export default function StatusPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f4f8',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2.5rem 3rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📝</div>
        <h1 style={{ margin: '0 0 0.5rem', color: '#1a1a2e', fontSize: '1.6rem' }}>
          WhatsApp Notes
        </h1>
        <p style={{ color: '#666', margin: '0 0 1.5rem' }}>
          Your personal AI note assistant is live.
        </p>

        <div
          style={{
            background: '#e8f5e9',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 500 }}>
            ● Webhook active at /api/webhook
          </span>
        </div>

        <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#444' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>What your bot can do:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.8' }}>
            <li>Save notes, reminders, ideas via text</li>
            <li>Transcribe and save voice notes</li>
            <li>Search your notes by keyword</li>
            <li>List recent saves</li>
            <li>Delete or update notes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
