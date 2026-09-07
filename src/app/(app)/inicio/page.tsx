import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { montarDia } from '@/lib/today';
import { observacaoDoDia } from '@/lib/life/engine';
import { resumoDoMes } from '@/lib/finance';
import { formatCents, pct } from '@/lib/money';
import { formatHora, saudacao, startOfDay } from '@/lib/dates';
import { resumoDoDia, VOZ } from '@/lib/voice';
import { Card, Progresso, Secao, Tag, Vazio } from '@/components/ui';
import { CheckinDoDia } from '@/components/life/CheckinDoDia';
import type { AreaModulo } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * A Home.
 *
 * Ela responde uma pergunta só: "o que está acontecendo na minha vida hoje?".
 * Não é um painel de métricas — é o resumo que a pessoa lê em cinco segundos
 * antes de guardar o celular no bolso.
 *
 * O conteúdo muda conforme as áreas que o usuário ligou. Não existe uma Home
 * padrão igual para todo mundo: quem não usa financeiro nunca vê saldo.
 */
export default async function Inicio() {
  const user = await exigirUsuarioPronto();
  const modulos = user.modules.filter((m) => m.enabled).map((m) => m.key as AreaModulo);

  const dia = await montarDia(user.id);

  const [metaDestaque, financeiro, treinosSemana] = await Promise.all([
    modulos.includes('goals')
      ? prisma.goal.findFirst({
          where: { userId: user.id, status: 'active' },
          // Meta com prazo vem primeiro: é a que tem relógio correndo.
          // Sem `nulls: 'last'` o SQLite colocaria as sem prazo na frente.
          orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
          include: { steps: { orderBy: { order: 'asc' } } },
        })
      : null,
    modulos.includes('finance') ? resumoDoMes(user.id) : null,
    modulos.includes('workouts')
      ? prisma.workout.count({
          where: {
            userId: user.id,
            startedAt: { gte: startOfDay(new Date(Date.now() - 6 * 86_400_000)) },
          },
        })
      : null,
  ]);

  const progressoMeta = metaDestaque
    ? metaDestaque.targetCents
      ? pct(metaDestaque.currentCents ?? 0, metaDestaque.targetCents)
      : metaDestaque.targetValue
        ? pct(metaDestaque.currentValue ?? 0, metaDestaque.targetValue)
        : Math.round(
            (metaDestaque.steps.filter((s) => s.done).length /
              Math.max(1, metaDestaque.steps.length)) *
              100,
          )
    : 0;

  const proximoEvento = dia.itens.find(
    (i) => i.tipo === 'evento' && i.quando && i.quando.getTime() > Date.now(),
  );
  const proximoTreino = dia.itens.find((i) => i.tipo === 'treino' && i.quando);

  const observacao = user.lifeLayerEnabled
    ? await observacaoDoDia(user.id, {
        compromissosHoje: dia.itens.filter((i) => i.tipo === 'evento').length,
        proximoTreinoEm: proximoTreino?.quando
          ? Math.round((proximoTreino.quando.getTime() - Date.now()) / 60000)
          : null,
        tarefasAbertas: dia.itens.filter((i) => i.tipo === 'tarefa' && !i.concluido).length,
        metaQuaseLa:
          metaDestaque && progressoMeta >= 80
            ? { titulo: metaDestaque.title, pct: progressoMeta }
            : null,
      })
    : null;

  const primeiroNome = user.displayName.split(' ')[0];

  return (
    <div className="space-y-9">
      <header>
        <h1 className="text-display font-semibold text-ink">
          {saudacao()}, {primeiroNome}.
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">{resumoDoDia(dia.importantes)}</p>
      </header>

      {/* A observação da camada de vida. Uma frase, quando há algo para dizer. */}
      {observacao && (
        <Card className="border-accent-soft/50 bg-raised px-4 py-3.5">
          <p className="text-sm leading-relaxed text-ink">{observacao}</p>
        </Card>
      )}

      {!dia.checkinFeito && <CheckinDoDia />}

      {/* ── Hoje ───────────────────────────────────────────────────────────── */}
      <section>
        <Secao
          titulo="Hoje"
          acao={
            <Link href="/hoje" className="text-xs text-muted hover:text-ink">
              Ver tudo
            </Link>
          }
        />

        {dia.itens.filter((i) => i.tipo !== 'habito').length === 0 ? (
          <Vazio titulo={VOZ.vazio.hoje.titulo} texto={VOZ.vazio.hoje.texto} />
        ) : (
          <Card className="divide-y divide-line">
            {dia.itens
              .filter((i) => i.tipo !== 'habito')
              .slice(0, 5)
              .map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="tabular w-12 shrink-0 text-xs text-faint">
                    {item.quando ? formatHora(item.quando) : '—'}
                  </span>
                  <span
                    className={
                      item.concluido
                        ? 'flex-1 truncate text-sm text-faint line-through'
                        : 'flex-1 truncate text-sm text-ink'
                    }
                  >
                    {item.titulo}
                  </span>
                  {item.detalhe && (
                    <span className="hidden shrink-0 text-xs text-faint sm:block">
                      {item.detalhe}
                    </span>
                  )}
                </div>
              ))}
          </Card>
        )}
      </section>

      {/* ── Progresso ──────────────────────────────────────────────────────── */}
      {metaDestaque && (
        <section>
          <Secao
            titulo="Progresso"
            acao={
              <Link href="/metas" className="text-xs text-muted hover:text-ink">
                Metas
              </Link>
            }
          />
          <Link href="/metas" className="block">
            <Card className="px-4 py-4 transition-colors hover:bg-raised">
              <p className="text-[15px] font-medium text-ink">{metaDestaque.title}</p>

              {/* A legenda tem que descrever a MESMA coisa que a barra mede,
                  senão a tela diz "1 de 2 etapas" ao lado de uma barra em 59%. */}
              {metaDestaque.targetCents ? (
                <p className="tabular mt-1 text-sm text-muted">
                  {formatCents(metaDestaque.currentCents ?? 0)} de{' '}
                  {formatCents(metaDestaque.targetCents)}
                </p>
              ) : metaDestaque.targetValue ? (
                <p className="tabular mt-1 text-sm text-muted">
                  {metaDestaque.currentValue ?? 0} de {metaDestaque.targetValue}{' '}
                  {metaDestaque.unit ?? ''}
                </p>
              ) : metaDestaque.steps.length > 0 ? (
                <p className="mt-1 text-sm text-muted">
                  {metaDestaque.steps.filter((s) => s.done).length} de{' '}
                  {metaDestaque.steps.length} etapas
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-3">
                <Progresso valor={progressoMeta} rotulo={metaDestaque.title} />
                <span className="tabular shrink-0 text-xs text-muted">
                  {progressoMeta}%
                </span>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* ── Números da semana ──────────────────────────────────────────────── */}
      {(financeiro || treinosSemana !== null) && (
        <section>
          <Secao titulo="Esta semana" />
          <div className="grid grid-cols-2 gap-3">
            {treinosSemana !== null && (
              <Link href="/treinos">
                <Card className="h-full px-4 py-4 transition-colors hover:bg-raised">
                  <p className="tabular text-2xl font-semibold text-ink">
                    {treinosSemana}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {treinosSemana === 1 ? 'treino' : 'treinos'}
                  </p>
                </Card>
              </Link>
            )}

            {financeiro && (
              <Link href="/financeiro">
                <Card className="h-full px-4 py-4 transition-colors hover:bg-raised">
                  <p className="tabular text-2xl font-semibold text-ink">
                    {formatCents(financeiro.saidasCents)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">gastos no mês</p>
                  {financeiro.variacaoSaidasCents !== 0 &&
                    Math.abs(financeiro.variacaoSaidasCents) > 1000 && (
                      <div className="mt-2">
                        <Tag tom={financeiro.variacaoSaidasCents < 0 ? 'bom' : 'neutro'}>
                          {formatCents(Math.abs(financeiro.variacaoSaidasCents))}{' '}
                          {financeiro.variacaoSaidasCents < 0 ? 'a menos' : 'a mais'}
                        </Tag>
                      </div>
                    )}
                </Card>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Pequena vitória ────────────────────────────────────────────────── */}
      {dia.concluidos > 0 && (
        <Card className="bg-raised px-4 py-3.5">
          <p className="text-sm text-ink">{VOZ.diaProdutivo(dia.concluidos)}</p>
        </Card>
      )}

      {proximoEvento?.quando && (
        <p className="text-center text-xs text-faint">
          Próximo: {proximoEvento.titulo} às {formatHora(proximoEvento.quando)}
        </p>
      )}
    </div>
  );
}
