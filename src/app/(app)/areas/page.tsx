import Link from 'next/link';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { modulosAtivos, MODULOS } from '@/lib/modules';
import { Card, Secao } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Áreas' };

/**
 * O índice das áreas.
 *
 * Existe principalmente para o celular, onde a barra inferior só tem cinco
 * lugares. Mostra o que está ligado — e, discretamente, o que está desligado,
 * para que ligar de volta não exija caçar em configurações.
 */
export default async function Areas() {
  const user = await exigirUsuarioPronto();
  const ativos = modulosAtivos(user.modules);
  const desligados = MODULOS.filter((m) => !ativos.some((a) => a.key === m.key));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Suas áreas</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Cada parte da sua vida tem um lugar.
        </p>
      </header>

      <section>
        <Card className="divide-y divide-line">
          {ativos.map((m) => (
            <Link
              key={m.key}
              href={m.href}
              className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-raised"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-ink">{m.nome}</span>
                <span className="mt-0.5 block text-xs text-muted">{m.descricao}</span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-faint"
              >
                <path
                  d="M6 3.5L10.5 8 6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ))}
        </Card>
      </section>

      {desligados.length > 0 && (
        <section>
          <Secao titulo="Não estão ativas" />
          <Card className="divide-y divide-line">
            {desligados.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-sm text-muted">{m.nome}</span>
                  <span className="mt-0.5 block text-xs text-faint">{m.descricao}</span>
                </span>
              </div>
            ))}
          </Card>
          <p className="mt-3 text-center text-xs text-faint">
            Você liga ou desliga áreas em{' '}
            <Link href="/perfil" className="underline underline-offset-2 hover:text-muted">
              Perfil
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
