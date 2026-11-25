'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * A camada de movimento da landing.
 *
 * É uma ilha cliente única: a página em si continua sendo Server Component e
 * continua pré-renderizada no build. Nada aqui muda o HTML que o Next gera —
 * o componente só procura marcações no DOM e pendura ScrollTriggers nelas.
 *
 * Marcações que ele entende, em qualquer página onde for montado:
 *
 *   data-revelar        um elemento que sobe e aparece ao entrar na tela
 *   data-revelar-lote   um container cujos filhos diretos aparecem em cascata
 *   data-parallax="n"   desloca em contraponto ao scroll (n = intensidade)
 *
 * Três decisões que não são estéticas e por isso não são negociáveis:
 *
 *  - **Nada anima no carregamento, só no scroll.** A tentação era abrir a hero
 *    com um fade. Mas esta página é estática: o HTML pinta antes do React
 *    hidratar, então esconder a hero por JS produz um piscada — conteúdo
 *    visível, some, volta. Animar só o que está fora da tela elimina isso.
 *
 *  - **Tudo usa `gsap.from()`, nunca `gsap.set()` + `to()`.** O estado final é
 *    o estado do HTML. Se o JS falhar, for bloqueado ou o GSAP não carregar, a
 *    página aparece inteira e legível — em vez de ficar em branco com o texto
 *    preso em `opacity: 0`. Numa página que é a porta de entrada do produto,
 *    esse é o único modo de falha aceitável.
 *
 *  - **`prefers-reduced-motion` desliga tudo, inclusive o parallax.** O CSS
 *    global já mata animação e transição, mas não alcança tween de JS: o GSAP
 *    escreve transform inline e passaria por cima. Por isso o `matchMedia()`
 *    aqui, que ainda reverte sozinho se a pessoa mudar a preferência com a
 *    página aberta.
 */
export function AnimacoesDeScroll() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // A preferência do perfil (definida no layout do app) vale tanto quanto
      // a do sistema. Na landing ela normalmente não existe, mas se um dia
      // este componente for montado dentro do app, ele já respeita.
      if (document.querySelector('[data-motion="reduzido"]')) return;

      /* ── Revelações individuais ──────────────────────────────────────── */

      gsap.utils.toArray<HTMLElement>('[data-revelar]').forEach((el) => {
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      /* ── Revelações em cascata ───────────────────────────────────────── */

      gsap.utils.toArray<HTMLElement>('[data-revelar-lote]').forEach((lote) => {
        const itens = gsap.utils.toArray<HTMLElement>(lote.children);
        if (!itens.length) return;

        // Um ScrollTrigger no container, não um por filho. `ScrollTrigger.batch()`
        // existe justamente para listas, mas ele exige esconder os itens antes
        // (`gsap.set`) — o que reintroduz o modo de falha que evitamos acima.
        // Com conteúdo fixo e curto como o desta página, o stagger num único
        // `from()` dá o mesmo resultado visual e continua degradando bem.
        gsap.from(itens, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.07,
          scrollTrigger: { trigger: lote, start: 'top 85%', once: true },
        });
      });

      /* ── Parallax ────────────────────────────────────────────────────── */

      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const intensidade = Number(el.dataset.parallax) || 1;

        // `clamp()` trava os pontos dentro dos limites da página. Sem ele, um
        // elemento que já nasce visível (a arte da hero) entraria com o scrub
        // parcialmente avançado e daria um salto no primeiro pixel de scroll.
        gsap.to(el, {
          yPercent: -7 * intensidade,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'clamp(top bottom)',
            end: 'clamp(bottom top)',
            scrub: 0.6,
          },
        });
      });

      /* ── Fio de progresso da leitura ─────────────────────────────────── */

      gsap.to('[data-progresso]', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3,
        },
      });
    });

    // As fontes carregam depois do primeiro paint e mudam a altura do texto,
    // o que desloca todos os pontos de start/end calculados até aqui.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => mm.revert();
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-transparent"
    >
      <div data-progresso className="h-full origin-left scale-x-0 bg-accent" />
    </div>
  );
}
