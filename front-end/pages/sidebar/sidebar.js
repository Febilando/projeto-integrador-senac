import { apiRequest } from "../../assets/js/api.js";

const SIDEBAR_FRAGMENT_URL = new URL("sidebar.html", import.meta.url);
const FRONTEND_ROOT = new URL("../../", import.meta.url);
const PAGE_PATHS = {
    dashboard: "pages/dashboard.html",
    pedidos: "pages/pedidos.html",
    "novo-pedido": "pages/caixa.html",
    produtos: "pages/produtos.html",
    estatisticas: "pages/estatisticas.html",
    vendedores: "pages/vendedores.html",
    perfil: "pages/perfil.html",
    configuracoes: "pages/configuracoes.html",
};

async function loadSidebar() {
    const sidebar = document.querySelector("#app-sidebar");
    if (!sidebar) return;

    try {
        const [response, session] = await Promise.all([
            fetch(SIDEBAR_FRAGMENT_URL),
            apiRequest("/auth/me"),
        ]);
        if (!response.ok) {
            throw new Error("Não foi possível carregar a navegação lateral.");
        }

        sidebar.innerHTML = await response.text();
        const currentPath = window.location.pathname;
        const isAdmin = session.usuario.funcao
            .trim()
            .toLocaleLowerCase("pt-BR") === "admin";

        for (const link of sidebar.querySelectorAll("[data-page-link]")) {
            const pageKey = link.dataset.pageLink;
            const pagePath = PAGE_PATHS[pageKey];
            if (!pagePath) continue;

            const destination = new URL(pagePath, FRONTEND_ROOT);
            link.href = destination.href;
            link.setAttribute("aria-label", link.textContent.trim());
            if (pageKey === "dashboard" && !isAdmin) {
                link.hidden = true;
            }

            if (destination.pathname === currentPath) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        }

        document.dispatchEvent(new CustomEvent("app:sidebar-loaded"));
    } catch (error) {
        sidebar.textContent = "A navegação não pôde ser carregada.";
        console.error(error);
    }
}

loadSidebar();
