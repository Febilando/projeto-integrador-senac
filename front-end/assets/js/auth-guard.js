import { apiRequest } from "./api.js";

const LOGIN_PAGE_URL = new URL("../../pages/login.html", import.meta.url);

let authenticatedUser = null;

function renderAuthenticatedUser() {
    if (!authenticatedUser) return;

    const userName = document.querySelector("[data-auth-user]");
    const avatar = document.querySelector("[data-auth-avatar]");
    const profileButton = document.querySelector(".perfil");

    if (userName) userName.textContent = authenticatedUser.nome;
    if (avatar) avatar.textContent = authenticatedUser.nome.trim().charAt(0).toLocaleUpperCase("pt-BR");
    if (profileButton) {
        profileButton.title = `Perfil ${authenticatedUser.funcao}`;
    }
}

async function logout() {
    const logoutButton = document.querySelector("[data-logout]");
    if (logoutButton) logoutButton.disabled = true;

    try {
        await apiRequest("/auth/logout", { method: "POST" });
    } finally {
        window.location.assign(LOGIN_PAGE_URL.href);
    }
}

document.addEventListener("app:header-loaded", renderAuthenticatedUser);
document.addEventListener("click", (event) => {
    if (event.target.closest("[data-logout]")) {
        void logout();
    }
});

try {
    const session = await apiRequest("/auth/me");
    authenticatedUser = session.usuario;
    renderAuthenticatedUser();
} catch {
    window.location.replace(LOGIN_PAGE_URL.href);
}