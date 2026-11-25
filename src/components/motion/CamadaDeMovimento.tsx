'use client';

import dynamic from 'next/dynamic';

/**
 * Carrega a camada de movimento fora do pacote inicial.
 *
 * O GSAP com ScrollTrigger custa ~45 kB. Colocá-lo no bundle da landing subia
 * o First Load JS de 117 kB para 162 kB — 38% a mais de JavaScript na página
 * que existe para converter quem chega, e cujo primeiro paint precisa ser o
 * mais rápido possível.
 *
 * Como nada aqui anima no carregamento (só no scroll), esse código não precisa
 * existir antes do primeiro paint: ele é buscado depois da hidratação, num
 * chunk separado. Quem lê a hero não paga por ele, e quando a primeira rolagem
 * acontece a camada já está de pé.
 *
 * `ssr: false` porque não há nada para renderizar no servidor — o único
 * elemento que vem daqui é o fio de progresso, decorativo e `aria-hidden`.
 */
const AnimacoesDeScroll = dynamic(
  () => import('./AnimacoesDeScroll').then((m) => m.AnimacoesDeScroll),
  { ssr: false },
);

export function CamadaDeMovimento() {
  return <AnimacoesDeScroll />;
}
