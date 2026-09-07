import Link from 'next/link';
import { Suspense } from 'react';
import { FormularioEntrar } from '@/components/auth/FormularioEntrar';

export const metadata = { title: 'Entrar' };

export default function Entrar() {
  return (
    <div>
      <h1 className="text-display font-semibold text-ink">Bom te ver.</h1>
      <p className="mt-1.5 text-sm text-muted">Entre para continuar de onde parou.</p>

      <div className="mt-8">
        <Suspense fallback={<div className="h-64" />}>
          <FormularioEntrar />
        </Suspense>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link
          href="/criar-conta"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
