'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Check, Vazio } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { VOZ } from '@/lib/voice';
import { cn } from '@/lib/cn';

/**
 * Hábitos.
 *
 * A faixa mostra os últimos 14 dias. Não é uma competição e não tem placar:
 * é só a pessoa vendo a própria constância.
 *
 * A sequência ("7 dias seguidos") só aparece se o usuário quiser — em Perfil
 * dá para desligar streaks completamente. E quando uma sequência termina, o
 * Mikasa não diz que ela foi "perdida".
 */

type HabitoVisual = {
  id: string;
  name: string;
  targetPerWeek: number;
  dias: string[];
};

const DIAS_VISIVEIS = 14;

export function PainelDeHabitos({
  habitos,
  streaksLigados,
}: {
  habitos: HabitoVisual[];
  streaksLigados: boolean;
}) {
  const router = useRouter();
  const { avisar } = useToast();

  const [lista, setLista] = useState(habitos);
  const [novoAberto, setNovoAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  const hoje = startOfDay(new Date());
  const janela = Array.from({ length: DIAS_VISIVEIS }, (_, i) =>
    addDays(hoje, -(DIAS_VISIVEIS - 1 - i)),
  );

  async function alternar(habito: HabitoVisual, data: Date, marcar: boolean) {
    const chave = dayKey(data);
    const antes = lista;

    setLista((atual) =>
      atual.map((h) =>
        h.id === habito.id
          ? {
              ...h,
              dias: marcar
                ? [...h.dias, data.toISOString()]
                : h.dias.filter((d) => dayKey(d) !== chave),
            }
          : h,
      ),
    );

    try {
      await api(`/api/habits/${habito.id}/entries`, {
        metodo: 'PUT',
        corpo: { date: data.toISOString(), done: marcar },
      });
      router.refresh();
    } catch {
      setLista(antes);
      avisar(VOZ.erro.generico, 'erro');
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const novo = await api<{ id: string; name: string; targetPerWeek: number }>(
        '/api/habits',
        { metodo: 'POST', corpo: { name: nome.trim() } },
      );
      setLista((atual) => [...atual, { ...novo, dias: [] }]);
      setNome('');
      setNovoAberto(false);
      router.refresh();
    } catch {
      avisar(VOZ.erro.generico, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {lista.length === 0 ? (
        <Vazio
          titulo={VOZ.vazio.habitos.titulo}
          texto={VOZ.vazio.habitos.texto}
          acao={<Button onClick={() => setNovoAberto(true)}>Criar um hábito</Button>}
        />
      ) : (
        <>
          <div className="space-y-3">
            {lista.map((h) => {
              const marcados = new Set(h.dias.map((d) => dayKey(d)));
              const feitoHoje = marcados.has(dayKey(hoje));
              const sequencia = calcularSequencia(marcados, hoje);

              return (
                <Card key={h.id} className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Check
                      marcado={feitoHoje}
                      onChange={(v) => alternar(h, hoje, v)}
                      label={`Marcar ${h.name} hoje`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{h.name}</p>
                      {streaksLigados && sequencia > 1 && (
                        <p className="mt-0.5 text-xs text-muted">
                          {sequencia} dias de consistência
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Os últimos 14 dias. Clicável: dá para marcar ontem. */}
                  <div className="mt-3.5 flex gap-1">
                    {janela.map((d) => {
                      const feito = marcados.has(dayKey(d));
                      const ehHoje = dayKey(d) === dayKey(hoje);
                      return (
                        <button
                          key={dayKey(d)}
                          type="button"
                          onClick={() => alternar(h, d, !feito)}
                          aria-label={`${h.name} em ${dayKey(d)}: ${
                            feito ? 'feito' : 'não feito'
                          }`}
                          className={cn(
                            'h-6 flex-1 rounded-sm transition-colors',
                            feito ? 'bg-accent' : 'bg-line/60 hover:bg-line',
                            ehHoje && !feito && 'ring-1 ring-inset ring-accent-soft',
                          )}
                        />
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          <Button variante="secundario" onClick={() => setNovoAberto(true)} larguraTotal>
            Novo hábito
          </Button>
        </>
      )}

      <Sheet
        aberto={novoAberto}
        aoFechar={() => setNovoAberto(false)}
        titulo="Novo hábito"
        descricao="Uma coisa pequena, que caiba num dia comum."
      >
        <form onSubmit={criar} className="space-y-4 pt-1">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Beber água"
            autoFocus
            required
          />
          <Button type="submit" carregando={salvando} larguraTotal>
            Criar
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

/** Dias seguidos até hoje. Se hoje ainda não foi marcado, conta a partir de ontem. */
function calcularSequencia(marcados: Set<string>, hoje: Date): number {
  let conta = 0;
  let cursor = marcados.has(dayKey(hoje)) ? hoje : addDays(hoje, -1);

  while (marcados.has(dayKey(cursor)) && conta < 400) {
    conta++;
    cursor = addDays(cursor, -1);
  }

  return conta;
}
