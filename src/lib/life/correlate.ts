import { formatCentsShort } from '@/lib/money';
import { nomeDiaLongo } from '@/lib/dates';
import { media, pearson, sequenciaAtual, type DiaDaVida, type JanelaDeVida } from './signals';

/**
 * A camada de vida — parte 2: as conexões.
 *
 * Aqui o Mikasa deixa de ser "vários apps no mesmo lugar" e começa a
 * responder a pergunta que nenhum deles responde sozinho:
 * "como essas coisas estão afetando a minha vida como um todo?"
 *
 * Três regras não negociáveis, porque a alternativa é um app que inventa
 * coisas sobre a vida de alguém:
 *
 *  1. AMOSTRA MÍNIMA. Nenhum padrão aparece antes de haver dias suficientes.
 *     Duas observações não são um padrão, são duas observações.
 *  2. NUNCA CAUSALIDADE. O texto diz "nos dias em que", nunca "porque".
 *     O Mikasa mostra o que apareceu junto; a conclusão é do usuário.
 *  3. SEMPRE A BASE. Todo achado carrega quantos dias o sustentam, visível
 *     na interface. Um padrão sem denominador é um palpite disfarçado.
 */

export type Achado = {
  /** Chave estável: o mesmo achado não vira um card novo todo dia. */
  key: string;
  kind: 'pattern' | 'balance' | 'streak' | 'milestone' | 'nudge';
  area: string;
  titulo: string;
  corpo: string;
  /** 0..1 — ordena a lista. Nunca é mostrado como "certeza". */
  forca: number;
  /** Transparência: em cima de quantos dias isso foi observado. */
  base: string;
};

const MIN_DIAS_CHECKIN = 10;
const MIN_POR_GRUPO = 4;

type Grupos = {
  n1: number;
  n2: number;
  m1: number;
  m2: number;
  /** Diferença normalizada pela amplitude da escala (0..1). */
  efeito: number;
};

/** Compara a média de uma métrica entre dias que passam e não passam no teste. */
function compararGrupos(
  dias: DiaDaVida[],
  teste: (d: DiaDaVida) => boolean,
  metrica: (d: DiaDaVida) => number | null,
  amplitude: number,
): Grupos | null {
  const comA: number[] = [];
  const semA: number[] = [];

  for (const d of dias) {
    const v = metrica(d);
    if (v === null) continue; // sem registro não entra na conta
    (teste(d) ? comA : semA).push(v);
  }

  if (comA.length < MIN_POR_GRUPO || semA.length < MIN_POR_GRUPO) return null;

  const m1 = media(comA);
  const m2 = media(semA);
  return {
    n1: comA.length,
    n2: semA.length,
    m1,
    m2,
    efeito: (m1 - m2) / amplitude,
  };
}

const plural = (n: number, um: string, muitos: string) =>
  `${n} ${n === 1 ? um : muitos}`;

// ── Detectores ───────────────────────────────────────────────────────────────

function sonoEEnergia(j: JanelaDeVida): Achado | null {
  const pares = j.dias.filter((d) => d.sono !== null && d.energia !== null);
  if (pares.length < 8) return null;

  const r = pearson(
    pares.map((d) => d.sono as number),
    pares.map((d) => d.energia as number),
  );
  if (r === null || r < 0.42) return null;

  return {
    key: 'sono-energia',
    kind: 'pattern',
    area: 'life',
    titulo: 'Sono e disposição andam juntos',
    corpo:
      'Você costuma marcar mais energia nos dias em que dormiu mais. Aparece com clareza nos seus registros.',
    forca: Math.min(1, r),
    base: `${plural(pares.length, 'dia', 'dias')} com sono e energia registrados`,
  };
}

function treinoEHumor(j: JanelaDeVida): Achado | null {
  if (j.diasComCheckin < MIN_DIAS_CHECKIN) return null;

  const g = compararGrupos(j.dias, (d) => d.treinou, (d) => d.humor, 4);
  if (!g || g.efeito < 0.14) return null;

  return {
    key: 'treino-humor',
    kind: 'pattern',
    area: 'workouts',
    titulo: 'Os dias de treino aparecem diferentes',
    corpo:
      'Nos dias em que você treinou, seu check-in ficou mais para cima do que nos outros dias.',
    forca: Math.min(1, g.efeito * 2.4),
    base: `${plural(g.n1, 'dia com treino', 'dias com treino')} e ${plural(g.n2, 'dia sem', 'dias sem')}`,
  };
}

