'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Check, Secao, Tag, Vazio } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { formatHora } from '@/lib/dates';
import { VOZ } from '@/lib/voice';
import { cn } from '@/lib/cn';
import type { ItemDoDia } from '@/lib/today';

/**
 * A lista do dia.
 *
 * Marcar algo aqui é otimista: o item risca na hora e a requisição sai por
 * baixo. Se falhar, ele volta ao estado anterior e o Mikasa avisa. Esperar o
 * servidor para riscar uma tarefa faria o app parecer lento sem motivo.
 */

type Props = { itens: ItemDoDia[] };

const ROTULO_TIPO: Record<ItemDoDia['tipo'], string> = {
  evento: 'Evento',
  tarefa: 'Tarefa',
  treino: 'Treino',
  habito: 'Hábito',
  prova: 'Prova',
  lembrete: 'Lembrete',
};

export function ListaDoDia({ itens }: Props) {
  const router = useRouter();
  const { avisar } = useToast();
  const [, iniciar] = useTransition();

  // Sobreposição local: o que o usuário acabou de marcar, antes do servidor
  // confirmar. `undefined` significa "use o valor que veio do servidor".
  const [otimista, setOtimista] = useState<Record<string, boolean>>({});
  const [contador, setContador] = useState(0);

  const estaFeito = (item: ItemDoDia) => otimista[item.id] ?? item.concluido;

  const compromissos = itens.filter((i) => i.tipo !== 'habito');
  const habitos = itens.filter((i) => i.tipo === 'habito');

  async function alternar(item: ItemDoDia, marcado: boolean) {
    setOtimista((atual) => ({ ...atual, [item.id]: marcado }));

    try {
      if (item.tipo === 'tarefa') {
        const id = item.id.replace('tarefa:', '');
        await api(`/api/tasks/${id}`, { metodo: 'PATCH', corpo: { done: marcado } });
      } else if (item.tipo === 'habito') {
        const id = item.id.replace('habito:', '');
        await api(`/api/habits/${id}/entries`, {
          metodo: 'PUT',
          corpo: { date: new Date().toISOString(), done: marcado },
        });
      } else {
        return;
      }

      if (marcado) {
        avisar(VOZ.tarefaConcluida(contador));
        setContador((n) => n + 1);
      }
      iniciar(() => router.refresh());
    } catch {
      // Desfaz o otimismo: o item volta a ser o que era.
      setOtimista((atual) => {
        const copia = { ...atual };
        delete copia[item.id];
        return copia;
      });
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  if (itens.length === 0) {
    return <Vazio titulo={VOZ.vazio.hoje.titulo} texto={VOZ.vazio.hoje.texto} />;
  }

  return (
    <div className="space-y-8">
      {compromissos.length > 0 && (
        <section>
          <Secao titulo="No seu dia" />
          <Card className="divide-y divide-line">
            {compromissos.map((item) => {
              const feito = estaFeito(item);
              const marcavel = item.tipo === 'tarefa';

              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                  {marcavel ? (
                    <Check
                      marcado={feito}
                      onChange={(v) => alternar(item, v)}
                      label={`Marcar ${item.titulo}`}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        'tabular w-12 shrink-0 text-xs',
                        feito ? 'text-faint' : 'text-muted',
                      )}
                    >
                      {item.quando ? formatHora(item.quando) : '—'}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        feito ? 'text-faint line-through' : 'text-ink',
                      )}
                    >
                      {item.titulo}
                    </p>
                    {(item.detalhe || marcavel) && (
                      <p className="mt-0.5 truncate text-xs text-faint">
                        {item.detalhe ??
                          (item.quando ? formatHora(item.quando) : ROTULO_TIPO[item.tipo])}
                      </p>
                    )}
                  </div>

                  {item.detalhe === 'Ficou de outro dia' && (
                    <Tag tom="atencao">Atrasada</Tag>
                  )}
                  {item.tipo === 'prova' && <Tag tom="atencao">Prova</Tag>}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {habitos.length > 0 && (
        <section>
          <Secao titulo="Hábitos" />
          <Card className="divide-y divide-line">
            {habitos.map((item) => {
              const feito = estaFeito(item);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Check
                    marcado={feito}
                    onChange={(v) => alternar(item, v)}
                    label={`Marcar ${item.titulo}`}
                  />
                  <p
                    className={cn(
                      'flex-1 truncate text-sm',
                      feito ? 'text-faint line-through' : 'text-ink',
                    )}
                  >
                    {item.titulo}
                  </p>
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
