'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * As peças pequenas do design system.
 *
 * Ficam juntas por serem pequenas demais para um arquivo cada — e por serem
 * usadas em quase toda tela, o que torna a consistência entre elas mais
 * importante do que a separação.
 */

// ── Cartão ───────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-line bg-surface',
        onClick && 'cursor-pointer transition-colors hover:bg-raised',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Título de seção ──────────────────────────────────────────────────────────

export function Secao({
  titulo,
  acao,
  className,
}: {
  titulo: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="secao">{titulo}</h2>
      {acao}
    </div>
  );
}

// ── Barra de progresso ───────────────────────────────────────────────────────

export function Progresso({
  valor,
  rotulo,
  className,
}: {
  /** 0 a 100. */
  valor: number;
  rotulo?: string;
  className?: string;
}) {
  const limitado = Math.max(0, Math.min(100, valor));
  return (
    <div
      role="progressbar"
      aria-valuenow={limitado}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-mk"
        style={{ width: `${limitado}%` }}
      />
    </div>
  );
}

// ── Estado vazio ─────────────────────────────────────────────────────────────

export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
      {/* Marca discreta, não um ícone gigante ocupando a tela. */}
      <span aria-hidden className="mb-4 h-px w-8 bg-accent-soft" />
      <p className="text-base font-medium text-ink">{titulo}</p>
      <p className="mt-1.5 max-w-xs text-sm text-muted">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

// ── Etiqueta ─────────────────────────────────────────────────────────────────

export function Tag({
  children,
  tom = 'neutro',
}: {
  children: ReactNode;
  tom?: 'neutro' | 'bom' | 'atencao' | 'ruim';
}) {
  const tons = {
    neutro: 'bg-raised text-muted border-line',
    bom: 'bg-success/10 text-success border-success/25',
    atencao: 'bg-warning/10 text-warning border-warning/25',
    ruim: 'bg-danger/10 text-danger border-danger/25',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}

// ── Linha de lista ───────────────────────────────────────────────────────────

export function Linha({
  children,
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const classes = cn(
    'flex items-center gap-3 px-4 py-3 text-left transition-colors',
    (href || onClick) && 'hover:bg-raised active:bg-line/40',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'w-full')}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}

// ── Marcador de conclusão ────────────────────────────────────────────────────

export function Check({
  marcado,
  onChange,
  label,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      aria-label={label}
      onClick={() => onChange(!marcado)}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ease-mk',
        marcado
          ? 'border-accent bg-accent text-surface scale-100'
          : 'border-line bg-surface hover:border-accent-soft',
      )}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        className={cn(
          'transition-all duration-200 ease-mk',
          marcado ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      >
        <path
          d="M2.5 6.2l2.4 2.4L9.5 4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ── Esqueleto de carregamento ────────────────────────────────────────────────

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded bg-line/60', className)}
    />
  );
}
