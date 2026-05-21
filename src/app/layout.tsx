import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATISA — KPIs Call Center',
  description: 'Dashboard de indicadores del Call Center ATISA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
