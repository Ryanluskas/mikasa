'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Check, Progresso, Secao, Tag } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { formatCents, parseCents, pct } from '@/lib/money';
import { formatRelativo } from '@/lib/dates';
import { ROTULO_AREA_META } from '@/lib/modules';
import { VOZ } from '@/lib/voice';
import { cn } from '@/lib/cn';

export type MetaVisual = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  targetCents: number | null;
  currentCents: number | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  deadline: string | null;
  status: string;
  steps: { id: string; title: string; done: boolean }[];
};

function progressoDe(m: MetaVisual): number {
  if (m.targetCents) return pct(m.currentCents ?? 0, m.targetCents);
  if (m.targetValue) return pct(m.currentValue ?? 0, m.targetValue);
  if (m.steps.length) {
    return Math.round((m.steps.filter((s) => s.done).length / m.steps.length) * 100);
  }
  return 0;
}

export function ListaDeMetas({ metas }: { metas: MetaVisual[] }) {
  const ativas = metas.filter((m) => m.status === 'active');
  const concluidas = metas.filter((m) => m.status === 'done');

  return (
    <div className="space-y-8">
      {ativas.length > 0 && (
        <section className="space-y-3">
          {ativas.map((m) => (
            <CardDeMeta key={m.id} meta={m} />
          ))}
        </section>
      )}

      {concluidas.length > 0 && (
        <section>
          <Secao titulo="Conquistadas" />
          <Card className="divide-y divide-line">
            {concluidas.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex-1 truncate text-sm text-muted">{m.title}</span>
                <Tag tom="bom">Feito</Tag>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function CardDeMeta({ meta }: { meta: MetaVisual }) {
  const router = useRouter();
  const { avisar } = useToast();

  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [etapas, setEtapas] = useState(meta.steps);

  const progresso = progressoDe({ ...meta, steps: etapas });

  async function marcarEtapa(id: string, done: boolean) {
    const antes = etapas;
    setEtapas((atual) => atual.map((s) => (s.id === id ? { ...s, done } : s)));

    try {
      await api(`/api/goal-steps/${id}`, { metodo: 'PATCH', corpo: { done } });
      if (done) avisar(VOZ.etapaConcluida());
      router.refresh();
    } catch {
      setEtapas(antes);
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  async function registrarValor(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseCents(valor);
    if (cents === null || cents < 0) {
      avisar('Digite um valor válido.', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const r = await api<{ concluiuAgora: boolean }>(`/api/goals/${meta.id}`, {
        metodo: 'PATCH',
        corpo: { currentCents: cents },
      });
      avisar(r.concluiuAgora ? VOZ.metaFinanceiraAtingida() : 'Progresso atualizado.');
      setAberto(false);
      setValor('');
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Card className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-medium leading-snug text-ink">{meta.title}</h3>
            {meta.description && (
              <p className="mt-1 text-sm text-muted">{meta.description}</p>
            )}
          </div>
          <Tag>{ROTULO_AREA_META[meta.area] ?? meta.area}</Tag>
        </div>

        {meta.targetCents ? (
          <p className="tabular mt-3 text-sm text-muted">
            {formatCents(meta.currentCents ?? 0)} de {formatCents(meta.targetCents)}
          </p>
        ) : meta.targetValue ? (
          <p className="tabular mt-3 text-sm text-muted">
            {meta.currentValue ?? 0} de {meta.targetValue} {meta.unit ?? ''}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <Progresso valor={progresso} rotulo={meta.title} />
          <span className="tabular shrink-0 text-xs text-muted">{progresso}%</span>
        </div>

        {etapas.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {etapas.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5">
                <Check
                  marcado={s.done}
                  onChange={(v) => marcarEtapa(s.id, v)}
                  label={`Marcar etapa ${s.title}`}
                />
                <span
                  className={cn(
                    'text-sm',
                    s.done ? 'text-faint line-through' : 'text-ink',
                  )}
                >
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-xs text-faint">
            {meta.deadline ? `Prazo ${formatRelativo(meta.deadline)}` : 'Sem prazo'}
          </span>
          {meta.targetCents !== null && (
            <button
              type="button"
              onClick={() => {
                setValor(((meta.currentCents ?? 0) / 100).toFixed(2).replace('.', ','));
                setAberto(true);
              }}
              className="text-xs font-medium text-ink underline-offset-4 hover:underline"
            >
              Atualizar valor
            </button>
          )}
        </div>
      </Card>

      <Sheet
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Quanto você já juntou?"
        descricao={meta.title}
      >
        <form onSubmit={registrarValor} className="space-y-4 pt-1">
          <Input
            label="Valor atual"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Salvar
          </Button>
        </form>
      </Sheet>
    </>
  );
}
