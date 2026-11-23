import { apiRequest } from "./api.js";

const DASHBOARD_URL = new URL("../../pages/dashboard.html", import.meta.url);
const MINIMUM_USER_ID = 1;

const form = document.querySelector("#login-form");
const userIdInput = document.querySelector("#usuario-id");
const passwordInput = document.querySelector("#senha");
const rememberInput = document.querySelector("#lembrar");
const submitButton = document.querySelector("#login-submit");
const feedback = document.querySelector("#login-feedback");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";

    const userId = Number(userIdInput.value);
    if (!Number.isSafeInteger(userId) || userId < MINIMUM_USER_ID) {
        feedback.textContent = "Informe um ID de usuário válido.";
        userIdInput.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    try {
        await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                id: userId,
                senha: passwordInput.value,
                lembrar: rememberInput.checked,
            }),
        });
        window.location.assign(DASHBOARD_URL.href);
    } catch (error) {
        feedback.textContent = error.message;
        passwordInput.value = "";
        passwordInput.focus();
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Entrar";
    }
});

apiRequest("/auth/me")
    .then(() => window.location.assign(DASHBOARD_URL.href))
    .catch(() => {});