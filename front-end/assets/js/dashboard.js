import { apiRequest } from "./api.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
});

const elements = {
    statsMonth: document.getElementById("stats-month"),
    revenueMonth: document.getElementById("revenue-month"),
    productsMonth: document.getElementById("products-month"),
    revenueValue: document.getElementById("revenue-value"),
    revenueChange: document.getElementById("revenue-change"),
    revenueStatLabel: document.getElementById("revenue-stat-label"),
    revenueStatValue: document.getElementById("revenue-stat-value"),
    revenueStatTrend: document.getElementById("revenue-stat-trend"),
    ticketStatLabel: document.getElementById("ticket-stat-label"),
    ticketStatValue: document.getElementById("ticket-stat-value"),
    ticketTrend: document.getElementById("ticket-trend"),
    salesStatLabel: document.getElementById("sales-stat-label"),
    salesStatValue: document.getElementById("sales-stat-value"),
    salesTrend: document.getElementById("sales-trend"),
    largestSaleStatLabel: document.getElementById("largest-sale-stat-label"),
    largestSaleStatValue: document.getElementById("largest-sale-stat-value"),
    largestSaleTrend: document.getElementById("largest-sale-trend"),
    productsBody: document.getElementById("dashboard-products-body"),
    paymentsList: document.getElementById("dashboard-payments"),
};

let orders = [];
let products = [];
let availableMonths = [];

