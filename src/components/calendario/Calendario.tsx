'use client';

import { useMemo, useState } from 'react';
import { Card, Secao, Vazio } from '@/components/ui';
import {
  addDays,
  dayKey,
  formatHora,
  nomeDiaLongo,
  nomeMes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';
import { ROTULO_CATEGORIA_EVENTO } from '@/lib/modules';
import { VOZ } from '@/lib/voice';
import { cn } from '@/lib/cn';

/**
 * O calendário.
 *
 * Três visões (mês, semana, dia) sobre os mesmos dados, já expandidos no
 * servidor. Trocar de mês não faz requisição: a janela carregada cobre o mês
 * anterior e o seguinte, que é o alcance real de quem está navegando.
 *
 * No celular a visão de mês mostra pontos, não títulos — texto de 8px numa
 * célula de 40px não é informação, é ruído. O dia selecionado abre a lista
 * embaixo, que é onde a leitura acontece de verdade.
 */

type Ocorrencia = {
  id: string;
  eventoId: string;
  title: string;
  category: string;
  location: string | null;
  ocorreEm: string;
  terminaEm: string;
  allDay: boolean;
  eRepeticao: boolean;
};

type Visao = 'mes' | 'semana' | 'dia';

const DIAS_CABECALHO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function Calendario({ ocorrencias }: { ocorrencias: Ocorrencia[] }) {
  const [visao, setVisao] = useState<Visao>('mes');
  const [referencia, setReferencia] = useState(() => startOfDay(new Date()));
  const [selecionado, setSelecionado] = useState(() => startOfDay(new Date()));

  // Agrupamento por dia, feito uma vez só.
  const porDia = useMemo(() => {
    const mapa = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) {
      const chave = dayKey(o.ocorreEm);
      const lista = mapa.get(chave) ?? [];
      lista.push(o);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [ocorrencias]);

  const doDia = porDia.get(dayKey(selecionado)) ?? [];

  function navegar(direcao: -1 | 1) {
    if (visao === 'mes') {
      const nova = startOfMonth(referencia);
      nova.setMonth(nova.getMonth() + direcao);
      setReferencia(nova);
    } else if (visao === 'semana') {
      setReferencia((r) => addDays(r, direcao * 7));
    } else {
      setReferencia((r) => addDays(r, direcao));
      setSelecionado((s) => addDays(s, direcao));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="secao">{referencia.getFullYear()}</p>
          <h1 className="mt-1 text-display font-semibold text-ink first-letter:uppercase">
            {visao === 'dia' ? nomeDiaLongo(referencia) : nomeMes(referencia)}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <BotaoNavegar direcao="anterior" onClick={() => navegar(-1)} />
          <button
            type="button"
            onClick={() => {
              const hoje = startOfDay(new Date());
              setReferencia(hoje);
              setSelecionado(hoje);
            }}
            className="rounded px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            hoje
          </button>
          <BotaoNavegar direcao="proximo" onClick={() => navegar(1)} />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Visualização do calendário"
        className="flex gap-1 rounded-md border border-line bg-raised p-1"
      >
        {(['mes', 'semana', 'dia'] as Visao[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={visao === v}
            onClick={() => setVisao(v)}
            className={cn(
              'flex-1 rounded px-3 py-2 text-sm capitalize transition-colors',
              visao === v
                ? 'bg-surface font-medium text-ink shadow-soft'
                : 'text-muted hover:text-ink',
            )}
          >
            {v === 'mes' ? 'Mês' : v}
          </button>
        ))}
      </div>

      {visao === 'mes' && (
        <GradeDoMes
          referencia={referencia}
          selecionado={selecionado}
          porDia={porDia}
          aoSelecionar={setSelecionado}
        />
      )}

      {visao === 'semana' && (
        <GradeDaSemana
          referencia={referencia}
          selecionado={selecionado}
          porDia={porDia}
          aoSelecionar={setSelecionado}
        />
      )}

      <section>
        <Secao
          titulo={
            dayKey(selecionado) === dayKey(new Date())
              ? 'Hoje'
              : `${nomeDiaLongo(selecionado)}, ${selecionado.getDate()} de ${nomeMes(selecionado)}`
          }
        />

        {doDia.length === 0 ? (
          <Vazio titulo={VOZ.vazio.calendario.titulo} texto={VOZ.vazio.calendario.texto} />
        ) : (
          <Card className="divide-y divide-line">
            {doDia.map((o) => (
              <div key={o.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="tabular w-12 shrink-0 pt-0.5 text-xs text-muted">
                  {o.allDay ? 'dia' : formatHora(o.ocorreEm)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{o.title}</p>
                  <p className="mt-0.5 truncate text-xs text-faint">
                    {ROTULO_CATEGORIA_EVENTO[o.category] ?? o.category}
                    {o.location && ` · ${o.location}`}
                    {o.eRepeticao && ' · se repete'}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function BotaoNavegar({
  direcao,
  onClick,
}: {
  direcao: 'anterior' | 'proximo';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direcao === 'anterior' ? 'Período anterior' : 'Próximo período'}
      className="toque flex items-center justify-center rounded text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d={direcao === 'anterior' ? 'M10 3.5L5.5 8 10 12.5' : 'M6 3.5L10.5 8 6 12.5'}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function GradeDoMes({
  referencia,
  selecionado,
  porDia,
  aoSelecionar,
}: {
  referencia: Date;
  selecionado: Date;
  porDia: Map<string, Ocorrencia[]>;
  aoSelecionar: (d: Date) => void;
}) {
  const inicio = startOfWeek(startOfMonth(referencia), 1);
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const mesAtual = referencia.getMonth();
  const hoje = dayKey(new Date());

  return (
    <Card className="p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-1">
        {DIAS_CABECALHO.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] text-faint">
            {d}
          </div>
        ))}

        {dias.map((d) => {
          const chave = dayKey(d);
          const eventos = porDia.get(chave) ?? [];
          const foraDoMes = d.getMonth() !== mesAtual;
          const ehHoje = chave === hoje;
          const ehSelecionado = chave === dayKey(selecionado);

          return (
            <button
              key={chave}
              type="button"
              onClick={() => aoSelecionar(d)}
              aria-label={`${d.getDate()} de ${nomeMes(d)}, ${eventos.length} eventos`}
              aria-current={ehSelecionado ? 'date' : undefined}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded transition-colors',
                ehSelecionado
                  ? 'bg-ink text-bg'
                  : foraDoMes
                    ? 'text-faint/60 hover:bg-raised'
                    : 'text-ink hover:bg-raised',
              )}
            >
              <span
                className={cn(
                  'tabular text-sm',
                  ehHoje && !ehSelecionado && 'font-semibold text-accent',
                )}
              >
                {d.getDate()}
              </span>

              {/* Pontos, e não títulos: cabem, e comunicam a densidade do dia. */}
              <span className="flex h-1 items-center gap-0.5">
                {eventos.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      'h-1 w-1 rounded-full',
                      ehSelecionado ? 'bg-bg/70' : 'bg-accent',
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function GradeDaSemana({
  referencia,
  selecionado,
  porDia,
  aoSelecionar,
}: {
  referencia: Date;
  selecionado: Date;
  porDia: Map<string, Ocorrencia[]>;
  aoSelecionar: (d: Date) => void;
}) {
  const inicio = startOfWeek(referencia, 1);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const hoje = dayKey(new Date());

  return (
    <Card className="divide-y divide-line">
      {dias.map((d) => {
        const chave = dayKey(d);
        const eventos = porDia.get(chave) ?? [];
        const ehSelecionado = chave === dayKey(selecionado);

        return (
          <button
            key={chave}
            type="button"
            onClick={() => aoSelecionar(d)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
              ehSelecionado ? 'bg-raised' : 'hover:bg-raised/60',
            )}
          >
            <span className="w-14 shrink-0">
              <span className="block text-[11px] text-faint first-letter:uppercase">
                {nomeDiaLongo(d).slice(0, 3)}
              </span>
              <span
                className={cn(
                  'tabular block text-lg',
                  chave === hoje ? 'font-semibold text-accent' : 'text-ink',
                )}
              >
                {d.getDate()}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              {eventos.length === 0 ? (
                <span className="text-sm text-faint">livre</span>
              ) : (
                <span className="block space-y-0.5">
                  {eventos.slice(0, 3).map((e) => (
                    <span key={e.id} className="block truncate text-sm text-ink">
                      <span className="tabular text-xs text-faint">
                        {e.allDay ? '—' : formatHora(e.ocorreEm)}
                      </span>{' '}
                      {e.title}
                    </span>
                  ))}
                  {eventos.length > 3 && (
                    <span className="block text-xs text-faint">
                      e mais {eventos.length - 3}
                    </span>
                  )}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </Card>
  );
}
