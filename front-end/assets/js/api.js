const API_BASE_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 10000;
const API_FIELD_LABELS = {
    nome: "Nome",
    estoque: "Estoque",
    img: "Imagem",
    quantidade: "Quantidade",
};

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
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );
    const headers = new Headers(options.headers ?? {});

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const response = await fetch(new URL(path, API_BASE_URL), {
            ...options,
            headers,
            signal: controller.signal,
        });
        const responseBody = response.status === 204
            ? null
            : await response.json().catch(() => null);

        if (!response.ok) {
            const detail = responseBody?.detail;
            const message = typeof detail === "string"
                ? detail
                : Array.isArray(detail)
                    ? formatValidationErrors(detail)
                    : "Não foi possível concluir a solicitação.";
            throw new Error(message);
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
