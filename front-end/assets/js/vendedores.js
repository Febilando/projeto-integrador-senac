import { apiRequest } from "./api.js";

const ROLE_LABELS = {
    admin: "Administrador",
    vendedor: "Vendedor",
};

const elements = {
    addButton: document.getElementById("new-user"),
    refreshButton: document.getElementById("users-refresh"),
    subtitle: document.getElementById("users-subtitle"),
    count: document.getElementById("users-count"),
    feedback: document.getElementById("users-feedback"),
    search: document.getElementById("users-search"),
    sortButtons: [...document.querySelectorAll("[data-sort]")],
    rows: document.getElementById("users-rows"),
    dialog: document.getElementById("user-dialog"),
    form: document.getElementById("user-form"),
    dialogTitle: document.getElementById("user-dialog-title"),
    formFeedback: document.getElementById("user-form-feedback"),
    name: document.getElementById("user-name"),
    password: document.getElementById("user-password"),
    passwordHint: document.getElementById("user-password-hint"),
    passwordRequiredNote: document.getElementById("password-required-note"),
    role: document.getElementById("user-role"),
    roleHint: document.getElementById("user-role-hint"),
    saveButton: document.getElementById("save-user"),
};

let users = [];
let roles = [];
let currentUserId = null;
let selectedUser = null;
let sortField = "nome";
let sortDirection = "asc";

function formatRole(roleName) {
    const normalized = String(roleName || "").trim().toLocaleLowerCase("pt-BR");
    return ROLE_LABELS[normalized] || roleName || "Função não informada";
}

function setFeedback(message, type = "info") {
    elements.feedback.textContent = message;
    elements.feedback.className = `users-feedback users-feedback--${type}`;
}

function showTableMessage(message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "table-message";
    cell.textContent = message;
    row.append(cell);
    elements.rows.replaceChildren(row);
}

