import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { AppProvider } from '@/context/AppContext';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'FocusFlow — Productivity Calendar',
  description: 'Plan your day, manage tasks, and track focused work time in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased font-sans">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
