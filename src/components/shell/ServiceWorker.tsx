'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker.
 *
 * Só em produção, e de propósito: em desenvolvimento um worker guardando os
 * estáticos do Next briga com o hot reload e faz o navegador servir código
 * antigo — o tipo de bug que custa uma hora até alguém desconfiar do cache.
 *
 * O registro espera o `load` para não competir por banda com o primeiro
 * carregamento da página, que é justamente o que precisa ser rápido.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    function registrar() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((erro) => {
        // Falhar aqui não pode derrubar o app: sem worker, o Mikasa continua
        // funcionando normalmente — só perde a tela offline.
        console.warn('[mikasa] service worker não registrou', erro);
      });
    }

    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });

    return () => window.removeEventListener('load', registrar);
  }, []);

  return null;
}

/**
 * Zera o cache do service worker.
 *
 * Chamada no logout e na exclusão de conta. O worker já não guarda nada
 * pessoal, mas num aparelho compartilhado "não guarda" e "não sobrou nada"
 * precisam ser a mesma coisa — e essa garantia custa uma linha.
 */
export async function limparCacheLocal(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage({ tipo: 'limpar-tudo' });

    if ('caches' in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
    }
  } catch {
    // Navegador sem CacheStorage ou com armazenamento bloqueado. O logout no
    // servidor já aconteceu; isto é só a faxina local.
  }
}