function treinoEEnergia(j: JanelaDeVida): Achado | null {
  if (j.diasComCheckin < MIN_DIAS_CHECKIN) return null;

  const g = compararGrupos(j.dias, (d) => d.treinou, (d) => d.energia, 2);
  if (!g || g.efeito < 0.16) return null;

  const altos = j.dias.filter((d) => d.treinou && d.energia === 3).length;
  const totalTreino = j.dias.filter((d) => d.treinou && d.energia !== null).length;

  return {
    key: 'treino-energia',
    kind: 'pattern',
    area: 'workouts',
    titulo: 'Treino e energia',
    corpo: `Você marcou energia alta em ${altos} dos ${totalTreino} dias em que treinou.`,
    forca: Math.min(1, g.efeito * 2.2),
    base: `${plural(totalTreino, 'dia de treino', 'dias de treino')} com check-in`,
  };
}

function agendaCheiaETarefas(j: JanelaDeVida): Achado | null {
  const g = compararGrupos(
    j.dias,
    (d) => d.compromissos >= 3,
    (d) => (d.registrou ? d.tarefasConcluidas : null),
    4,
  );
  if (!g || g.efeito > -0.12) return null; // só interessa se cai

  return {
    key: 'agenda-tarefas',
    kind: 'pattern',
    area: 'life',
    titulo: 'Dias cheios deixam menos espaço',
    corpo:
      'Nos dias com três ou mais compromissos, você conclui menos tarefas do que nos dias mais livres. Talvez valha colocar menos coisas nesses dias.',
    forca: Math.min(1, Math.abs(g.efeito) * 2),
    base: `${plural(g.n1, 'dia cheio', 'dias cheios')} e ${plural(g.n2, 'dia comum', 'dias comuns')}`,
  };
}

function estudoEHumor(j: JanelaDeVida): Achado | null {
  if (j.diasComCheckin < MIN_DIAS_CHECKIN) return null;

  const g = compararGrupos(
    j.dias,
    (d) => d.minutosEstudo >= 25,
    (d) => d.humor,
    4,
  );
  if (!g || Math.abs(g.efeito) < 0.15) return null;

  const subiu = g.efeito > 0;
  return {
    key: 'estudo-humor',
    kind: 'pattern',
    area: 'study',
    titulo: subiu ? 'Estudar te faz bem' : 'Os dias de estudo pesam',
    corpo: subiu
      ? 'Nos dias em que você estudou, seu check-in ficou melhor do que nos outros.'
      : 'Nos dias em que você estudou mais, seu check-in ficou mais baixo. Pode ser cansaço acumulado — vale olhar como esses dias estão montados.',
    forca: Math.min(1, Math.abs(g.efeito) * 2.2),
    base: `${plural(g.n1, 'dia de estudo', 'dias de estudo')} e ${plural(g.n2, 'dia sem', 'dias sem')}`,
  };
}

function gastoEHumor(j: JanelaDeVida): Achado | null {
  const comGasto = j.dias.filter((d) => d.gastoCents > 0 && d.humor !== null);
  if (comGasto.length < 8) return null;

  const gastosOrdenados = [...comGasto].sort((a, b) => b.gastoCents - a.gastoCents);
  const topo = gastosOrdenados.slice(0, Math.max(3, Math.floor(comGasto.length * 0.25)));
  const resto = gastosOrdenados.slice(topo.length);
  if (resto.length < MIN_POR_GRUPO) return null;

  const mTopo = media(topo.map((d) => d.humor as number));
  const mResto = media(resto.map((d) => d.humor as number));
  const efeito = (mResto - mTopo) / 4;
  if (efeito < 0.15) return null;

  return {
    key: 'gasto-humor',
    kind: 'pattern',
    area: 'finance',
    titulo: 'Seus maiores gastos têm um padrão',
    corpo:
      'Seus dias de gasto mais alto costumam coincidir com check-ins mais baixos. Não quer dizer que um causa o outro — mas é um padrão que aparece nos seus registros.',
    forca: Math.min(1, efeito * 2),
    base: `${plural(comGasto.length, 'dia', 'dias')} com gasto e check-in`,
  };
}

function diaMaisCheio(j: JanelaDeVida): Achado | null {
  if (j.dias.length < 21) return null;

  const porDia = new Array(7).fill(0).map(() => ({ carga: 0, semanas: 0 }));
  for (const d of j.dias) {
    porDia[d.diaSemana].carga += d.compromissos + d.tarefasConcluidas;
    porDia[d.diaSemana].semanas += 1;
  }

  const medias = porDia.map((p) => (p.semanas ? p.carga / p.semanas : 0));
  const maiorIdx = medias.indexOf(Math.max(...medias));
  const maior = medias[maiorIdx];
  const mediaGeral = media(medias);

  if (maior < 1.5 || mediaGeral === 0 || maior < mediaGeral * 1.5) return null;

  return {
    key: 'dia-mais-cheio',
    kind: 'pattern',
    area: 'life',
    titulo: `${nomeDiaLongo(new Date(2024, 0, 7 + maiorIdx))} costuma ser seu dia mais cheio`,
    corpo:
      'É o dia em que mais coisas se acumulam na sua semana. Se precisar tirar algo de algum lugar, provavelmente é daí.',
    forca: Math.min(1, (maior / Math.max(mediaGeral, 0.1) - 1) / 2),
    base: `${plural(Math.round(j.dias.length / 7), 'semana', 'semanas')} de registros`,
  };
}

