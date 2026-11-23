import { apiRequest } from "./api.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
});

const state = {
    orders: [],
    search: "",
    payment: "",
    sortBy: "recent",
    idDirection: "desc",
    selectedOrderId: null,
};

const paymentIcons = {
    "Pix": "../assets/pix.png",
    "Cartão de crédito": "../assets/cartao-de-credito.png",
    "Cartão de débito": "../assets/cartao-de-debito .png",
    "Dinheiro": "../assets/dinheiro.png",
};

const elements = {
    newOrderButton: document.getElementById("new-order-button"),
    refreshButton: document.getElementById("refresh-orders-button"),
    feedback: document.getElementById("orders-feedback"),
    subtitle: document.getElementById("orders-subtitle"),
    count: document.getElementById("orders-count"),
    search: document.getElementById("orders-search"),
    paymentFilter: document.getElementById("orders-payment-filter"),
    sortButtons: Array.from(document.querySelectorAll(".table-sort-controls button[data-sort]")),
    tableBody: document.getElementById("orders-table-body"),
    summaryOrders: document.getElementById("summary-total-orders"),
    summaryRevenue: document.getElementById("summary-total-revenue"),
    summaryAvgTicket: document.getElementById("summary-avg-ticket"),
    summaryItems: document.getElementById("summary-total-items"),
    dialog: document.getElementById("order-dialog"),
    modalTitle: document.getElementById("modal-order-title"),
    modalDate: document.getElementById("modal-order-date"),
    modalSeller: document.getElementById("modal-order-seller"),
    modalPayment: document.getElementById("modal-order-payment"),
    modalItems: document.getElementById("modal-order-items"),
    modalTotal: document.getElementById("modal-order-total"),
    modalCloseButton: document.getElementById("modal-close-button"),
    modalDeleteButton: document.getElementById("modal-delete-button"),
};

