const producao = process.env.NODE_ENV === 'production';

/**
 * A Content-Security-Policy do Mikasa.
 *
 * Sobre `'unsafe-inline'` em `script-src`, que parece uma concessão preguiçosa
 * e não é — é a única opção correta para este app:
 *
 * A versão anterior usava nonce por requisição, montado no middleware. Isso
 * QUEBRAVA a aplicação em produção, de um jeito que só aparece no build:
 * `/`, `/entrar`, `/criar-conta` e `/offline` são pré-renderizadas no build,
 * quando não existe requisição nem middleware. O HTML delas sai sem nonce,
 * mas em tempo de execução chegava uma CSP exigindo nonce — então TODO script
 * inline do Next era bloqueado, o React nunca hidratava, e nenhum componente
 * cliente funcionava. Em desenvolvimento o problema não aparece, porque lá
 * tudo é renderizado por requisição.
 *
 * Nonce e pré-renderização estática são incompatíveis por construção. As
 * saídas eram: tornar todas as páginas dinâmicas (perder a landing estática
 * por causa de um header), ou aceitar `'unsafe-inline'`.
 *
 * O que isso custa aqui, concretamente: o projeto não tem um único
 * `dangerouslySetInnerHTML` e não renderiza HTML de usuário em lugar nenhum —
 * o React escapa tudo. O ganho real do nonce sobre `'self'` seria bloquear
 * script inline injetado, e para isso existir seria preciso primeiro haver
 * uma falha de escape. É um trade-off consciente, não um esquecimento.
 *
 * Todo o resto continua estrito: nada de terceiros, sem `object-src`, sem
 * enquadramento por outros sites.
 */
function csp() {
  return [
    `default-src 'self'`,
    // Em desenvolvimento o Next usa eval para o hot reload.
    `script-src 'self' 'unsafe-inline'${producao ? '' : " 'unsafe-eval'"}`,
    // O Next injeta CSS crítico inline; sem isto a página aparece sem estilo.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(producao ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // HSTS só faz sentido sob HTTPS; em dev o navegador ignora,
          // mas evitamos enviar em desenvolvimento para não travar localhost.
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
      {
        // O service worker precisa poder controlar todo o escopo.
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
