const API_HOST = window.location.hostname === "localhost"
    ? "localhost"
    : "127.0.0.1";
const API_BASE_URL = `http://${API_HOST}:8000`;
const REQUEST_TIMEOUT_MS = 10000;
const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOGIN_PAGE_URL = new URL("../../pages/login.html", import.meta.url);
const API_FIELD_LABELS = {
    nome: "Nome",
    estoque: "Estoque",
    img: "Imagem",
    quantidade: "Quantidade",
    senha: "Senha",
    id: "ID",
};
let csrfToken = null;

function formatValidationErrors(errors) {
    return errors.map((issue) => {
        const fieldName = issue.loc?.at(-1);
        const fieldLabel = API_FIELD_LABELS[fieldName] || "Campo";

        if (issue.type === "string_too_short") {
            return `${fieldLabel} deve ter pelo menos ${issue.ctx.min_length} caractere(s).`;
        }
        if (issue.type === "string_too_long") {
            return `${fieldLabel} deve ter no máximo ${issue.ctx.max_length} caractere(s).`;
        }
        if (issue.type === "greater_than_equal") {
            return `${fieldLabel} deve ser maior ou igual a ${issue.ctx.ge}.`;
        }
        if (issue.type === "less_than_equal") {
            return `${fieldLabel} deve ser menor ou igual a ${issue.ctx.le}.`;
        }
        if (issue.type === "missing") {
            return `Informe ${fieldLabel.toLocaleLowerCase("pt-BR").replace(/^./, (letter) => letter.toUpperCase())}.`;
        }
        return `${fieldLabel}: valor inválido.`;
    }).join(" ");
}

export async function apiRequest(path, options = {}) {
    const method = (options.method ?? "GET").toUpperCase();
    if (!SAFE_HTTP_METHODS.has(method) && path !== "/auth/login" && !csrfToken) {
        await apiRequest("/auth/me");
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );
    const headers = new Headers(options.headers ?? {});

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!SAFE_HTTP_METHODS.has(method) && csrfToken) {
        headers.set("X-CSRF-Token", csrfToken);
    }

    try {
        const response = await fetch(new URL(path, API_BASE_URL), {
            ...options,
            method,
            headers,
            credentials: "include",
            signal: controller.signal,
        });
        const responseBody = response.status === 204
            ? null
            : await response.json().catch(() => null);

        if (!response.ok) {
            if (
                response.status === 401
                && path !== "/auth/login"
                && path !== "/auth/me"
            ) {
                window.location.assign(LOGIN_PAGE_URL.href);
            }
            const detail = responseBody?.detail;
            const message = typeof detail === "string"
                ? detail
                : Array.isArray(detail)
                    ? formatValidationErrors(detail)
                    : "Não foi possível concluir a solicitação.";
            const requestError = new Error(message);
            requestError.status = response.status;
            throw requestError;
        }

        if (typeof responseBody?.csrf_token === "string") {
            csrfToken = responseBody.csrf_token;
        }

        return responseBody;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("A API demorou para responder. Tente novamente.");
        }

        if (error instanceof TypeError) {
            throw new Error(
                "Não foi possível conectar à API. Verifique se o backend está em execução.",
            );
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}
