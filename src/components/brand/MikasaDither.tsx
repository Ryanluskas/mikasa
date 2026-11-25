'use client';

import { useEffect, useRef, useState } from 'react';
import { amostrar, pintar, PADRAO, type Grade, type Params } from '@/lib/ascii/engine';
import { cn } from '@/lib/cn';

/**
 * A marca do Mikasa em dither animado.
 *
 * Quatro comportamentos que não são opcionais aqui, e o motivo de cada um:
 *
 *  - `prefers-reduced-motion` desliga o shimmer e desenha um quadro estático.
 *    Uma textura que cintila a tela inteira é exatamente o tipo de movimento
 *    que causa desconforto em quem pede menos movimento.
 *  - Fora da viewport, o laço para. Um `requestAnimationFrame` rodando numa
 *    hero que já saiu da tela é bateria queimada à toa.
 *  - A altura é reservada por `aspect-ratio` antes da imagem carregar, então
 *    o texto abaixo nunca pula (CLS).
 *  - A cor vem dos tokens do tema, lida do CSS — o mesmo componente funciona
 *    em claro e escuro sem uma segunda paleta.
 */

type Props = {
  /** Imagem de origem, servida do mesmo domínio. */
  src?: string;
  /** Descrição para quem não enxerga o canvas. */
  alt: string;
  className?: string;
  params?: Partial<Params>;
};

export function MikasaDither({
  src = '/brand/mikasa.png',
  alt,
  className,
  params: override,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const params: Params = { ...PADRAO, ...override };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let grade: Grade | null = null;
    // Valor provisório: `medir()` calcula o real a partir da largura.
    let cell = 5;
    let frame = 0;
    let vivo = true;
    let visivel = true;
    let imagem: HTMLImageElement | null = null;
    const inicio = performance.now();

    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animar = () => params.animated && !menosMovimento.matches;

    /** Lê a cor da tinta dos tokens do tema, sem hardcode de hexadecimal. */
    function corDaTinta(): string {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--mk-ink')
        .trim();
      return raw ? `rgb(${raw})` : '#252525';
    }

    function medir() {
      if (!imagem || !canvas || !wrap) return;

      const largura = wrap.clientWidth;
      if (largura < 8) return;

      const proporcao = imagem.naturalHeight / imagem.naturalWidth;
      const altura = Math.round(largura * proporcao);

      // A grade é calculada em px CSS; o devicePixelRatio entra só na nitidez.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // O tamanho da célula é derivado da largura, e não fixo: é isso que faz
      // o rosto continuar legível tanto num hero de 500px quanto num celular
      // de 340px. O piso de 3px evita células sub-pixel em telas estreitas.
      cell = Math.max(3, Math.round(largura / params.colunasAlvo));

      const colunas = Math.max(1, Math.floor(largura / cell));
      const linhas = Math.max(1, Math.floor(altura / cell));

      canvas.width = Math.round(colunas * cell * dpr);
      canvas.height = Math.round(linhas * cell * dpr);
      canvas.style.width = `${colunas * cell}px`;
      canvas.style.height = `${linhas * cell}px`;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      grade = amostrar(
        imagem,
        imagem.naturalWidth,
        imagem.naturalHeight,
        colunas,
        linhas,
        params,
      );
    }

    function desenhar(agora: number) {
      if (!vivo) return;

      if (grade && visivel) {
        pintar({
          ctx: ctx!,
          grade,
          cell,
          tempo: (agora - inicio) / 1000,
          cor: corDaTinta(),
          params,
        });
      }

      // Estático: desenha uma vez e encerra o laço de vez.
      if (!animar()) return;

      frame = requestAnimationFrame(desenhar);
    }

    imagem = new Image();
    imagem.decoding = 'async';
    imagem.src = src;

    imagem.onload = () => {
      if (!vivo) return;
      medir();
      setPronto(true);
      // O primeiro quadro é pintado de forma síncrona, e não via
      // requestAnimationFrame: em aba de segundo plano o rAF simplesmente não
      // roda, e o canvas ficaria vazio até a pessoa voltar para a aba.
      // `desenhar` agenda o próximo quadro sozinho quando há animação.
      desenhar(performance.now());
    };

    imagem.onerror = () => {
      // A arte não carregou. O `alt` no wrapper continua descrevendo a marca,
      // então a página segue compreensível — só não tem o efeito.
      if (vivo) setPronto(true);
    };

    // Redimensionar re-amostra: a grade depende da largura disponível.
    const ro = new ResizeObserver(() => {
      medir();
      if (!animar()) requestAnimationFrame(desenhar);
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        if (visivel && animar() && !frame) frame = requestAnimationFrame(desenhar);
      },
      { rootMargin: '120px' },
    );
    io.observe(wrap);

    const aoMudarMovimento = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      frame = requestAnimationFrame(desenhar);
    };
    menosMovimento.addEventListener('change', aoMudarMovimento);

    return () => {
      vivo = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      menosMovimento.removeEventListener('change', aoMudarMovimento);
      if (imagem) {
        imagem.onload = null;
        imagem.onerror = null;
      }
    };
  }, [src, override]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={alt}
      className={cn('relative w-full', className)}
      // Reserva a altura antes da imagem carregar. Sem isto o conteúdo
      // abaixo pula quando o canvas ganha tamanho.
      style={{ aspectRatio: '1 / 1' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          'block transition-opacity duration-700 ease-mk',
          pronto ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
