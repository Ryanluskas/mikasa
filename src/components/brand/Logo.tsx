import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * A marca do Mikasa.
 *
 * A arte é um arquivo só (`public/brand/mikasa.png`), gerado pelos scripts em
 * `scripts/`. Trocar a ilustração é trocar esse arquivo e rodar
 * `node scripts/gerar-icones.mjs` — nenhum componente precisa mudar.
 */

export function Marca({
  tamanho = 32,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/mikasa.png"
      alt=""
      width={tamanho}
      height={tamanho}
      priority
      className={cn('rounded-full object-cover', className)}
      style={{ width: tamanho, height: tamanho }}
    />
  );
}

export function Logo({
  tamanho = 28,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Marca tamanho={tamanho} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        Mikasa
      </span>
    </span>
  );
}
