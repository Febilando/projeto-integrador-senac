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

    let resposta;
    try {
        resposta = await fetch(new URL("header.html", pastaHeader));
    } catch (erro) {
        console.error("Não foi possível carregar o cabeçalho.", erro);
        return;
    }

    if (!resposta.ok) {
        console.error("Não foi possível carregar o header.");
        return;
    }

    local.outerHTML = await resposta.text();

    const frontendRoot = new URL("../../", pastaHeader);
    const homeLink = document.querySelector("header .marca a");
    if (homeLink) homeLink.href = new URL("pages/dashboard.html", frontendRoot).href; // para redirecionar para a pagina inicial

    const lupa = document.querySelector("header form img");

    if (lupa) {
        lupa.src = new URL("../../assets/lupa.png", pastaHeader).href;
    }

    const paginaAtual = document.querySelector("#pagina-atual");

    if (paginaAtual) {
        paginaAtual.textContent = document.title;
    }

    document.dispatchEvent(new CustomEvent("app:header-loaded"));
}

carregarCabecalho();
