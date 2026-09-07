'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { VOZ } from '@/lib/voice';

/**
 * As mensagens curtas do Mikasa.
 *
 * Uma por vez, discreta, e sempre em `aria-live="polite"` — o leitor de tela
 * anuncia sem interromper o que a pessoa estiver fazendo.
 */

type Aviso = { id: number; texto: string; tom: 'neutro' | 'erro' };

const Ctx = createContext<{
  avisar: (texto: string, tom?: 'neutro' | 'erro') => void;
}>({ avisar: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tom: 'neutro' | 'erro' = 'neutro') => {
    const id = Date.now() + Math.random();
    setAvisos((atual) => [...atual.slice(-2), { id, texto, tom }]);
    setTimeout(() => {
      setAvisos((atual) => atual.filter((a) => a.id !== id));
    }, 3200);
  }, []);

  return (
    <Ctx.Provider value={{ avisar }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className={cn(
              'animate-fade-up rounded-full border px-4 py-2 text-sm shadow-lift',
              a.tom === 'erro'
                ? 'border-danger/30 bg-danger text-white'
                : 'border-line bg-ink text-bg',
            )}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

/**
 * Aviso de conexão.
 *
 * O prompt pedia que o app não pareça quebrado quando a internet cai. O texto
 * some sozinho quando a conexão volta, e não obriga a recarregar nada.
 */
export function AvisoDeConexao() {
  const [offline, setOffline] = useState(false);
  const [voltou, setVoltou] = useState(false);

  useEffect(() => {
    // `navigator.onLine` só existe no cliente.
    setOffline(!navigator.onLine);

    function caiu() {
      setOffline(true);
      setVoltou(false);
    }
    function subiu() {
      setOffline(false);
      setVoltou(true);
      setTimeout(() => setVoltou(false), 2500);
    }

    window.addEventListener('offline', caiu);
    window.addEventListener('online', subiu);
    return () => {
      window.removeEventListener('offline', caiu);
      window.removeEventListener('online', subiu);
    };
  }, []);

  if (!offline && !voltou) return null;

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-x-0 top-0 z-[70] px-4 py-2 text-center text-sm',
        offline ? 'bg-warning/15 text-ink' : 'bg-success/15 text-ink',
      )}
    >
      {offline ? VOZ.erro.rede : VOZ.erro.redeVoltou}
    </div>
  );
}
