import { prisma } from '@/lib/prisma';
import { diffDays } from '@/lib/dates';
import { MODULO_POR_CHAVE } from '@/lib/modules';
import type { AreaModulo } from '@/lib/validation';
import type { JanelaDeVida } from './signals';
import type { Achado } from './correlate';

/**
 * A camada de vida — parte 3: o equilíbrio.
 *
 * Um app de produtividade comum mede quanto você fez. O Mikasa mede ONDE
 * você esteve. A pergunta não é "você foi produtivo?", é "sua atenção está
 * distribuída do jeito que você gostaria?".
 *
 * A unidade aqui é intencionalmente grosseira: contamos DIAS em que a pessoa
 * tocou em cada área, não minutos nem quantidade. Quinze minutos ligando para
 * a mãe e três horas de treino não são comparáveis em minutos — mas ambos
 * são "um dia em que essa parte da vida existiu".
 */

export type PresencaArea = {
  key: AreaModulo;
  nome: string;
  href: string;
  /** Dias, dentro da janela, em que houve algum registro nesta área. */
  dias: number;
  /** Fatia da atenção, 0..1, relativa às outras áreas ativas. */
  fatia: number;
  /** Dias desde o último registro. `null` se nunca houve nenhum. */
  diasSemRegistro: number | null;
};

export type Equilibrio = {
  areas: PresencaArea[];
  janelaDias: number;
  /** Área com mais presença, se houver alguma diferença relevante. */
  dominante: PresencaArea | null;
  /** Área ligada pelo usuário que sumiu — o achado mais útil daqui. */
  esquecida: PresencaArea | null;
};

export async function calcularEquilibrio(
  userId: string,
  janela: JanelaDeVida,
  modulosLigados: AreaModulo[],
): Promise<Equilibrio> {
  const { de, ate, dias } = janela;
  const limite = new Date(ate.getTime() + 86_400_000);
  const hoje = new Date();

  // Trabalho e metas não aparecem na série diária, então perguntamos direto.
  const [tarefasTrabalho, metasMexidas, ultimaTarefaTrabalho, ultimaMeta] =
    await Promise.all([
      prisma.task.findMany({
        where: { userId, area: 'work', doneAt: { gte: de, lt: limite } },
        select: { doneAt: true },
      }),
      prisma.goal.findMany({
        where: { userId, updatedAt: { gte: de, lt: limite } },
        select: { updatedAt: true },
      }),
      prisma.task.findFirst({
        where: { userId, area: 'work', doneAt: { not: null } },
        orderBy: { doneAt: 'desc' },
        select: { doneAt: true },
      }),
      prisma.goal.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

  const diasUnicos = (datas: (Date | null)[]) =>
    new Set(
      datas
        .filter((d): d is Date => d !== null)
        .map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`),
    ).size;

  const ultimoDiaCom = (teste: (d: (typeof dias)[number]) => boolean) => {
    for (let i = dias.length - 1; i >= 0; i--) {
      if (teste(dias[i])) return dias[i].data;
    }
    return null;
  };

  const bruto: Record<AreaModulo, { dias: number; ultimo: Date | null }> = {
    workouts: {
      dias: dias.filter((d) => d.treinou).length,
      ultimo: ultimoDiaCom((d) => d.treinou),
    },
    study: {
      dias: dias.filter((d) => d.minutosEstudo > 0).length,
      ultimo: ultimoDiaCom((d) => d.minutosEstudo > 0),
    },
    finance: {
      dias: dias.filter((d) => d.gastoCents > 0 || d.entradaCents > 0).length,
      ultimo: ultimoDiaCom((d) => d.gastoCents > 0 || d.entradaCents > 0),
    },
    habits: {
      dias: dias.filter((d) => d.habitosFeitos > 0).length,
      ultimo: ultimoDiaCom((d) => d.habitosFeitos > 0),
    },
    relationships: {
      dias: dias.filter((d) => d.contatosPessoas > 0).length,
      ultimo: ultimoDiaCom((d) => d.contatosPessoas > 0),
    },
    work: {
      dias: diasUnicos(tarefasTrabalho.map((t) => t.doneAt)),
      ultimo: ultimaTarefaTrabalho?.doneAt ?? null,
    },
    goals: {
      dias: diasUnicos(metasMexidas.map((g) => g.updatedAt)),
      ultimo: ultimaMeta?.updatedAt ?? null,
    },
  };

  const total = modulosLigados.reduce((s, k) => s + bruto[k].dias, 0);

  const areas: PresencaArea[] = modulosLigados.map((key) => {
    const def = MODULO_POR_CHAVE.get(key);
    return {
      key,
      nome: def?.nome ?? key,
      href: def?.href ?? '/areas',
      dias: bruto[key].dias,
      fatia: total > 0 ? bruto[key].dias / total : 0,
      diasSemRegistro: bruto[key].ultimo ? diffDays(hoje, bruto[key].ultimo!) : null,
    };
  });

  areas.sort((a, b) => b.dias - a.dias);

  const dominante =
    areas.length > 1 && areas[0].dias > 0 && areas[0].fatia >= 0.45
      ? areas[0]
      : null;

  // "Esquecida" só vale para quem já usou a área alguma vez: cobrar de alguém
  // uma área que nunca existiu na rotina dele seria só barulho.
  const esquecida =
    areas.find(
      (a) =>
        a.dias === 0 &&
        a.diasSemRegistro !== null &&
        a.diasSemRegistro >= 14 &&
        a.diasSemRegistro <= 120,
    ) ?? null;

  return { areas, janelaDias: dias.length, dominante, esquecida };
}

/** Transforma o equilíbrio em achados, no mesmo formato dos padrões. */
export function achadosDeEquilibrio(e: Equilibrio): Achado[] {
  const achados: Achado[] = [];

  if (e.esquecida) {
    achados.push({
      key: `equilibrio-esquecida-${e.esquecida.key}`,
      kind: 'balance',
      area: e.esquecida.key,
      titulo: `${e.esquecida.nome} ficou de lado`,
      corpo: `Faz ${e.esquecida.diasSemRegistro} dias que você não registra nada nessa área. Não é cobrança — às vezes é só a fase. Mas ficou fora do seu equilíbrio.`,
      forca: 0.62,
      base: `${e.janelaDias} dias observados`,
    });
  }

  if (e.dominante) {
    achados.push({
      key: `equilibrio-dominante-${e.dominante.key}`,
      kind: 'balance',
      area: e.dominante.key,
      titulo: `Sua atenção está muito em ${e.dominante.nome.toLowerCase()}`,
      corpo: `Quase metade dos seus registros das últimas semanas vêm dessa área. Se é isso que você quer agora, ótimo. Se não é, vale saber.`,
      forca: 0.5,
      base: `${e.janelaDias} dias observados`,
    });
  }

  return achados;
}
