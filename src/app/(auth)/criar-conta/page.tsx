import Link from 'next/link';
import { FormularioCriarConta } from '@/components/auth/FormularioCriarConta';

export const metadata = { title: 'Criar conta' };

export default function CriarConta() {
  return (
    <div>
      <h1 className="text-display font-semibold text-ink">Vamos começar.</h1>
      <p className="mt-1.5 text-sm text-muted">
        Leva menos de um minuto. Você escolhe o que quer organizar depois.
      </p>

      <div className="mt-8">
        <FormularioCriarConta />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
