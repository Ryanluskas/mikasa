'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { api, ErroApi } from '@/lib/http';

export function FormularioCriarConta() {
  const router = useRouter();

  const [nome, setNome] = useState('');
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
      const r = await api<{ proximo: string }>('/api/auth/register', {
        metodo: 'POST',
        corpo: { name: nome, email, password: senha },
      });
      router.push(r.proximo);
      router.refresh();
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.fields ? '' : e.message);
        setCampos(e.fields ?? {});
      } else {
        setErro('Não conseguimos criar sua conta agora. Tente novamente.');
      }
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Input
        label="Como podemos chamar você?"
        autoComplete="given-name"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={campos.name}
        required
        autoFocus
      />

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={campos.email}
        required
      />

      <Input
        label="Senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={campos.password}
        dica="Pelo menos 10 caracteres. Uma frase que só você lembra funciona bem."
        required
      />

      {erro && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {erro}
        </p>
      )}

      <Button type="submit" carregando={enviando} larguraTotal tamanho="lg">
        Criar conta
      </Button>

      <p className="text-center text-xs leading-relaxed text-faint">
        Seus dados ficam na sua conta. Você pode exportar tudo ou apagar
        completamente quando quiser.
      </p>
    </form>
  );
}
