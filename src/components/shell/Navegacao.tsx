'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { MODULOS } from '@/lib/modules';
import { Logo } from '@/components/brand/Logo';
import type { AreaModulo } from '@/lib/validation';

/**
 * A navegação do Mikasa.
 *
 * Uma estrutura, duas formas: barra inferior no celular, coluna lateral no
 * desktop. Não é um menu "responsivo" que encolhe — são dois arranjos da
 * mesma lista, cada um confortável no seu contexto.
 *
 * No celular ficam apenas cinco destinos, alcançáveis com o polegar. Tudo
 * mais mora dentro de "Áreas".
 */

type Icone = 'inicio' | 'hoje' | 'vida' | 'calendario' | 'areas' | 'perfil';

const CAMINHOS: Record<Icone, string> = {
  inicio: 'M3 9.2 10 3.5l7 5.7V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.2Z',
  hoje: 'M4 4.5h12a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm2-2v3m8-3v3M3 8.5h14',
  vida: 'M3 13.5c2.2 0 2.2-6 4.4-6s2.2 8 4.4 8 2.2-5 5.2-5',
  calendario: 'M4 4.5h12a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm2-2v3m8-3v3M3 8.5h14M7 12h2m4 0h.01',
  areas: 'M3.5 3.5h5v5h-5v-5Zm8 0h5v5h-5v-5Zm-8 8h5v5h-5v-5Zm8 0h5v5h-5v-5Z',
  perfil: 'M10 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM4 17c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5',
};

function Icone({ nome, ativo }: { nome: Icone; ativo: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d={CAMINHOS[nome]}
        stroke="currentColor"
        strokeWidth={ativo ? 1.7 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRINCIPAIS: { href: string; rotulo: string; icone: Icone }[] = [
  { href: '/inicio', rotulo: 'Início', icone: 'inicio' },
  { href: '/hoje', rotulo: 'Hoje', icone: 'hoje' },
  { href: '/vida', rotulo: 'Vida', icone: 'vida' },
  { href: '/calendario', rotulo: 'Agenda', icone: 'calendario' },
];

function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Celular ──────────────────────────────────────────────────────────────────

export function BarraInferior() {
  const pathname = usePathname();

  const itens = [
    ...PRINCIPAIS,
    { href: '/areas', rotulo: 'Áreas', icone: 'areas' as const },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm lg:hidden"
    >
      <ul className="flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {itens.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex h-[58px] flex-col items-center justify-center gap-1 transition-colors',
                  ativo ? 'text-ink' : 'text-faint',
                )}
              >
                <Icone nome={item.icone} ativo={ativo} />
                <span className={cn('text-[10px]', ativo && 'font-medium')}>
                  {item.rotulo}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────────

export function BarraLateral({ modulos }: { modulos: AreaModulo[] }) {
  const pathname = usePathname();
  const ativos = MODULOS.filter((m) => modulos.includes(m.key));

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 py-6">
        <Link href="/inicio" className="inline-block">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {PRINCIPAIS.map((item) => (
            <ItemLateral
              key={item.href}
              href={item.href}
              rotulo={item.rotulo}
              icone={item.icone}
              ativo={estaAtivo(pathname, item.href)}
            />
          ))}
        </ul>

        {ativos.length > 0 && (
          <>
            <p className="secao px-3 pb-2 pt-6">Minhas áreas</p>
            <ul className="space-y-0.5">
              {ativos.map((m) => (
                <li key={m.key}>
                  <Link
                    href={m.href}
                    aria-current={estaAtivo(pathname, m.href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center rounded px-3 py-2 text-sm transition-colors',
                      estaAtivo(pathname, m.href)
                        ? 'bg-raised font-medium text-ink'
                        : 'text-muted hover:bg-raised hover:text-ink',
                    )}
                  >
                    {m.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <ul>
          <ItemLateral
            href="/perfil"
            rotulo="Perfil e ajustes"
            icone="perfil"
            ativo={estaAtivo(pathname, '/perfil')}
          />
        </ul>
      </div>
    </aside>
  );
}

function ItemLateral({
  href,
  rotulo,
  icone,
  ativo,
}: {
  href: string;
  rotulo: string;
  icone: Icone;
  ativo: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={ativo ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
          ativo ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-raised hover:text-ink',
        )}
      >
        <Icone nome={icone} ativo={ativo} />
        {rotulo}
      </Link>
    </li>
  );
}
