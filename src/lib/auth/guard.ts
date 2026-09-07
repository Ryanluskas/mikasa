import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { naoAutenticado } from '@/lib/api';
import { COOKIE_SESSAO, resolverSessao, tokenDaRequisicao } from './session';

/**
 * O portão único da aplicação.
 *
 * Nenhuma página e nenhuma rota lê `userId` de qualquer outro lugar — nunca
 * do corpo da requisição, nunca de query string, nunca de um header confiável
 * "porque o frontend mandou". Toda autorização parte daqui.
 */

/** Para route handlers. Lança 401 se não houver sessão válida. */
export async function exigirUsuarioApi(req: Request): Promise<string> {
  const jar = await cookies();
  const token = tokenDaRequisicao(req, jar.get(COOKIE_SESSAO)?.value);
  const sessao = await resolverSessao(token);
  if (!sessao) throw naoAutenticado();
  return sessao.userId;
}

/** Para route handlers públicos que se comportam diferente se logado. */
export async function usuarioOpcionalApi(req: Request): Promise<string | null> {
  const jar = await cookies();
  const token = tokenDaRequisicao(req, jar.get(COOKIE_SESSAO)?.value);
  const sessao = await resolverSessao(token);
  return sessao?.userId ?? null;
}

export type UsuarioAtual = {
  id: string;
  email: string;
  displayName: string;
  onboardingDone: boolean;
  theme: string;
  reducedMotion: boolean;
  streaksEnabled: boolean;
  lifeLayerEnabled: boolean;
  modules: { key: string; enabled: boolean; order: number }[];
};

/** Para Server Components. Redireciona para o login se não houver sessão. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const jar = await cookies();
  const sessao = await resolverSessao(jar.get(COOKIE_SESSAO)?.value);
  if (!sessao) redirect('/entrar');

  const user = await prisma.user.findUnique({
    where: { id: sessao.userId },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          onboardingDone: true,
          theme: true,
          reducedMotion: true,
          streaksEnabled: true,
          lifeLayerEnabled: true,
        },
      },
      modules: {
        select: { key: true, enabled: true, order: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  // Sessão válida apontando para usuário inexistente: só acontece se a conta
  // foi excluída com a sessão aberta. Tratamos como deslogado.
  if (!user) redirect('/entrar');

  return {
    id: user.id,
    email: user.email,
    displayName: user.profile?.displayName ?? 'você',
    onboardingDone: user.profile?.onboardingDone ?? false,
    theme: user.profile?.theme ?? 'system',
    reducedMotion: user.profile?.reducedMotion ?? false,
    streaksEnabled: user.profile?.streaksEnabled ?? true,
    lifeLayerEnabled: user.profile?.lifeLayerEnabled ?? true,
    modules: user.modules,
  };
}

/** Exige sessão E onboarding concluído. Usado pelo shell do app. */
export async function exigirUsuarioPronto(): Promise<UsuarioAtual> {
  const user = await exigirUsuario();
  if (!user.onboardingDone) redirect('/comecar');
  return user;
}

/** User-Agent da requisição atual, para identificar o dispositivo na sessão. */
export async function userAgentAtual(): Promise<string | null> {
  const h = await headers();
  return h.get('user-agent');
}
