/*
  Aplica o tema do Mikasa antes da primeira pintura.

  Este arquivo é servido como estático de propósito, em vez de ficar inline no
  HTML. São três motivos, todos concretos:

   1. A Content-Security-Policy do app não permite script inline. Um inline
      exigiria nonce por requisição, o que tornaria TODA página dinâmica —
      inclusive a landing page, que não precisa disso.
   2. `nonce` gera aviso de hidratação no React, porque o navegador remove o
      atributo depois de usá-lo e o cliente passa a ver uma string vazia.
   3. Aqui ele é cacheado pelo navegador e roda antes do CSS pintar, que é
      exatamente o que evita o flash branco de quem usa tema escuro.

  Precisa continuar minúsculo e síncrono. Nada de fetch, nada de dependência.
*/
(function () {
  try {
    var escolhido = localStorage.getItem('mikasa-tema') || 'system';
    var escuro =
      escolhido === 'dark' ||
      (escolhido === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
  } catch (e) {
    // Navegador com armazenamento bloqueado: fica no tema claro, e o app
    // funciona igual. Nunca deixamos isto derrubar o carregamento.
    document.documentElement.dataset.theme = 'light';
  }
})();
