import { describe, expect, it } from 'vitest';
import { expandirEventos, type EventoBase } from '@/lib/recurrence';
import { addDays, dayKey, startOfDay } from '@/lib/dates';

/**
 * Eventos recorrentes.
 *
 * "Jiu-jitsu, toda quinta, 20:00" é o caso de uso real. O que estes testes
 * protegem é a lógica que faz um único registro virar as ocorrências certas
 * — inclusive nos casos chatos, como "todo dia 31" em fevereiro.
 */

const base: EventoBase = {
  id: 'ev1',
  title: 'Jiu-jitsu',
  category: 'fight',
  startAt: new Date('2026-09-03T20:00:00'), // uma quinta-feira
  endAt: new Date('2026-09-03T21:30:00'),
  allDay: false,
  repeat: 'weekly',
};

describe('expansão de recorrências', () => {
  it('evento sem repetição aparece uma vez só', () => {
    const unico = { ...base, repeat: 'none' };
    const r = expandirEventos(
      [unico],
      new Date('2026-09-01'),
      new Date('2026-09-30'),
    );
    expect(r).toHaveLength(1);
    expect(r[0].eRepeticao).toBe(false);
  });

  it('semanal cai sempre no mesmo dia da semana', () => {
    const r = expandirEventos([base], new Date('2026-09-01'), new Date('2026-09-30'));

    expect(r.length).toBeGreaterThanOrEqual(4);
    for (const o of r) {
      expect(o.ocorreEm.getDay()).toBe(4); // quinta
      expect(o.ocorreEm.getHours()).toBe(20);
    }
  });

  it('preserva a duração em todas as ocorrências', () => {
    const r = expandirEventos([base], new Date('2026-09-01'), new Date('2026-09-30'));
    for (const o of r) {
      expect(o.terminaEm.getTime() - o.ocorreEm.getTime()).toBe(90 * 60 * 1000);
    }
  });

  it('marca a primeira como original e as demais como repetição', () => {
    const r = expandirEventos([base], new Date('2026-09-01'), new Date('2026-09-30'));
    expect(r[0].eRepeticao).toBe(false);
    expect(r.slice(1).every((o) => o.eRepeticao)).toBe(true);
  });

  it('respeita a data de término da repetição', () => {
    const comFim = { ...base, repeatUntil: new Date('2026-09-17T23:59:59') };
    const r = expandirEventos([comFim], new Date('2026-09-01'), new Date('2026-10-31'));

    expect(r).toHaveLength(3); // 03, 10 e 17
    expect(dayKey(r[r.length - 1].ocorreEm)).toBe('2026-09-17');
  });

  it('não devolve nada fora da janela pedida', () => {
    const r = expandirEventos([base], new Date('2026-10-01'), new Date('2026-10-07'));
    for (const o of r) {
      expect(o.ocorreEm.getTime()).toBeGreaterThanOrEqual(
        startOfDay(new Date('2026-10-01')).getTime(),
      );
      expect(o.ocorreEm.getTime()).toBeLessThanOrEqual(
        addDays(startOfDay(new Date('2026-10-07')), 1).getTime(),
      );
    }
  });

  it('mensal no dia 31 não some nos meses curtos', () => {
    const mensal: EventoBase = {
      ...base,
      title: 'Pagar aluguel',
      startAt: new Date('2026-01-31T09:00:00'),
      endAt: new Date('2026-01-31T09:30:00'),
      repeat: 'monthly',
    };

    const r = expandirEventos([mensal], new Date('2026-01-01'), new Date('2026-04-30'));
    const dias = r.map((o) => dayKey(o.ocorreEm));

    expect(dias).toContain('2026-01-31');
    // Fevereiro de 2026 tem 28 dias: ancora no último dia, em vez de sumir.
    expect(dias).toContain('2026-02-28');
    expect(dias).toContain('2026-03-31');
  });

  it('tem trava contra janelas absurdas', () => {
    const diario = { ...base, repeat: 'daily' };
    const r = expandirEventos([diario], new Date('2020-01-01'), new Date('2030-01-01'));
    // O teto de ocorrências impede o loop de rodar por anos.
    expect(r.length).toBeLessThanOrEqual(400);
  });

  it('repetição desconhecida não trava o servidor', () => {
    const estranho = { ...base, repeat: 'a-cada-lua-cheia' };
    const r = expandirEventos([estranho], new Date('2026-09-01'), new Date('2026-09-30'));
    expect(r).toHaveLength(1);
  });

  it('devolve as ocorrências em ordem cronológica', () => {
    const outro: EventoBase = {
      ...base,
      id: 'ev2',
      title: 'Academia',
      startAt: new Date('2026-09-02T07:00:00'),
      endAt: new Date('2026-09-02T08:00:00'),
      repeat: 'daily',
    };

    const r = expandirEventos([base, outro], new Date('2026-09-01'), new Date('2026-09-14'));
    for (let i = 1; i < r.length; i++) {
      expect(r[i].ocorreEm.getTime()).toBeGreaterThanOrEqual(r[i - 1].ocorreEm.getTime());
    }
  });
});