function parseOrderDate(rawDate) {
    if (!rawDate) {
        return null;
    }
    const normalized = typeof rawDate === "string" && rawDate.includes(" ")
        ? rawDate.replace(" ", "T")
        : rawDate;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(rawDate) {
    const parsed = parseOrderDate(rawDate);
    if (!parsed) {
        return rawDate || "-";
    }
    return `${dateFormatter.format(parsed)} às ${timeFormatter.format(parsed)}`;
}

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function createPaymentBadge(payment) {
    const badge = document.createElement("span");
    badge.className = "payment-badge";

    const iconSource = paymentIcons[payment];
    if (iconSource) {
        const icon = document.createElement("img");
        icon.className = "payment-badge-icon";
        icon.src = iconSource;
        icon.alt = "";
        badge.append(icon);
    }

    badge.append(document.createTextNode(payment || "-"));
    return badge;
}

function getOrderTotalItems(order) {
    if (Array.isArray(order.itens) && order.itens.length > 0) {
        return order.itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
    }
    if (Array.isArray(order.quantidades)) {
        return order.quantidades.reduce((sum, qty) => sum + (Number(qty) || 0), 0);
    }
    return 0;
}

function getSellerLabel(order) {
    return order.vendedorNome || `Vendedor #${order.vendedorId}`;
}

function showFeedback(message, type = "error") {
    elements.feedback.textContent = message;
    elements.feedback.className = `orders-feedback ${type === "success" ? "is-success" : "is-error"}`;
    elements.feedback.hidden = false;
}

function clearFeedback() {
    elements.feedback.textContent = "";
    elements.feedback.hidden = true;
}

function populatePaymentFilter(orders) {
    const currentSelection = elements.paymentFilter.value;
    const payments = [...new Set(orders.map((order) => order.pagamento).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

    elements.paymentFilter.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Todos os pagamentos";
    elements.paymentFilter.appendChild(defaultOption);

    payments.forEach((payment) => {
        const option = document.createElement("option");
        option.value = payment;
        option.textContent = payment;
        elements.paymentFilter.appendChild(option);
    });

    if (payments.includes(currentSelection)) {
        elements.paymentFilter.value = currentSelection;
    } else {
        state.payment = "";
    }
}

function getFilteredOrders() {
    const query = state.search.trim().toLocaleLowerCase("pt-BR");

    const filtered = state.orders.filter((order) => {
        if (state.payment && order.pagamento !== state.payment) {
            return false;
        }
        if (!query) {
            return true;
        }

        const itemNames = Array.isArray(order.itens)
            ? order.itens.map((item) => item.nome).join(" ")
            : "";
        const searchableText = [
            String(order.id),
            order.pagamento,
            getSellerLabel(order),
            formatDateTime(order.horario),
            itemNames,
        ]
            .join(" ")
            .toLocaleLowerCase("pt-BR");

        return searchableText.includes(query);
    });

    return filtered.sort((a, b) => {
        if (state.sortBy === "id") {
            return state.idDirection === "asc" ? a.id - b.id : b.id - a.id;
        }
        if (state.sortBy === "total") {
            return (Number(b.total) || 0) - (Number(a.total) || 0) || b.id - a.id;
        }
        const timeA = parseOrderDate(a.horario)?.getTime() ?? 0;
        const timeB = parseOrderDate(b.horario)?.getTime() ?? 0;
        return timeB - timeA || b.id - a.id;
    });
}

function renderSummary(orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const totalItems = orders.reduce((sum, order) => sum + getOrderTotalItems(order), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    elements.summaryOrders.textContent = String(totalOrders);
    elements.summaryRevenue.textContent = formatCurrency(totalRevenue);
    elements.summaryAvgTicket.textContent = formatCurrency(avgTicket);
    elements.summaryItems.textContent = String(totalItems);
}

function renderTable() {
    const filteredOrders = getFilteredOrders();
    renderSummary(filteredOrders);

    elements.count.textContent = filteredOrders.length === 1
        ? "1 pedido"
        : `${filteredOrders.length} pedidos`;
    elements.tableBody.innerHTML = "";
    elements.tableBody.setAttribute("aria-busy", "false");

    if (filteredOrders.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.className = "table-message";
        cell.textContent = state.orders.length === 0
            ? "Nenhum pedido registrado até o momento."
            : "Nenhum pedido encontrado para os filtros aplicados.";
        row.appendChild(cell);
        elements.tableBody.appendChild(row);
        return;
    }

    filteredOrders.forEach((order) => {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.className = "table-id";
        idCell.textContent = `#${order.id}`;

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDateTime(order.horario);

        const paymentCell = document.createElement("td");
        const badge = createPaymentBadge(order.pagamento);
        paymentCell.appendChild(badge);

        const sellerCell = document.createElement("td");
        sellerCell.textContent = getSellerLabel(order);

        const itemsCount = getOrderTotalItems(order);
        const itemsCell = document.createElement("td");
        itemsCell.textContent = itemsCount === 1 ? "1 un." : `${itemsCount} un.`;

        const totalCell = document.createElement("td");
        totalCell.className = "order-total-cell";
        totalCell.textContent = formatCurrency(order.total);

        const actionsCell = document.createElement("td");
        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "order-action-button";
        detailsButton.textContent = "Ver detalhes";
        detailsButton.addEventListener("click", () => openOrderModal(order));
        actionsCell.appendChild(detailsButton);

        row.append(
            idCell,
            dateCell,
            paymentCell,
            sellerCell,
            itemsCell,
            totalCell,
            actionsCell,
        );
        elements.tableBody.appendChild(row);
    });
}

function openOrderModal(order) {
    state.selectedOrderId = order.id;
    elements.modalTitle.textContent = `Pedido #${order.id}`;
    elements.modalDate.textContent = formatDateTime(order.horario);
    elements.modalSeller.textContent = getSellerLabel(order);
    elements.modalPayment.replaceChildren(createPaymentBadge(order.pagamento));
    elements.modalTotal.textContent = formatCurrency(order.total);
    elements.modalItems.innerHTML = "";

    const items = Array.isArray(order.itens) ? order.itens : [];
    if (items.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.className = "table-message";
        cell.textContent = "Nenhum item associado a este pedido.";
        row.appendChild(cell);
        elements.modalItems.appendChild(row);
    } else {
        items.forEach((item) => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = item.nome;

            const qtyCell = document.createElement("td");
            qtyCell.textContent = String(item.quantidade);

            const priceCell = document.createElement("td");
            priceCell.textContent = formatCurrency(item.preco);

            const subtotalCell = document.createElement("td");
            subtotalCell.textContent = formatCurrency(item.subtotal);

            row.append(nameCell, qtyCell, priceCell, subtotalCell);
            elements.modalItems.appendChild(row);
        });
    }

    if (!elements.dialog.open) {
        elements.dialog.showModal();
    }
}

function closeOrderModal() {
    state.selectedOrderId = null;
    if (elements.dialog.open) {
        elements.dialog.close();
    }
}

async function handleDeleteOrder() {
    const orderId = state.selectedOrderId;
    if (!orderId) {
        return;
    }

    const confirmed = window.confirm(
        `Deseja realmente excluir o pedido #${orderId}? Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) {
        return;
    }

    elements.modalDeleteButton.disabled = true;
    elements.modalDeleteButton.textContent = "Excluindo...";

    try {
        await apiRequest(`/pedidos/${orderId}`, { method: "DELETE" });
        state.orders = state.orders.filter((order) => order.id !== orderId);
        closeOrderModal();
        populatePaymentFilter(state.orders);
        renderTable();
        showFeedback(`Pedido #${orderId} excluído com sucesso.`, "success");
    } catch (error) {
        showFeedback(error.message || "Não foi possível excluir o pedido.", "error");
    } finally {
        elements.modalDeleteButton.disabled = false;
        elements.modalDeleteButton.textContent = "Excluir pedido";
    }
}

async function loadOrders() {
    clearFeedback();
    elements.refreshButton.disabled = true;
    elements.tableBody.setAttribute("aria-busy", "true");
    elements.subtitle.textContent = "Atualizando histórico de vendas...";

    try {
        const orders = await apiRequest("/pedidos?detalhado=true");
        state.orders = Array.isArray(orders) ? orders : [];
        populatePaymentFilter(state.orders);
        renderTable();
        elements.subtitle.textContent = "Histórico de vendas sincronizado com a API";
    } catch (error) {
        state.orders = [];
        renderTable();
        elements.subtitle.textContent = "Não foi possível carregar os pedidos";
        showFeedback(error.message || "Erro ao carregar os pedidos.", "error");
    } finally {
        elements.refreshButton.disabled = false;
    }
}

function updateSortButtons() {
    elements.sortButtons.forEach((button) => {
        const isCurrent = button.dataset.sort === state.sortBy;
        button.setAttribute("aria-pressed", String(isCurrent));
        if (button.dataset.sort === "id") {
            button.textContent = state.idDirection === "asc" ? "ID ↑" : "ID ↓";
        }
    });
}

function bindEvents() {
    elements.newOrderButton.addEventListener("click", () => {
        window.location.assign("./caixa.html");
    });

    elements.refreshButton.addEventListener("click", () => {
        void loadOrders();
    });

    elements.search.addEventListener("input", (event) => {
        state.search = event.target.value;
        renderTable();
    });

    elements.paymentFilter.addEventListener("change", (event) => {
        state.payment = event.target.value;
        renderTable();
    });

    elements.sortButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedSort = button.dataset.sort;
            if (selectedSort === "id" && state.sortBy === "id") {
                state.idDirection = state.idDirection === "asc" ? "desc" : "asc";
            } else {
                state.sortBy = selectedSort;
            }
            updateSortButtons();
            renderTable();
        });
    });

    elements.modalCloseButton.addEventListener("click", closeOrderModal);
    elements.modalDeleteButton.addEventListener("click", () => {
        void handleDeleteOrder();
    });

    elements.dialog.addEventListener("click", (event) => {
        if (event.target === elements.dialog) {
            closeOrderModal();
        }
    });

    elements.dialog.addEventListener("close", () => {
        state.selectedOrderId = null;
    });
}

bindEvents();
updateSortButtons();
void loadOrders();
