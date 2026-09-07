'use client';

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Campos de formulário do Mikasa.
 *
 * Todo campo tem `<label>` de verdade ligado ao controle — nada de placeholder
 * fazendo papel de rótulo, que some assim que a pessoa começa a digitar e
 * deixa quem usa leitor de tela sem contexto nenhum.
 *
 * O erro é anunciado por `aria-describedby` + `role="alert"`, para que a
 * pessoa saiba o que houve sem precisar enxergar a cor vermelha.
 */

const BASE =
  'w-full rounded-md border bg-surface px-3 text-[16px] sm:text-sm text-ink placeholder:text-faint ' +
  'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
// 16px no mobile de propósito: abaixo disso o iOS dá zoom no foco do input.

function classesCampo(erro?: string) {
  return cn(BASE, erro ? 'border-danger' : 'border-line focus:border-accent');
}

type Envolucro = {
  label: string;
  erro?: string;
  dica?: string;
  children: (props: { id: string; descrito: string | undefined }) => ReactNode;
};

function Envolver({ label, erro, dica, children }: Envolucro) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const descrito = [erro ? idErro : null, dica ? idDica : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, descrito })}
      {dica && !erro && (
        <p id={idDica} className="text-xs text-muted">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="text-xs text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  erro?: string;
  dica?: string;
};

export function Input({ label, erro, dica, className, ...props }: InputProps) {
  return (
    <Envolver label={label} erro={erro} dica={dica}>
      {({ id, descrito }) => (
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
          className={cn(classesCampo(erro), 'h-11', className)}
          {...props}
        />
      )}
    </Envolver>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  erro?: string;
  dica?: string;
};

export function Textarea({ label, erro, dica, className, ...props }: TextareaProps) {
  return (
    <Envolver label={label} erro={erro} dica={dica}>
      {({ id, descrito }) => (
        <textarea
          id={id}
          rows={3}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
          className={cn(classesCampo(erro), 'py-2.5 resize-y min-h-[80px]', className)}
          {...props}
        />
      )}
    </Envolver>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  erro?: string;
  dica?: string;
  opcoes: { valor: string; rotulo: string }[];
};

export function Select({ label, erro, dica, opcoes, className, ...props }: SelectProps) {
  return (
    <Envolver label={label} erro={erro} dica={dica}>
      {({ id, descrito }) => (
        <select
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
          className={cn(classesCampo(erro), 'h-11 pr-8', className)}
          {...props}
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )}
    </Envolver>
  );
}

type SegmentadoProps<T extends string> = {
  label: string;
  valor: T;
  onChange: (v: T) => void;
  opcoes: { valor: T; rotulo: string }[];
};

/** Escolha entre poucas opções, sem abrir um select. */
export function Segmentado<T extends string>({
  label,
  valor,
  onChange,
  opcoes,
}: SegmentadoProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-ink">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1.5 rounded-md border border-line bg-raised p-1"
      >
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.valor)}
              className={cn(
                'flex-1 rounded px-3 py-2 text-sm transition-colors duration-150',
                ativo
                  ? 'bg-surface text-ink shadow-soft font-medium'
                  : 'text-muted hover:text-ink',
              )}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SwitchProps = {
  label: string;
  descricao?: string;
  ativo: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export function Switch({ label, descricao, ativo, onChange, disabled }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 py-3',
        disabled && 'opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {descricao && <span className="mt-0.5 block text-xs text-muted">{descricao}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!ativo)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          ativo ? 'bg-ink' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-soft transition-transform duration-200 ease-mk',
            ativo ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}