function consistenciaTreino(j: JanelaDeVida): Achado | null {
  const total = j.dias.filter((d) => d.treinou).length;
  if (total < 6) return null;

  const semanas = Math.max(1, Math.round(j.dias.length / 7));
  const porSemana = total / semanas;

  return {
    key: 'consistencia-treino',
    kind: 'milestone',
    area: 'workouts',
    titulo: `${total} treinos em ${plural(j.dias.length, 'dia', 'dias')}`,
    corpo:
      porSemana >= 3
        ? 'Isso dá cerca de três vezes por semana. Você está mantendo uma boa frequência.'
        : 'Você está construindo consistência. Cada registro conta.',
    forca: Math.min(1, porSemana / 5),
    base: `${plural(j.dias.length, 'dia', 'dias')} observados`,
  };
}

function tendenciaFinanceira(j: JanelaDeVida): Achado | null {
  if (j.dias.length < 28) return null;

  const metade = Math.floor(j.dias.length / 2);
  const antes = j.dias.slice(0, metade);
  const depois = j.dias.slice(metade);

  const gastoAntes = antes.reduce((s, d) => s + d.gastoCents, 0);
  const gastoDepois = depois.reduce((s, d) => s + d.gastoCents, 0);
  if (gastoAntes < 5000 || gastoDepois < 1000) return null;

  const variacao = (gastoDepois - gastoAntes) / gastoAntes;
  if (Math.abs(variacao) < 0.15) return null;

  const caiu = variacao < 0;
  const diferenca = Math.abs(gastoDepois - gastoAntes);

  return {
    key: 'tendencia-gasto',
    kind: 'pattern',
    area: 'finance',
    titulo: caiu ? 'Seus gastos diminuíram' : 'Seus gastos subiram',
    corpo: `Nas últimas duas semanas você gastou ${formatCentsShort(diferenca)} ${
      caiu ? 'a menos' : 'a mais'
    } do que nas duas anteriores.`,
    forca: Math.min(1, Math.abs(variacao)),
    base: `${plural(j.dias.length, 'dia', 'dias')} de lançamentos`,
  };
}

function sumico(j: JanelaDeVida): Achado | null {
  // "Faz alguns dias que você não registra nada" só faz sentido para quem já
  // registrou alguma coisa. Numa conta recém-criada isso soaria como cobrança
  // por algo que a pessoa nunca começou.
  if (j.diasComRegistro === 0) return null;

  const semRegistro = sequenciaAtual(j.dias, (d) => !d.registrou);
  if (semRegistro < 4 || semRegistro > 60) return null;

  return {
    key: 'sem-registro',
    kind: 'nudge',
    area: 'life',
    titulo: 'Faz alguns dias',
    corpo:
      'Você não registra nada há alguns dias. Tudo bem. Quando quiser, continuamos de onde parou.',
    forca: 0.3,
    base: `${plural(semRegistro, 'dia', 'dias')} sem registro`,
  };
}

function habitosEEnergia(j: JanelaDeVida): Achado | null {
  if (j.diasComCheckin < MIN_DIAS_CHECKIN) return null;
  if (!j.dias.some((d) => d.habitosPossiveis > 0)) return null;

  const g = compararGrupos(
    j.dias,
    (d) => d.habitosPossiveis > 0 && d.habitosFeitos >= d.habitosPossiveis,
    (d) => d.energia,
    2,
  );
  if (!g || g.efeito < 0.18) return null;

  return {
    key: 'habitos-energia',
    kind: 'pattern',
    area: 'habits',
    titulo: 'Os dias completos são diferentes',
    corpo:
      'Nos dias em que você marcou todos os seus hábitos, sua energia ficou mais alta do que nos outros.',
    forca: Math.min(1, g.efeito * 2),
    base: `${plural(g.n1, 'dia completo', 'dias completos')} e ${plural(g.n2, 'dia parcial', 'dias parciais')}`,
  };
}

/** Roda todos os detectores e devolve os achados, do mais forte ao mais fraco. */
export function detectarPadroes(j: JanelaDeVida): Achado[] {
  const detectores = [
    sonoEEnergia,
    treinoEHumor,
    treinoEEnergia,
    agendaCheiaETarefas,
    estudoEHumor,
    gastoEHumor,
    habitosEEnergia,
    diaMaisCheio,
    consistenciaTreino,
    tendenciaFinanceira,
    sumico,
  ];

  return detectores
    .map((d) => {
      try {
        return d(j);
      } catch {
        // Um detector com defeito não pode derrubar a página inteira.
        return null;
      }
    })
    .filter((a): a is Achado => a !== null)
    .sort((a, b) => b.forca - a.forca);
}