function parseOrderDate(rawDate) {
    if (!rawDate) return null;
    const normalized = typeof rawDate === "string" && rawDate.includes(" ")
        ? rawDate.replace(" ", "T")
        : rawDate;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMonthKey(rawDate) {
    const date = parseOrderDate(rawDate);
    if (!date) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key) {
    const [year, month] = key.split("-").map(Number);
    return monthFormatter.format(new Date(year, month - 1, 1));
}

function getPreviousMonthKey(key) {
    const [year, month] = key.split("-").map(Number);
    const previous = new Date(year, month - 2, 1);
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function getOrderTotal(order) {
    return Number(order.total) || 0;
}

function getMonthOrders(monthKey) {
    return orders.filter((order) => getMonthKey(order.horario) === monthKey);
}

function calculateChange(current, previous) {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

function formatChange(change) {
    if (change === null || !Number.isFinite(change)) return "";
    const isPositive = change >= 0;
    return `${isPositive ? "↗" : "↘"} ${Math.abs(change).toFixed(2).replace(".", ",")}%`;
}

function setTrend(element, change) {
    element.classList.toggle("trend--positive", change === null || change >= 0);
    element.classList.toggle("trend--negative", change !== null && change < 0);
}

function renderSummary() {
    const monthKey = elements.statsMonth.value;
    const monthOrders = getMonthOrders(monthKey);
    const previousOrders = getMonthOrders(getPreviousMonthKey(monthKey));

    const revenue = monthOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const averageTicket = monthOrders.length ? revenue / monthOrders.length : 0;
    const previousAverage = previousOrders.length ? previousRevenue / previousOrders.length : 0;
    const largestSale = monthOrders.reduce(
        (largest, order) => Math.max(largest, getOrderTotal(order)),
        0,
    );

    const revenueChange = calculateChange(revenue, previousRevenue);
    const ticketChange = calculateChange(averageTicket, previousAverage);
    const salesChange = calculateChange(monthOrders.length, previousOrders.length);
    const monthLabel = formatMonth(monthKey);
    const previousMonthLabel = formatMonth(getPreviousMonthKey(monthKey));

    elements.revenueValue.textContent = currencyFormatter.format(revenue);
    elements.revenueChange.textContent = formatChange(revenueChange);
    elements.revenueStatLabel.textContent = `Faturamento (${monthLabel})`;
    elements.revenueStatValue.textContent = currencyFormatter.format(revenue);
    elements.revenueStatTrend.textContent =
        revenueChange === null ? "Sem período anterior" : `${formatChange(revenueChange)} em relação a ${previousMonthLabel}`;

    elements.ticketStatLabel.textContent = `Ticket Médio (${monthLabel})`;
    elements.ticketStatValue.textContent = currencyFormatter.format(averageTicket);
    elements.ticketTrend.textContent =
        ticketChange === null ? "Sem período anterior" : `${formatChange(ticketChange)} em relação a ${previousMonthLabel}`;

    elements.salesStatLabel.textContent = `Total de Vendas (${monthLabel})`;
    elements.salesStatValue.textContent = String(monthOrders.length);
    elements.salesTrend.textContent =
        salesChange === null ? "Sem período anterior" : `${formatChange(salesChange)} em relação a ${previousMonthLabel}`;

    elements.largestSaleStatLabel.textContent = `Maior Venda (${monthLabel})`;
    elements.largestSaleStatValue.textContent = currencyFormatter.format(largestSale);
    elements.largestSaleTrend.textContent =
        monthOrders.length ? "Maior pedido do período" : "Nenhuma venda no período";

    setTrend(elements.revenueStatTrend, revenueChange);
    setTrend(elements.ticketTrend, ticketChange);
    setTrend(elements.salesTrend, salesChange);

    renderProducts(monthOrders);
    renderPayments(monthOrders);
}

function renderProducts(monthOrders) {
    const quantitiesByProduct = new Map();

    monthOrders.forEach((order) => {
        (order.itens || []).forEach((item) => {
            const current = quantitiesByProduct.get(item.produtoId) || 0;
            quantitiesByProduct.set(item.produtoId, current + (Number(item.quantidade) || 0));
        });
    });

    const productRows = [...quantitiesByProduct.entries()]
        .map(([productId, quantity]) => ({
            product: products.find((item) => item.id === productId),
            quantity,
        }))
        .filter((entry) => entry.product)
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 3);

    if (!productRows.length) {
        elements.productsBody.innerHTML =
            '<tr><td colspan="4" class="table-message">Nenhum produto vendido neste período.</td></tr>';
        return;
    }

    elements.productsBody.innerHTML = productRows.map(({ product, quantity }, index) => {
        const available = product.estoque > 0;
        const initial = product.nome?.charAt(0)?.toUpperCase() || "P";
        return `
            <tr>
                <td>
                    <span class="product-name">
                        <span class="product-thumb ${index === 1 ? "product-thumb--orange" : index === 2 ? "product-thumb--gray" : ""}">${initial}</span>
                        ${escapeHtml(product.nome)}
                    </span>
                </td>
                <td>${currencyFormatter.format(Number(product.preco) || 0)}</td>
                <td>${quantity} pcs</td>
                <td>
                    <span class="product-status ${available ? "product-status--available" : "product-status--unavailable"}">
                        <i></i>${available ? "Em estoque" : "Esgotado"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

function renderPayments(monthOrders) {
    const totals = new Map();
    let totalRevenue = 0;

    monthOrders.forEach((order) => {
        const total = getOrderTotal(order);
        const payment = (order.pagamento || "Não informado").trim();
        totals.set(payment, (totals.get(payment) || 0) + total);
        totalRevenue += total;
    });

    const rankedPayments = [...totals.entries()]
        .sort((first, second) => second[1] - first[1])
        .slice(0, 5);

    if (!rankedPayments.length) {
        elements.paymentsList.innerHTML =
            '<li class="payment-empty">Nenhum pagamento no período.</li>';
        return;
    }

    const variants = ["", "payment-icon--credit", "payment-icon--pix", "payment-icon--cash", "payment-icon--check"];
    elements.paymentsList.innerHTML = rankedPayments.map(([payment, total], index) => {
        const percentage = totalRevenue ? (total / totalRevenue) * 100 : 0;
        const initial = payment.charAt(0).toUpperCase();
        return `
            <li>
                <span class="payment-rank">${index + 1}</span>
                <span class="payment-icon ${variants[index]}">${escapeHtml(initial)}</span>
                <span>${escapeHtml(payment)}</span>
                <strong>${percentage.toFixed(0)}%</strong>
            </li>
        `;
    }).join("");
}

function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function populateMonthSelects() {
    const monthOptions = availableMonths.map((key) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = formatMonth(key);
        return option;
    });

    [elements.statsMonth, elements.revenueMonth, elements.productsMonth].forEach((select) => {
        select.replaceChildren(...monthOptions.map((option) => option.cloneNode(true)));
    });

    const latestMonth = availableMonths[availableMonths.length - 1] || "";
    elements.statsMonth.value = latestMonth;
    elements.revenueMonth.value = latestMonth;
    elements.productsMonth.value = latestMonth;
}

function synchronizeMonth(monthKey) {
    elements.statsMonth.value = monthKey;
    elements.revenueMonth.value = monthKey;
    elements.productsMonth.value = monthKey;
    renderSummary();
}

async function loadDashboard() {
    try {
        const [loadedOrders, loadedProducts] = await Promise.all([
            apiRequest("/pedidos?detalhado=true"),
            apiRequest("/produtos"),
        ]);

        orders = loadedOrders;
        products = loadedProducts;
        availableMonths = [...new Set(
            orders.map((order) => getMonthKey(order.horario)).filter(Boolean),
        )].sort();

        if (!availableMonths.length) {
            const now = new Date();
            availableMonths = [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`];
        }

        populateMonthSelects();
        renderSummary();
    } catch (error) {
        elements.revenueValue.textContent = "Erro";
        elements.revenueChange.textContent = "";
        elements.revenueStatValue.textContent = "—";
        elements.ticketStatValue.textContent = "—";
        elements.salesStatValue.textContent = "—";
        elements.largestSaleStatValue.textContent = "—";
        elements.productsBody.innerHTML =
            `<tr><td colspan="4" class="table-message">${escapeHtml(error.message)}</td></tr>`;
        elements.paymentsList.innerHTML =
            `<li class="payment-empty">${escapeHtml(error.message)}</li>`;
    }
}

[elements.statsMonth, elements.revenueMonth, elements.productsMonth].forEach((select) => {
    select.addEventListener("change", () => synchronizeMonth(select.value));
});

loadDashboard();
