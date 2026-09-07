'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { api, ErroApi } from '@/lib/http';

export function FormularioEntrar() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCampos({});
    setEnviando(true);

    try {
      const r = await api<{ proximo: string }>('/api/auth/login', {
        metodo: 'POST',
        corpo: { email, password: senha },
      });

      // Só aceitamos destinos internos. Um `?proximo=https://site-falso`
      // transformaria o login numa ponte para phishing.
      const pedido = params.get('proximo');
      const destino =
        pedido && pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : r.proximo;

      router.push(destino);
      router.refresh();
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.fields ?? {});
      } else {
        setErro('Não conseguimos entrar agora. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={campos.email}
        required
        autoFocus
      />

      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={campos.password}
        required
      />

      {erro && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {erro}
        </p>
      )}

      <Button type="submit" carregando={enviando} larguraTotal tamanho="lg">
        Entrar
      </Button>
    </form>
  );
}
