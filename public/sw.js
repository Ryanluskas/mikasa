/*
  Service worker do Mikasa.

  A decisão mais importante deste arquivo é o que ele NÃO guarda.

  O Mikasa mostra dinheiro, treinos, relacionamentos e como a pessoa está se
  sentindo. Se as telas autenticadas fossem para o cache, elas ficariam no
  disco depois do logout — e num aparelho compartilhado a próxima pessoa
  abriria o app offline e leria tudo. Por isso:

    - HTML autenticado: NUNCA vai para o cache. É sempre rede primeiro, e
      quando a rede falha servimos uma tela offline neutra.
    - Respostas da API: NUNCA vão para o cache, pelo mesmo motivo.
    - Só entram no cache os arquivos que são iguais para todo mundo: o
      casco do app, os ícones, a arte da marca, os estáticos do Next.

  Isso significa que o Mikasa offline mostra uma tela honesta em vez de dados
  velhos. É menos impressionante e é o comportamento certo.
*/

const VERSAO = 'mikasa-v1';
const CACHE_CASCO = `${VERSAO}-casco`;
const CACHE_ESTATICO = `${VERSAO}-estatico`;

/** O mínimo para a tela offline existir sem rede. */
const CASCO = [
  '/offline',
  '/tema.js',
  '/brand/mikasa.png',
  '/icon-192.png',
  '/manifest.webmanifest',
];

/**
 * Descobre o CSS e o JS de que a página offline depende.
 *
 * Guardar só o HTML de `/offline` não basta: ele referencia arquivos do Next
 * com hash no nome (`/_next/static/css/abc123.css`), que ninguém consegue
 * prever ao escrever este arquivo. Sem eles, a tela offline aparece — mas sem
 * estilo nenhum, que foi exatamente o que aconteceu na primeira versão.
 *
 * Então lemos o HTML da própria página e extraímos as URLs que ela cita.
 */
async function recursosDaPaginaOffline() {
  try {
    const resposta = await fetch('/offline', { cache: 'no-store' });
    if (!resposta.ok) return [];

    const html = await resposta.text();
    const encontrados = html.match(/\/_next\/static\/[^"'\s>]+/g) || [];

    // O HTML escapa `&` como `&amp;`; sem desfazer isso a URL não bate.
    return [...new Set(encontrados.map((u) => u.replace(/&amp;/g, '&')))];
  } catch {
    return [];
  }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_CASCO);
      const extras = await recursosDaPaginaOffline();

      // `addAll` falha inteiro se um item falhar; aqui cada um é opcional,
      // porque um ícone ausente não pode impedir o worker de instalar.
      await Promise.allSettled(
        [...CASCO, ...extras].map((url) => cache.add(url)),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      // Remove caches de versões anteriores.
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((n) => n.startsWith('mikasa-') && !n.startsWith(VERSAO))
          .map((n) => caches.delete(n)),
      );

      // Deixa o navegador começar a buscar a página enquanto o worker acorda.
      // Sem isto, cada navegação paga a latência de inicializar o worker antes
      // de a requisição sequer sair.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

/**
 * Mensagem vinda da aplicação.
 *
 * `limpar-tudo` é disparada no logout e na exclusão de conta: mesmo não
 * guardando dado pessoal, zerar o cache no logout é a garantia de que nada
 * daquela sessão sobrou no aparelho.
 */
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'limpar-tudo') {
    evento.waitUntil(
      caches.keys().then((nomes) => Promise.all(nomes.map((n) => caches.delete(n)))),
    );
  }
});

function ehEstaticoDoNext(url) {
  return url.pathname.startsWith('/_next/static/');
}

function ehAssetProprio(url) {
  return (
    url.pathname === '/tema.js' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/brand/') ||
    /^\/(icon|apple-touch-icon|favicon)/.test(url.pathname)
  );
}

self.addEventListener('fetch', (evento) => {
  const req = evento.request;

  // Só GET. POST/PATCH/DELETE nunca passam por cache.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nada de outra origem.
  if (url.origin !== self.location.origin) return;

  // A API carrega dados pessoais. Passa direto, sem tocar no cache.
  if (url.pathname.startsWith('/api/')) return;

  // ── Estáticos: cache primeiro ──────────────────────────────────────────────
  // Os arquivos do Next têm hash no nome, então o conteúdo nunca muda para
  // uma mesma URL — cache primeiro é seguro e é o que deixa a abertura rápida.
  if (ehEstaticoDoNext(url) || ehAssetProprio(url)) {
    evento.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ||
          fetch(req).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE_ESTATICO).then((c) => c.put(req, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // ── Navegação: rede primeiro, tela offline como rede de segurança ──────────
  if (req.mode === 'navigate') {
    evento.respondWith(
      (async () => {
        try {
          // `preloadResponse` evita uma segunda ida à rede quando o navegador
          // já começou a buscar a página antes do worker acordar.
          const preload = await evento.preloadResponse;
          if (preload) return preload;
          return await fetch(req);
        } catch {
          const offline = await caches.match('/offline');
          return (
            offline ||
            new Response(
              '<!doctype html><meta charset="utf-8"><title>Sem conexão</title>' +
                '<p style="font:16px system-ui;padding:2rem">Você está sem conexão.</p>',
              { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
            )
          );
        }
      })(),
    );
  }
});
