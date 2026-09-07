'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { VOZ } from '@/lib/voice';
import { cn } from '@/lib/cn';

/**
 * O check-in diário.
 *
 * Duas perguntas e uma nota opcional. Nada de escala clínica, nada de
 * diagnóstico, nada de "como está sua saúde mental hoje". É só a pessoa
 * anotando como ela está — e é essa anotação que dá sentido a todo o resto
 * que o Mikasa observa.
 *
 * A pergunta some assim que respondida. O app não insiste.
 */

const CARINHAS = ['😞', '😕', '😐', '🙂', '😁'];

export function CheckinDoDia({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();
  const { avisar } = useToast();

  const [humor, setHumor] = useState<number | null>(null);
  const [energia, setEnergia] = useState<number | null>(null);
  const [sono, setSono] = useState('');
  const [nota, setNota] = useState('');
  const [mostrarNota, setMostrarNota] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function salvar(energiaEscolhida: number) {
    if (humor === null) return;
    setSalvando(true);
    try {
      await api('/api/checkins', {
        metodo: 'POST',
        corpo: {
          date: new Date().toISOString(),
          mood: humor,
          energy: energiaEscolhida,
          sleepHours: sono ? Number(sono.replace(',', '.')) : undefined,
          note: nota || undefined,
        },
      });
      setPronto(true);
      avisar(VOZ.checkin.obrigado);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
      setSalvando(false);
    }
  }

  if (pronto) return null;

  return (
    <Card className={cn('px-4 py-4', compacto && 'bg-raised')}>
      <p className="text-[15px] font-medium text-ink">{VOZ.checkin.pergunta}</p>

      <div
        role="radiogroup"
        aria-label={VOZ.checkin.pergunta}
        className="mt-3 flex items-center justify-between gap-1"
      >
        {CARINHAS.map((carinha, i) => {
          const valor = i + 1;
          const ativo = humor === valor;
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={VOZ.humor[i]}
              onClick={() => setHumor(valor)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-md py-2 transition-all duration-200 ease-mk',
                ativo ? 'bg-raised' : 'hover:bg-raised/60',
              )}
            >
              <span
                className={cn(
                  'text-2xl transition-transform duration-200 ease-mk',
                  ativo ? 'scale-110' : 'opacity-55 grayscale',
                )}
                aria-hidden
              >
                {carinha}
              </span>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  ativo ? 'text-ink' : 'text-faint',
                )}
              >
                {VOZ.humor[i]}
              </span>
            </button>
          );
        })}
      </div>

      {humor !== null && (
        <div className="mt-5 animate-fade-up">
          <p className="text-sm font-medium text-ink">{VOZ.checkin.perguntaEnergia}</p>
          <div
            role="radiogroup"
            aria-label={VOZ.checkin.perguntaEnergia}
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {VOZ.energia.map((rotulo, i) => {
              const valor = i + 1;
              return (
                <button
                  key={rotulo}
                  type="button"
                  role="radio"
                  aria-checked={energia === valor}
                  disabled={salvando}
                  onClick={() => {
                    setEnergia(valor);
                    // Responder energia fecha o check-in. Sem botão "salvar":
                    // é uma pergunta rápida, não um formulário.
                    if (!mostrarNota) void salvar(valor);
                  }}
                  className={cn(
                    'rounded-md border py-2.5 text-sm transition-colors',
                    energia === valor
                      ? 'border-accent bg-raised font-medium text-ink'
                      : 'border-line text-muted hover:border-accent-soft hover:text-ink',
                  )}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>

          {!mostrarNota ? (
            <button
              type="button"
              onClick={() => setMostrarNota(true)}
              className="mt-3 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Quer deixar uma nota, ou anotar quanto dormiu?
            </button>
          ) : (
            <div className="mt-4 space-y-3 animate-fade-up">
              <div>
                <label
                  htmlFor="checkin-sono"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Horas de sono
                </label>
                <input
                  id="checkin-sono"
                  inputMode="decimal"
                  placeholder="7,5"
                  value={sono}
                  onChange={(e) => setSono(e.target.value)}
                  className="h-11 w-full rounded-md border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-faint sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="checkin-nota"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  {VOZ.checkin.perguntaNota}
                </label>
                <textarea
                  id="checkin-nota"
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder={VOZ.checkin.placeholderNota}
                  className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-faint sm:text-sm"
                />
              </div>

              <Button
                onClick={() => energia !== null && salvar(energia)}
                disabled={energia === null}
                carregando={salvando}
                larguraTotal
              >
                Pronto
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
