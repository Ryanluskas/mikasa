import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-5 py-6">
        <Link href="/" aria-label="Mikasa, página inicial">
          <Logo />
        </Link>
      </header>

      <main
        id="conteudo"
        className="flex flex-1 items-center justify-center px-5 pb-16"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
