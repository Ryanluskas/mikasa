import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware do Mikasa.
 *
 * Faz duas coisas, e nada além:
 *
 *  1. Monta a Content-Security-Policy com um nonce novo por requisição.
 *  2. Faz o redirecionamento BARATO de quem não tem cookie de sessão.
 *
 * Sobre o item 2, um aviso que vale mais que o código: isto NÃO é segurança.
 * O middleware roda no Edge e não fala com o banco, então ele só sabe se
 * existe um cookie — não se ele é válido. A verificação de verdade acontece
 * em `exigirUsuario`/`exigirUsuarioApi`, junto do acesso aos dados. Aqui é
 * só para o usuário não ver uma tela piscar antes de ser mandado ao login.
 */

const ROTAS_PROTEGIDAS = [
  '/inicio',
  '/hoje',
  '/vida',
  '/calendario',
  '/areas',
  '/financeiro',
  '/treinos',
  '/estudos',
  '/trabalho',
  '/metas',
  '/habitos',
  '/pessoas',
  '/perfil',
  '/comecar',
];

const ROTAS_DE_ENTRADA = ['/entrar', '/criar-conta'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const temCookie = Boolean(req.cookies.get('mikasa_session')?.value);

  if (!temCookie && ROTAS_PROTEGIDAS.some((r) => pathname.startsWith(r))) {
    const url = req.nextUrl.clone();
    url.pathname = '/entrar';
    // Guarda para onde a pessoa queria ir, e leva ela lá depois do login.
    if (pathname !== '/inicio') url.searchParams.set('proximo', pathname);
    return NextResponse.redirect(url);
  }

  if (temCookie && ROTAS_DE_ENTRADA.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/inicio';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Sobre a ausência de `strict-dynamic` aqui:
  //
  // Ele parece a opção mais rígida, mas DESLIGA o allowlist por host — com
  // ele presente, nem `'self'` vale, e os próprios arquivos do Mikasa
  // (como /tema.js) passam a ser bloqueados.
  //
  // `strict-dynamic` existe para quem precisa liberar vários CDNs de
  // terceiros. O Mikasa não carrega script de lugar nenhum além do próprio
  // domínio, então `'self'` + nonce já é o mais estrito possível aqui:
  //  - os scripts inline que o Next gera recebem o nonce automaticamente,
  //    porque ele lê a CSP do header da requisição;
  //  - os arquivos servidos por nós passam por `'self'`;
  //  - qualquer script injetado de fora continua bloqueado.
  //
  // Em desenvolvimento o Next usa eval para o hot reload, então `unsafe-eval`
  // existe só ali.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${
      process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
    }`,
    // O Next injeta CSS crítico inline; sem `unsafe-inline` a página aparece
    // sem estilo. É a exceção consciente desta política.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  // O Next lê a CSP do header da REQUISIÇÃO para saber qual nonce carimbar
  // nos scripts que ele mesmo gera.
  headers.set('content-security-policy', csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set('content-security-policy', csp);
  return res;
}

export const config = {
  matcher: [
    /*
      Tudo, menos arquivos estáticos e imagens — eles não precisam de CSP
      nem de checagem de sessão, e passar por aqui seria só latência.
    */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
