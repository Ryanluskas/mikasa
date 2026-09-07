'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Segmentado } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api, ErroApi } from '@/lib/http';
import { parseCents } from '@/lib/money';
import { toLocalInput } from '@/lib/dates';
import { VOZ } from '@/lib/voice';
import {
  CATEGORIAS_EVENTO,
  CATEGORIAS_FINANCEIRAS,
  TIPOS_TREINO,
} from '@/lib/validation';
import {
  ROTULO_CATEGORIA_EVENTO,
  ROTULO_CATEGORIA_FINANCEIRA,
  ROTULO_TREINO,
} from '@/lib/modules';
import type { AreaModulo } from '@/lib/validation';

/**
 * O "+" do Mikasa.
 *
 * O prompt pedia poucos cliques para qualquer ação importante. Aqui isso vira
 * uma regra concreta: dois toques até o campo de digitar, e um formulário que
 * cabe na tela sem rolar.
 *
 * As opções oferecidas dependem das áreas que o usuário ligou. Quem não usa
 * financeiro nunca vê "Despesa".
 */

type Tipo = 'tarefa' | 'evento' | 'despesa' | 'treino' | 'meta' | 'estudo';

const ROTULO_TIPO: Record<Tipo, string> = {
  tarefa: 'Tarefa',
  evento: 'Evento',
  despesa: 'Despesa',
  treino: 'Treino',
  meta: 'Meta',
  estudo: 'Estudo',
};

export function AdicaoRapida({ modulos }: { modulos: AreaModulo[] }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo | null>(null);

  const disponiveis: Tipo[] = [
    'tarefa',
    'evento',
    ...(modulos.includes('finance') ? (['despesa'] as Tipo[]) : []),
    ...(modulos.includes('workouts') ? (['treino'] as Tipo[]) : []),
    ...(modulos.includes('study') ? (['estudo'] as Tipo[]) : []),
    ...(modulos.includes('goals') ? (['meta'] as Tipo[]) : []),
  ];

  function fechar() {
    setAberto(false);
    // Espera a animação de saída antes de limpar, para o conteúdo não sumir
    // na frente do usuário.
    setTimeout(() => setTipo(null), 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Adicionar"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bg shadow-lift transition-transform duration-150 ease-mk active:scale-95 lg:bottom-6 lg:right-6"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path d="M11 5v12M5 11h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      <Sheet
        aberto={aberto}
        aoFechar={fechar}
        titulo={tipo ? ROTULO_TIPO[tipo] : 'Adicionar'}
        descricao={tipo ? undefined : 'O que você quer registrar?'}
      >
        {!tipo ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {disponiveis.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className="rounded-md border border-line bg-surface px-4 py-4 text-left text-sm font-medium text-ink transition-colors hover:bg-raised"
              >
                {ROTULO_TIPO[t]}
              </button>
            ))}
          </div>
        ) : (
          <Formulario tipo={tipo} aoConcluir={fechar} aoVoltar={() => setTipo(null)} />
        )}
      </Sheet>
    </>
  );
}