function createUserRow(user) {
    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    idCell.className = "table-id";
    idCell.textContent = String(user.id);

    const nameCell = document.createElement("td");
    nameCell.className = "table-name";
    nameCell.textContent = user.nome;

    const roleCell = document.createElement("td");
    roleCell.textContent = formatRole(user.funcaoNome);

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    const isActive = String(user.status).toLocaleLowerCase("pt-BR") === "ativo";
    status.className = `user-status ${isActive ? "user-status--active" : "user-status--inactive"}`;
    status.textContent = isActive ? "Ativo" : "Inativo";
    statusCell.append(status);

    const actionsCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "user-edit-button";
    editButton.dataset.editUser = String(user.id);
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar usuário ${user.nome}`);
    actionsCell.append(editButton);

    row.append(idCell, nameCell, roleCell, statusCell, actionsCell);
    return row;
}

function getVisibleUsers() {
    const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    const direction = sortDirection === "asc" ? 1 : -1;

    return users
        .filter((user) => {
            return String(user.id).includes(query)
                || user.nome.toLocaleLowerCase("pt-BR").includes(query)
                || formatRole(user.funcaoNome).toLocaleLowerCase("pt-BR").includes(query)
                || String(user.status).toLocaleLowerCase("pt-BR").includes(query);
        })
        .sort((first, second) => {
            const result = sortField === "id"
                ? Number(first.id) - Number(second.id)
                : first.nome.localeCompare(second.nome, "pt-BR");
            return result * direction;
        });
}

function renderUsers() {
    const visibleUsers = getVisibleUsers();
    elements.count.textContent = `${visibleUsers.length} ${visibleUsers.length === 1 ? "usuário" : "usuários"}`;

    if (!visibleUsers.length) {
        showTableMessage(users.length ? "Nenhum usuário corresponde à pesquisa." : "Nenhum usuário cadastrado.");
        return;
    }

    elements.rows.replaceChildren(...visibleUsers.map(createUserRow));
}

function updateSortButtons() {
    elements.sortButtons.forEach((button) => {
        const active = button.dataset.sort === sortField;
        button.setAttribute("aria-pressed", String(active));
        if (active) {
            button.textContent = `${button.dataset.label} ${sortDirection === "asc" ? "↑" : "↓"}`;
        }
    });
}

function populateRoles(selectedRoleId = null) {
    elements.role.replaceChildren();
    roles.forEach((role) => {
        const option = document.createElement("option");
        option.value = String(role.id);
        option.textContent = formatRole(role.nome);
        elements.role.append(option);
    });

    if (selectedRoleId !== null) {
        elements.role.value = String(selectedRoleId);
    } else {
        const sellerRole = roles.find(
            (role) => String(role.nome).toLocaleLowerCase("pt-BR") === "vendedor",
        );
        if (sellerRole) elements.role.value = String(sellerRole.id);
    }
}

function openUserDialog(user = null) {
    selectedUser = user;
    elements.form.reset();
    elements.formFeedback.textContent = "";
    elements.dialogTitle.textContent = user ? "Editar usuário" : "Novo usuário";
    elements.saveButton.textContent = user ? "Salvar alterações" : "Cadastrar usuário";
    elements.password.required = !user;
    elements.passwordRequiredNote.hidden = Boolean(user);
    elements.passwordHint.textContent = user
        ? "Deixe a senha em branco para manter a senha atual."
        : "A senha deve ter entre 8 e 128 caracteres.";
    elements.name.value = user?.nome || "";
    populateRoles(user?.funcao);
    const editingOwnUser = user && Number(user.id) === currentUserId;
    elements.role.disabled = Boolean(editingOwnUser);
    elements.roleHint.hidden = !editingOwnUser;

    elements.dialog.showModal();
    elements.name.focus();
}

function setFormBusy(isBusy) {
    elements.saveButton.disabled = isBusy;
    elements.name.disabled = isBusy;
    elements.password.disabled = isBusy;
    elements.role.disabled = isBusy || Boolean(
        selectedUser && Number(selectedUser.id) === currentUserId,
    );
}

async function loadUsers(successMessage = "") {
    elements.rows.setAttribute("aria-busy", "true");
    elements.refreshButton.disabled = true;
    elements.addButton.disabled = true;
    elements.subtitle.textContent = "Carregando usuários e funções...";
    setFeedback("");
    showTableMessage("Carregando usuários...");

    try {
        const [loadedUsers, loadedRoles, session] = await Promise.all([
            apiRequest("/usuarios"),
            apiRequest("/usuarios/funcoes"),
            apiRequest("/auth/me"),
        ]);
        users = loadedUsers;
        currentUserId = Number(session.usuario.id);
        roles = loadedRoles.filter((role) => (
            ["admin", "vendedor"].includes(String(role.nome).toLocaleLowerCase("pt-BR"))
        ));

        if (!roles.some((role) => String(role.nome).toLocaleLowerCase("pt-BR") === "admin")
            || !roles.some((role) => String(role.nome).toLocaleLowerCase("pt-BR") === "vendedor")) {
            throw new Error("A API não retornou as funções admin e vendedor.");
        }

        elements.addButton.disabled = false;
        elements.subtitle.textContent = "Usuários carregados do banco de dados.";
        setFeedback(successMessage, "success");
        renderUsers();
    } catch (error) {
        users = [];
        elements.count.textContent = "";
        elements.subtitle.textContent = "Não foi possível carregar os usuários.";
        showTableMessage(error.message);
        setFeedback(error.message, "error");
        if (error.status === 403) {
            elements.addButton.hidden = true;
            elements.subtitle.textContent = "Acesso restrito a administradores.";
        }
    } finally {
        elements.rows.setAttribute("aria-busy", "false");
        elements.refreshButton.disabled = false;
    }
}

elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.formFeedback.textContent = "";

    if (!elements.form.reportValidity()) return;

    const password = elements.password.value;
    const editingOwnUser = selectedUser
        && Number(selectedUser.id) === currentUserId;
    const payload = {
        nome: elements.name.value.trim(),
        senha: password || null,
        funcao: editingOwnUser ? Number(selectedUser.funcao) : Number(elements.role.value),
        status: selectedUser?.status || "ativo",
    };

    if (!payload.nome) {
        elements.formFeedback.textContent = "Informe o nome do usuário.";
        elements.name.focus();
        return;
    }

    const isEditing = selectedUser !== null;
    if (!isEditing && !payload.senha) {
        elements.formFeedback.textContent = "Informe uma senha para o novo usuário.";
        elements.password.focus();
        return;
    }

    const endpoint = isEditing ? `/usuarios/${selectedUser.id}` : "/usuarios";
    const method = isEditing ? "PUT" : "POST";
    setFormBusy(true);
    elements.formFeedback.textContent = isEditing ? "Salvando alterações..." : "Cadastrando usuário...";

    try {
        await apiRequest(endpoint, {
            method,
            body: JSON.stringify(payload),
        });
        elements.dialog.close();
        await loadUsers(isEditing ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
    } catch (error) {
        elements.formFeedback.textContent = error.message;
    } finally {
        setFormBusy(false);
    }
});

elements.rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-user]");
    if (!button) return;
    const user = users.find((item) => String(item.id) === button.dataset.editUser);
    if (user) openUserDialog(user);
});

elements.addButton.addEventListener("click", () => openUserDialog());
elements.refreshButton.addEventListener("click", () => loadUsers());
elements.search.addEventListener("input", renderUsers);

elements.sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (sortField === button.dataset.sort) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortField = button.dataset.sort;
            sortDirection = "asc";
        }
        updateSortButtons();
        renderUsers();
    });
});

document.querySelectorAll("[data-close-user-dialog]").forEach((button) => {
    button.addEventListener("click", () => elements.dialog.close());
});

updateSortButtons();
loadUsers();
