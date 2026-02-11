import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from '@/components/providers/session-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'greek'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// Viewport must be exported separately in Next.js 14+
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#06b6d4',
};

export const metadata: Metadata = {
  title: 'KK Tires CRM - Διαχείριση Πελατών',
  description: 'Το πιο σύγχρονο CRM για επιχειρήσεις ελαστικών στην Ελλάδα. Διαχείριση πελατών, email marketing, χάρτες και στατιστικά.',
  keywords: ['CRM', 'ελαστικά', 'πελάτες', 'email marketing', 'Ελλάδα'],
  authors: [{ name: 'KK Tires' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KK Tires CRM',
  },
  openGraph: {
    title: 'KK Tires CRM',
    description: 'Διαχείριση Πελατών για Επιχειρήσεις Ελαστικών',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const raw = localStorage.getItem('kktires-ui');
                  const parsed = raw ? JSON.parse(raw) : null;
                  const theme = parsed?.state?.theme;
                  const t = theme === 'light' || theme === 'dark' ? theme : 'dark';
                  document.documentElement.setAttribute('data-theme', t);
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(t);
                } catch (_) {
                  // no-op
                }
              })();
            `,
          }}
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('SW registered:', registration.scope);
                    })
                    .catch((error) => {
                      console.log('SW registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
