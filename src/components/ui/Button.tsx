'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';
type Tamanho = 'sm' | 'md' | 'lg';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-ink text-bg hover:bg-ink/90 active:bg-ink/80',
  secundario: 'bg-surface text-ink border border-line hover:bg-raised active:bg-line/40',
  fantasma: 'text-muted hover:bg-raised hover:text-ink active:bg-line/40',
  perigo: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
};

const TAMANHOS: Record<Tamanho, string> = {
  // Nenhum tamanho fica abaixo de 40px de altura: o app é usado com o polegar.
  sm: 'h-10 px-3 text-sm rounded',
  md: 'h-11 px-4 text-sm rounded-md',
  lg: 'h-12 px-5 text-base rounded-md',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  larguraTotal?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variante = 'primario',
    tamanho = 'md',
    carregando = false,
    larguraTotal = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // Um botão em carregamento continua desabilitado de fato, e não só
      // visualmente — senão um duplo clique cria duas tarefas.
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-150 ease-mk',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraTotal && 'w-full',
        className,
      )}
      {...props}
    >
      {carregando && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
