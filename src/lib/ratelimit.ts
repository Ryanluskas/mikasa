import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { ApiError, excedeuLimite } from '@/lib/api';

/**
 * Rate limiting por janela fixa, persistido no banco.
 *
 * Fica no banco de propósito: um limitador em memória some a cada deploy e
 * não vale nada com mais de uma instância — exatamente o cenário em que um
 * ataque de força bruta seria bem-sucedido.
 */

type Regra = { limite: number; janelaSeg: number };

export const REGRAS = {
  login: { limite: 8, janelaSeg: 15 * 60 },
  registro: { limite: 5, janelaSeg: 60 * 60 },
  escrita: { limite: 240, janelaSeg: 60 },
} satisfies Record<string, Regra>;

/**
 * Identificador do chamador. Preferimos o IP, mas ele vem de headers de proxy
 * que podem ser forjados; por isso o valor é apenas hasheado e usado como
 * chave de balde — nunca como decisão de autorização.
 */
export function identificador(req: Request, sufixo = ''): string {
  const h = req.headers;
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'desconhecido';
  return createHash('sha256').update(`${ip}|${sufixo}`).digest('hex').slice(0, 32);
}

/**
 * Consome uma unidade do balde. Lança 429 quando estoura.
 * Falha aberta: se o banco estiver indisponível, não travamos o login por isso.
 */
export async function limitar(
  chave: string,
  regra: Regra,
  mensagem = 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
): Promise<void> {
  const agora = new Date();
  const inicioJanela = new Date(agora.getTime() - regra.janelaSeg * 1000);

  try {
    const atual = await prisma.rateLimit.findUnique({ where: { key: chave } });

    if (!atual || atual.windowStart < inicioJanela) {
      await prisma.rateLimit.upsert({
        where: { key: chave },
        create: { key: chave, count: 1, windowStart: agora },
        update: { count: 1, windowStart: agora },
      });
      return;
    }

    if (atual.count >= regra.limite) throw excedeuLimite(mensagem);

    await prisma.rateLimit.update({
      where: { key: chave },
      data: { count: { increment: 1 } },
    });
  } catch (erro) {
    // O 429 é uma decisão nossa e precisa subir.
    if (erro instanceof ApiError) throw erro;
    // Qualquer outra falha aqui é problema de infraestrutura, não do usuário:
    // não vamos impedir alguém de entrar porque a tabela de baldes falhou.
    console.error('[mikasa][ratelimit] balde indisponível', erro);
  }
}

/** Remove baldes antigos. Chamada oportunisticamente pelas rotas de auth. */
export async function limparBaldesAntigos() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.rateLimit
    .deleteMany({ where: { windowStart: { lt: limite } } })
    .catch(() => undefined);
}
