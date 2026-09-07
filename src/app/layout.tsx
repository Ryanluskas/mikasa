import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider, AvisoDeConexao } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Mikasa — organize sua vida',
    template: '%s · Mikasa',
  },
  description:
    'Finanças, treinos, estudos, trabalho, metas e rotina em um único lugar. E, principalmente, como tudo isso se conecta.',
  applicationName: 'Mikasa',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mikasa',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // `viewportFit: cover` deixa o app usar a área do notch; o CSS cuida das
  // margens seguras.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F3' },
    { media: '(prefers-color-scheme: dark)', color: '#171613' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/*
          Aplica o tema ANTES da primeira pintura, senão quem usa tema escuro
          vê um flash branco a cada carregamento.

          É um arquivo estático, e não um script inline, porque a CSP do app
          não libera inline — e resolver isso com nonce tornaria toda página
          dinâmica. Veja o comentário dentro de public/tema.js.
        */}
        {/*
          eslint-disable-next-line @next/next/no-sync-scripts --
          A regra existe para impedir scripts bloqueantes por descuido. Aqui o
          bloqueio é justamente o ponto: se este arquivo carregasse de forma
          assíncrona, o navegador pintaria a tela clara antes de saber que o
          usuário escolheu tema escuro. São ~400 bytes, do próprio domínio,
          cacheados depois da primeira visita.
        */}
        <script src="/tema.js" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {/* Pular para o conteúdo: o primeiro Tab de quem usa teclado. */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-bg"
        >
          Pular para o conteúdo
        </a>
        <ToastProvider>
          <AvisoDeConexao />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
