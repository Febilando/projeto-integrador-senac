// Script para carregar o conteúdo do header.html em todas as páginas.

async function carregarCabecalho() {
    const scriptAtual = document.currentScript;
    const pastaHeader = new URL("./", scriptAtual.src);
    const local = document.querySelector("header");

    if (!local) return;

    const estiloExistente = document.querySelector('link[data-header-css]');

    if (!estiloExistente) {
        const estilo = document.createElement("link");
        estilo.rel = "stylesheet";
        estilo.href = new URL("header.css", pastaHeader).href;
        estilo.dataset.headerCss = "true";
        document.head.appendChild(estilo);
    }

    const resposta = await fetch(new URL("header.html", pastaHeader));

    if (!resposta.ok) {
        console.error("Não foi possível carregar o header.");
        return;
    }

    local.outerHTML = await resposta.text();

    const lupa = document.querySelector("header form img");

    if (lupa) {
        lupa.src = new URL("../../assets/lupa.png", pastaHeader).href;
    }

    const paginaAtual = document.querySelector("#pagina-atual");

    if (paginaAtual) {
        paginaAtual.textContent = document.title;
    }
}

carregarCabecalho();
