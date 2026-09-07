'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';
import { cn } from '@/lib/cn';
import { MODULOS, modulosSugeridos, OPCOES_ROTINA } from '@/lib/modules';
import type { AreaModulo } from '@/lib/validation';

/**
 * O onboarding.
 *
 * Uma pergunta por tela. O prompt pedia para não jogar trinta campos de uma
 * vez — mas o motivo real é outro: cada resposta muda a próxima pergunta e
 * muda o app inteiro depois. Perguntar tudo junto desperdiça isso.
 *
 * Nada aqui é obrigatório além do nome. Dá para pular e ajustar depois.
 */

type Passo = 'nome' | 'rotina' | 'areas' | 'meta' | 'semana';

const PASSOS: Passo[] = ['nome', 'rotina', 'areas', 'meta', 'semana'];

export function Onboarding({ nomeInicial }: { nomeInicial: string }) {
  const router = useRouter();
  const { avisar } = useToast();

  const [passo, setPasso] = useState<Passo>('nome');
  const [nome, setNome] = useState(nomeInicial === 'você' ? '' : nomeInicial);
  const [rotina, setRotina] = useState<string[]>([]);
  const [areas, setAreas] = useState<AreaModulo[]>([]);
  const [meta, setMeta] = useState('');
  const [semana, setSemana] = useState<'leve' | 'equilibrada' | 'cheia' | null>(null);
  const [salvando, setSalvando] = useState(false);

  const indice = PASSOS.indexOf(passo);

  function avancar() {
    // Ao sair da rotina, já sugerimos as áreas — a pessoa só confirma.
    if (passo === 'rotina' && areas.length === 0) {
      setAreas(modulosSugeridos(rotina));
    }
    const proximo = PASSOS[indice + 1];
    if (proximo) setPasso(proximo);
  }

  function voltar() {
    const anterior = PASSOS[indice - 1];
    if (anterior) setPasso(anterior);
  }

  async function concluir() {
    setSalvando(true);
    try {
      await api('/api/onboarding', {
        metodo: 'POST',
        corpo: {
          displayName: nome.trim(),
          routineTags: rotina,
          modules: areas,
          mainGoal: meta.trim() || undefined,
          weekShape: semana ?? undefined,
        },
      });
      router.push('/inicio');
      router.refresh();
    } catch {
      avisar('Não conseguimos salvar agora. Tente novamente.', 'erro');
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-6">
        <Logo />
        <span className="tabular text-xs text-faint">
          {indice + 1} de {PASSOS.length}
        </span>
      </header>

      {/* Progresso do onboarding — discreto, mas presente. */}
      <div className="h-0.5 w-full bg-line">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-mk"
          style={{ width: `${((indice + 1) / PASSOS.length) * 100}%` }}
        />
      </div>

      <main id="conteudo" className="flex flex-1 flex-col justify-center px-5 py-10">
        <div className="mx-auto w-full max-w-md">
          {passo === 'nome' && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h1 className="text-display font-semibold text-ink">
                  Como podemos chamar você?
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  É como o Mikasa vai falar com você todo dia.
                </p>
              </div>

              <Input
                label="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nome.trim()) avancar();
                }}
              />

              <Button onClick={avancar} disabled={!nome.trim()} larguraTotal tamanho="lg">
                Continuar
              </Button>
            </div>
          )}

          {passo === 'rotina' && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h1 className="text-display font-semibold text-ink">
                  Como é sua rotina?
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  Escolha o que faz parte do seu dia. Pode marcar vários.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {OPCOES_ROTINA.map((opcao) => {
                  const ativo = rotina.includes(opcao);
                  return (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() =>
                        setRotina((atual) =>
                          ativo ? atual.filter((r) => r !== opcao) : [...atual, opcao],
                        )
                      }
                      className={cn(
                        'rounded-full border px-4 py-2.5 text-sm transition-colors',
                        ativo
                          ? 'border-ink bg-ink text-bg'
                          : 'border-line bg-surface text-muted hover:border-accent-soft hover:text-ink',
                      )}
                    >
                      {opcao}
                    </button>
                  );
                })}
              </div>

              <Navegacao aoVoltar={voltar} aoAvancar={avancar} />
            </div>
          )}

          {passo === 'areas' && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h1 className="text-display font-semibold text-ink">
                  Quais áreas você quer organizar?
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  Sugerimos algumas pela sua rotina. Tire ou acrescente o que quiser —
                  dá para mudar depois.
                </p>
              </div>

              <div className="space-y-2">
                {MODULOS.map((m) => {
                  const ativo = areas.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() =>
                        setAreas((atual) =>
                          ativo ? atual.filter((a) => a !== m.key) : [...atual, m.key],
                        )
                      }
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3.5 text-left transition-colors',
                        ativo
                          ? 'border-accent bg-raised'
                          : 'border-line bg-surface hover:border-accent-soft',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{m.nome}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {m.descricao}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          ativo ? 'border-accent bg-accent text-surface' : 'border-line',
                        )}
                      >
                        {ativo && (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2l2.4 2.4L9.5 4"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Navegacao aoVoltar={voltar} aoAvancar={avancar} />
            </div>
          )}

          {passo === 'meta' && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h1 className="text-display font-semibold text-ink">
                  Qual é sua principal meta agora?
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  Uma frase basta. Se ainda não souber, pode pular.
                </p>
              </div>

              <Input
                label="Sua meta"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="Guardar R$ 2.000 até dezembro"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') avancar();
                }}
              />

              <Navegacao aoVoltar={voltar} aoAvancar={avancar} rotuloAvancar="Continuar" />
            </div>
          )}

          {passo === 'semana' && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h1 className="text-display font-semibold text-ink">
                  Como costuma ser sua semana?
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  Isso ajuda o Mikasa a saber o que é um dia cheio para você.
                </p>
              </div>

              <div className="space-y-2">
                {(
                  [
                    { valor: 'leve', titulo: 'Leve', texto: 'Poucos compromissos fixos' },
                    {
                      valor: 'equilibrada',
                      titulo: 'Equilibrada',
                      texto: 'Alguns compromissos, algum espaço',
                    },
                    { valor: 'cheia', titulo: 'Cheia', texto: 'Quase todo dia tem algo' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    aria-pressed={semana === o.valor}
                    onClick={() => setSemana(o.valor)}
                    className={cn(
                      'w-full rounded-md border px-4 py-3.5 text-left transition-colors',
                      semana === o.valor
                        ? 'border-accent bg-raised'
                        : 'border-line bg-surface hover:border-accent-soft',
                    )}
                  >
                    <span className="block text-sm font-medium text-ink">{o.titulo}</span>
                    <span className="mt-0.5 block text-xs text-muted">{o.texto}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variante="secundario" onClick={voltar} disabled={salvando}>
                  Voltar
                </Button>
                <Button onClick={concluir} carregando={salvando} larguraTotal tamanho="lg">
                  Tudo pronto
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Navegacao({
  aoVoltar,
  aoAvancar,
  rotuloAvancar = 'Continuar',
}: {
  aoVoltar: () => void;
  aoAvancar: () => void;
  rotuloAvancar?: string;
}) {
  return (
    <div className="flex gap-2">
      <Button variante="secundario" onClick={aoVoltar}>
        Voltar
      </Button>
      <Button onClick={aoAvancar} larguraTotal tamanho="lg">
        {rotuloAvancar}
      </Button>
    </div>
  );
}
