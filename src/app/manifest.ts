import type { MetadataRoute } from 'next';

/**
 * Manifest do PWA.
 *
 * `display: standalone` é o que faz o Mikasa abrir sem barra de navegador
 * quando instalado na tela inicial — a diferença entre "um site" e "um app".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mikasa — organize sua vida',
    short_name: 'Mikasa',
    description:
      'Finanças, treinos, estudos, trabalho, metas e rotina em um único lugar.',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F6F3',
    theme_color: '#F7F6F3',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['productivity', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Hoje', url: '/hoje', description: 'O que importa hoje' },
      { name: 'Vida', url: '/vida', description: 'Como as coisas se conectam' },
    ],
  };
}
