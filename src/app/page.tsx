import Link from 'next/link';
import { Logo, Marca } from '@/components/brand/Logo';

export const metadata = {
  title: 'Mikasa — organize sua vida, uma coisa de cada vez',
  description:
    'Finanças, treinos, estudos, trabalho, metas e rotina em um único lugar. E, principalmente: como tudo isso está afetando a sua vida.',
};

/**
 * A landing page.
 *
 * Ela não vende "um app de produtividade" — existem centenas. Ela vende a
 * única coisa que o Mikasa faz e os outros não: mostrar como as áreas da sua
 * vida se afetam. Por isso o terceiro bloco, e não o primeiro, é o clímax.
 */
export default function Home() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link
            href="/entrar"
            className="rounded-md px-4 py-2.5 text-sm text-muted transition-colors hover:text-ink"
          >
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-ink/90"
          >
            Começar
          </Link>
        </nav>
      </header>

      <main id="conteudo">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-14 sm:pt-24">
          <div className="max-w-2xl">
            <h1 className="text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-6xl">
              Organize sua vida.
              <br />
              <span className="text-muted">Uma coisa de cada vez.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Finanças, treinos, estudos, trabalho, metas e rotina em um único
              lugar.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/criar-conta"
                className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-7 text-base font-medium text-bg transition-colors hover:bg-ink/90"
              >
                Começar gratuitamente
              </Link>
              <Link
                href="/entrar"
                className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-surface px-7 text-base text-ink transition-colors hover:bg-raised"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>

        {/* ── Uma vida, um lugar ───────────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">
              Uma vida. Um lugar para organizar tudo.
            </h2>

            <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  titulo: 'Financeiro',
                  texto:
                    'Quanto entrou, quanto saiu e para onde foi. Sem virar planilha.',
                },
                {
                  titulo: 'Treinos',
                  texto: 'Academia, jiu-jitsu, corrida. Sua carga subindo, visível.',
                },
                {
                  titulo: 'Estudos',
                  texto: 'Matérias, provas e as horas que você realmente estudou.',
                },
                {
                  titulo: 'Metas',
                  texto: 'Divididas em etapas, com o progresso na sua frente.',
                },
                {
                  titulo: 'Agenda',
                  texto: 'Aulas, treinos e compromissos, inclusive os que se repetem.',
                },
                {
                  titulo: 'Hábitos',
                  texto: 'As pequenas coisas do dia, sem virar competição.',
                },
              ].map((f) => (
                <li key={f.titulo}>
                  <h3 className="text-base font-medium text-ink">{f.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── O diferencial ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-5 py-24">
          <p className="secao">O que o Mikasa faz de diferente</p>

          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            Não são seis aplicativos dentro de um.
            <br />
            <span className="text-muted">É o que acontece quando eles conversam.</span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Qualquer app anota que você treinou. Qualquer app anota quanto você
            gastou. Nenhum deles responde a pergunta que você realmente tem:
          </p>

          <p className="mt-4 max-w-xl text-lg font-medium leading-relaxed text-ink">
            &ldquo;Como essas coisas estão afetando a minha vida?&rdquo;
          </p>

          {/* Exemplos reais do que a camada de vida produz. */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              {
                titulo: 'Sono e disposição andam juntos',
                corpo:
                  'Você costuma marcar mais energia nos dias em que dormiu mais.',
                base: '18 dias com sono e energia registrados',
              },
              {
                titulo: 'Dias cheios deixam menos espaço',
                corpo:
                  'Nos dias com três ou mais compromissos, você conclui menos tarefas.',
                base: '9 dias cheios e 14 dias comuns',
              },
              {
                titulo: 'Os dias de treino aparecem diferentes',
                corpo:
                  'Nos dias em que você treinou, seu check-in ficou mais para cima.',
                base: '11 dias com treino e 16 dias sem',
              },
              {
                titulo: 'Pessoas ficou de lado',
                corpo:
                  'Faz 21 dias que você não registra nada nessa área. Não é cobrança — mas ficou fora do seu equilíbrio.',
                base: '30 dias observados',
              },
            ].map((c) => (
              <div key={c.titulo} className="rounded-lg border border-line bg-surface px-5 py-4">
                <h3 className="text-[15px] font-medium leading-snug text-ink">{c.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.corpo}</p>
                <p className="mt-3 text-xs text-faint">Observado em {c.base}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
            Tudo isso vem só do que você registrou. Quando não há dados
            suficientes, o Mikasa diz que não há — em vez de inventar um número
            bonito.
          </p>
        </section>

        {/* ── Seu dia ──────────────────────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">
                  Seu dia, sem complicação.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted">
                  Uma tela mostra o que importa hoje. Aula, treino, tarefa,
                  prova — tudo junto, em ordem de relógio.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-muted">
                  E pequenas vitórias também contam. &ldquo;Feito.&rdquo; já
                  basta.
                </p>
              </div>

              {/* Amostra da interface, montada com os mesmos tokens do app. */}
              <div className="rounded-lg border border-line bg-bg p-5">
                <p className="secao">Hoje</p>
                <div className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
                  {[
                    { hora: '08:00', titulo: 'Aula' },
                    { hora: '13:00', titulo: 'Trabalho' },
                    { hora: '18:30', titulo: 'Jiu-jitsu' },
                    { hora: '21:30', titulo: 'Estudar matemática' },
                  ].map((i) => (
                    <div key={i.hora} className="flex items-center gap-3 px-4 py-3">
                      <span className="tabular w-12 shrink-0 text-xs text-faint">
                        {i.hora}
                      </span>
                      <span className="text-sm text-ink">{i.titulo}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md border border-line bg-surface px-4 py-3.5">
                  <p className="text-sm text-ink">
                    Você treinou 3 vezes esta semana. Continue assim.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Fechamento ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-5 py-28 text-center">
          <Marca tamanho={56} className="mx-auto" />

          <h2 className="mx-auto mt-8 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            Sua vida não precisa ficar na sua cabeça.
          </h2>

          <p className="mx-auto mt-5 max-w-md text-lg text-muted">
            Deixe o Mikasa organizar com você.
          </p>

          <Link
            href="/criar-conta"
            className="mt-9 inline-flex h-12 items-center justify-center rounded-md bg-ink px-8 text-base font-medium text-bg transition-colors hover:bg-ink/90"
          >
            Começar agora
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <p className="text-sm text-faint">
            Sua vida é complexa. Sua organização não precisa ser.
          </p>
          <p className="text-xs text-faint">Mikasa</p>
        </div>
      </footer>
    </div>
  );
}