function Formulario({
  tipo,
  aoConcluir,
  aoVoltar,
}: {
  tipo: Tipo;
  aoConcluir: () => void;
  aoVoltar: () => void;
}) {
  const router = useRouter();
  const { avisar } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Um estado só para todos os formulários: eles nunca aparecem ao mesmo tempo.
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [quando, setQuando] = useState(toLocalInput(new Date()));
  const [categoria, setCategoria] = useState('outros');
  const [categoriaEvento, setCategoriaEvento] = useState('personal');
  const [tipoTreino, setTipoTreino] = useState('gym');
  const [duracao, setDuracao] = useState('60');
  const [intensidade, setIntensidade] = useState<'1' | '2' | '3'>('2');
  const [minutos, setMinutos] = useState('45');
  const [notas, setNotas] = useState('');
  const [tipoLancamento, setTipoLancamento] = useState<'expense' | 'income'>('expense');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErros({});
    setSalvando(true);

    try {
      switch (tipo) {
        case 'tarefa': {
          await api('/api/tasks', {
            metodo: 'POST',
            corpo: {
              title: titulo,
              notes: notas || undefined,
              dueAt: quando ? new Date(quando).toISOString() : undefined,
            },
          });
          avisar(VOZ.tarefaConcluida());
          break;
        }

        case 'evento': {
          const inicio = new Date(quando);
          await api('/api/events', {
            metodo: 'POST',
            corpo: {
              title: titulo,
              category: categoriaEvento,
              startAt: inicio.toISOString(),
              // Uma hora é a duração que quase todo compromisso tem. O usuário
              // ajusta depois se precisar — melhor do que pedir dois campos.
              endAt: new Date(inicio.getTime() + 3600_000).toISOString(),
              notes: notas || undefined,
            },
          });
          avisar('Evento criado.');
          break;
        }

        case 'despesa': {
          const cents = parseCents(valor);
          if (cents === null || cents <= 0) {
            setErros({ valor: 'Digite um valor válido.' });
            setSalvando(false);
            return;
          }
          await api('/api/finance/transactions', {
            metodo: 'POST',
            corpo: {
              type: tipoLancamento,
              amountCents: cents,
              category: categoria,
              description: titulo || undefined,
              occurredAt: new Date(quando).toISOString(),
            },
          });
          avisar('Lançamento registrado.');
          break;
        }

        case 'treino': {
          const resposta = await api<{ totalTreinos: number }>('/api/workouts', {
            metodo: 'POST',
            corpo: {
              kind: tipoTreino,
              title: titulo || undefined,
              startedAt: new Date(quando).toISOString(),
              durationMin: Number(duracao) || 60,
              intensity: Number(intensidade),
              notes: notas || undefined,
            },
          });
          avisar(VOZ.treinoRegistrado(resposta.totalTreinos));
          break;
        }

        case 'estudo': {
          await api('/api/study-sessions', {
            metodo: 'POST',
            corpo: {
              minutes: Number(minutos) || 45,
              startedAt: new Date(quando).toISOString(),
              notes: titulo || undefined,
            },
          });
          avisar(VOZ.estudoConcluido(Number(minutos) || 45));
          break;
        }

        case 'meta': {
          const cents = valor ? parseCents(valor) : null;
          await api('/api/goals', {
            metodo: 'POST',
            corpo: {
              title: titulo,
              description: notas || undefined,
              area: cents ? 'finance' : 'personal',
              ...(cents ? { targetCents: cents, currentCents: 0 } : {}),
            },
          });
          avisar('Meta criada.');
          break;
        }
      }

      aoConcluir();
      // `refresh` recarrega os Server Components sem descartar o estado da
      // página — o número novo aparece sem a tela piscar.
      router.refresh();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        setErros(erro.fields ?? {});
        avisar(erro.message, 'erro');
      } else {
        avisar(VOZ.erro.generico, 'erro');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 pt-1">
      {tipo === 'despesa' && (
        <Segmentado
          label="Tipo"
          valor={tipoLancamento}
          onChange={setTipoLancamento}
          opcoes={[
            { valor: 'expense', rotulo: 'Saiu' },
            { valor: 'income', rotulo: 'Entrou' },
          ]}
        />
      )}

      {tipo === 'despesa' ? (
        <Input
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          erro={erros.valor ?? erros.amountCents}
          autoFocus
          required
        />
      ) : (
        <Input
          label={
            tipo === 'estudo'
              ? 'O que você estudou'
              : tipo === 'treino'
                ? 'Nome do treino'
                : 'Título'
          }
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          erro={erros.title}
          placeholder={
            tipo === 'meta'
              ? 'Comprar meu primeiro carro'
              : tipo === 'treino'
                ? 'Opcional'
                : undefined
          }
          autoFocus
          required={tipo !== 'treino' && tipo !== 'estudo'}
        />
      )}

      {tipo === 'despesa' && (
        <>
          <Select
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            opcoes={CATEGORIAS_FINANCEIRAS.map((c) => ({
              valor: c,
              rotulo: ROTULO_CATEGORIA_FINANCEIRA[c],
            }))}
          />
          <Input
            label="Descrição"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Opcional"
          />
        </>
      )}

      {tipo === 'evento' && (
        <Select
          label="Categoria"
          value={categoriaEvento}
          onChange={(e) => setCategoriaEvento(e.target.value)}
          opcoes={CATEGORIAS_EVENTO.map((c) => ({
            valor: c,
            rotulo: ROTULO_CATEGORIA_EVENTO[c],
          }))}
        />
      )}

      {tipo === 'treino' && (
        <>
          <Select
            label="Modalidade"
            value={tipoTreino}
            onChange={(e) => setTipoTreino(e.target.value)}
            opcoes={TIPOS_TREINO.map((t) => ({ valor: t, rotulo: ROTULO_TREINO[t] }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duração (min)"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
            />
            <Segmentado
              label="Intensidade"
              valor={intensidade}
              onChange={setIntensidade}
              opcoes={[
                { valor: '1', rotulo: 'Leve' },
                { valor: '2', rotulo: 'Médio' },
                { valor: '3', rotulo: 'Forte' },
              ]}
            />
          </div>
        </>
      )}

      {tipo === 'estudo' && (
        <Input
          label="Minutos"
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
        />
      )}

      {tipo === 'meta' && (
        <Input
          label="Valor a juntar"
          inputMode="decimal"
          placeholder="Opcional — só para metas de dinheiro"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      )}

      {tipo !== 'meta' && (
        <Input
          label={tipo === 'tarefa' ? 'Para quando' : 'Quando'}
          type="datetime-local"
          value={quando}
          onChange={(e) => setQuando(e.target.value)}
          erro={erros.startAt ?? erros.dueAt ?? erros.occurredAt}
        />
      )}

      {(tipo === 'tarefa' || tipo === 'evento' || tipo === 'treino' || tipo === 'meta') && (
        <Textarea
          label="Observações"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Opcional"
        />
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variante="secundario" onClick={aoVoltar}>
          Voltar
        </Button>
        <Button type="submit" carregando={salvando} larguraTotal>
          Salvar
        </Button>
      </div>
    </form>
  );
}
