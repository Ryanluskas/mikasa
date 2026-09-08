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

  // A Content-Security-Policy NÃO é montada aqui.
  //
  // A versão anterior gerava um nonce por requisição neste ponto. Isso quebrava
  // a aplicação em produção: as páginas pré-renderizadas no build saem sem
  // nonce, o middleware exigia nonce em tempo de execução, e o React parava de
  // hidratar. A política agora é estática e vive em `next.config.mjs`, onde o
  // raciocínio completo está documentado.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Tudo, menos arquivos estáticos e imagens: eles não precisam de checagem
      de sessão, e passar por aqui seria só latência. A CSP não depende deste
      matcher — ela é aplicada a todas as respostas por next.config.mjs.
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
