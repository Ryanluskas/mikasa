import { addDays, startOfDay } from './dates';

/**
 * Expansão de eventos recorrentes.
 *
 * Um evento que se repete é UMA linha no banco ("jiu-jitsu, toda quinta,
 * 20:00"), não trezentas. As ocorrências são calculadas na hora de exibir.
 * Assim, mudar o horário do treino é editar um registro — e não caçar cópias.
 *
 * O escopo é deliberadamente pequeno: diário, semanal, quinzenal e mensal.
 * É o que cabe numa rotina real. Nada de RRULE completa.
 */

export type EventoBase = {
  id: string;
  title: string;
  category: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  location?: string | null;
  notes?: string | null;
  repeat: string;
  repeatUntil?: Date | null;
};

export type Ocorrencia<T extends EventoBase = EventoBase> = T & {
  /** Início desta ocorrência específica. */
  ocorreEm: Date;
  terminaEm: Date;
  /** true quando não é a data original do evento. */
  eRepeticao: boolean;
};

const TETO_OCORRENCIAS = 400; // trava de segurança contra intervalos absurdos

/** Expande os eventos que caem no intervalo [de, ate]. */
export function expandirEventos<T extends EventoBase>(
  eventos: T[],
  de: Date,
  ate: Date,
): Ocorrencia<T>[] {
  const resultado: Ocorrencia<T>[] = [];
  const inicioJanela = startOfDay(de).getTime();
  const fimJanela = startOfDay(ate).getTime() + 86_399_999;

  for (const ev of eventos) {
    const duracao = ev.endAt.getTime() - ev.startAt.getTime();

    if (ev.repeat === 'none') {
      const t = ev.startAt.getTime();
      if (t >= inicioJanela && t <= fimJanela) {
        resultado.push({ ...ev, ocorreEm: ev.startAt, terminaEm: ev.endAt, eRepeticao: false });
      }
      continue;
    }

    const limite = ev.repeatUntil
      ? Math.min(ev.repeatUntil.getTime() + 86_399_999, fimJanela)
      : fimJanela;

    let cursor = new Date(ev.startAt);
    let voltas = 0;

    while (cursor.getTime() <= limite && voltas < TETO_OCORRENCIAS) {
      voltas++;
      const t = cursor.getTime();

      if (t >= inicioJanela && t <= fimJanela) {
        resultado.push({
          ...ev,
          ocorreEm: new Date(cursor),
          terminaEm: new Date(t + duracao),
          eRepeticao: t !== ev.startAt.getTime(),
        });
      }

      cursor = proximaOcorrencia(cursor, ev.repeat, ev.startAt);
    }
  }

  return resultado.sort((a, b) => a.ocorreEm.getTime() - b.ocorreEm.getTime());
}

function proximaOcorrencia(atual: Date, repeat: string, original: Date): Date {
  switch (repeat) {
    case 'daily':
      return addDays(atual, 1);
    case 'weekly':
      return addDays(atual, 7);
    case 'biweekly':
      return addDays(atual, 14);
    case 'monthly': {
      // "Todo dia 31" em fevereiro não existe. Em vez de pular para março
      // (o que faria o evento sumir de um mês), ancoramos no último dia.
      const proximo = new Date(atual);
      const diaOriginal = original.getDate();
      proximo.setDate(1);
      proximo.setMonth(proximo.getMonth() + 1);
      const ultimoDia = new Date(
        proximo.getFullYear(),
        proximo.getMonth() + 1,
        0,
      ).getDate();
      proximo.setDate(Math.min(diaOriginal, ultimoDia));
      proximo.setHours(original.getHours(), original.getMinutes(), 0, 0);
      return proximo;
    }
    default:
      // Repetição desconhecida: para em vez de girar para sempre.
      return new Date(8.64e15);
  }
}

export const ROTULO_REPETICAO: Record<string, string> = {
  none: 'Não se repete',
  daily: 'Todo dia',
  weekly: 'Toda semana',
  biweekly: 'A cada duas semanas',
  monthly: 'Todo mês',
};
