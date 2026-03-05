import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Notes',
  description: 'Personal AI note-keeping assistant via WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
