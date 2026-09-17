import './globals.css';
import type { Metadata } from 'react';

export const metadata: Metadata = {
  title: 'Vault.io - Professional Media Vault',
  description: 'Persistent database cloud storage alternative',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
