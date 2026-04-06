import './globals.css';
import { ProfileProvider } from '../src/context/profilecontext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Media Tracker',
  description: 'Organizador de Animes, Mangás e Fanfics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <ProfileProvider>
          {children}
        </ProfileProvider>
      </body>
    </html>
  );
}