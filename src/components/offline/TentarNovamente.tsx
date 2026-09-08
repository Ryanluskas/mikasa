'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * O botão de recarregar da tela offline.
 *
 * Ele escuta o evento `online` e recarrega sozinho quando a conexão volta:
 * a pessoa que guardou o celular no bolso no meio do túnel encontra o app
 * pronto ao tirar, sem precisar tocar em nada.
 */
export function TentarNovamente() {
  const [voltou, setVoltou] = useState(false);

  useEffect(() => {
    function aoVoltar() {
      setVoltou(true);
      // Um instante para a rede assentar antes de tentar o servidor de novo.
      setTimeout(() => window.location.reload(), 600);
    }

    window.addEventListener('online', aoVoltar);
    return () => window.removeEventListener('online', aoVoltar);
  }, []);

  return (
    <div className="mt-7">
      <Button onClick={() => window.location.reload()} larguraTotal tamanho="lg">
        {voltou ? 'Conexão de volta. Carregando…' : 'Tentar de novo'}
      </Button>
    </div>
  );
}
