import { apiRequest } from "../assets/js/api.js";

const EMPTY_MESSAGE = "Nenhum produto encontrado.";
const MAXIMUM_STOCK_VALUE = 2_147_483_647;

const productsList = document.querySelector("#products-list");
const productsCount = document.querySelector("#products-count");
const orderSearch = document.querySelector("#order-search");
const productSearch = document.querySelector("#product-search");
const searchResultsElement = document.querySelector("#product-search-results");
const summaryItems = document.querySelector("#summary-items");
const summaryEmpty = document.querySelector("#summary-empty");
const summaryQuantity = document.querySelector("#summary-quantity");
const orderTotal = document.querySelector("#order-total");
const finalizeButton = document.querySelector("#finalize-order");
const confirmationDialog = document.querySelector("#order-confirmation");
const confirmationFeedback = document.querySelector("#order-confirmation-feedback");
const successMessage = document.querySelector("#order-success");
const cancelOrderButton = document.querySelector("#cancel-order");
const confirmOrderButton = document.querySelector("#confirm-order");
const paymentInputs = document.querySelectorAll('input[name="pagamento"]');
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const selectedProducts = new Map();
let searchResults = [];
let searchTimeoutId = null;
let searchRequestId = 0;
let isFinalizingOrder = false;
let orderQuantitiesCapability = null;

function formatPrice(value) {
    return currencyFormatter.format(Number(value));
}

function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
}

function renderSelectedProducts() {
    const selected = [...selectedProducts.values()];
    const count = selected.length;
    productsCount.textContent = `${count} ${count === 1 ? "produto adicionado" : "produtos adicionados"}`;

    if (count === 0) {
        const row = document.createElement("tr");
        const cell = createCell("Nenhum produto adicionado.", "table-message");
        cell.colSpan = 5;
        row.append(cell);
        productsList.replaceChildren(row);
        return;
    }

    productsList.replaceChildren(...selected.map(createProductRow));
}

function createProductRow(selection) {
    const { product, quantity } = selection;
    const row = document.createElement("tr");
    const productId = Number(product.id);
    const stock = Number(product.estoque);
    const quantityInput = document.createElement("input");

    row.dataset.productId = String(productId);
    row.append(
        createCell(String(productId), "table-id"),
        createCell(product.nome, "table-name"),
        createCell(`${stock} unidades`),
        createCell(formatPrice(product.preco)),
    );

    quantityInput.className = "input-text order-quantity";
    quantityInput.type = "number";
    quantityInput.min = "0";
    quantityInput.max = String(Math.min(stock, MAXIMUM_STOCK_VALUE));
    quantityInput.step = "1";
    quantityInput.value = String(quantity);
    quantityInput.disabled = stock === 0;
    quantityInput.title = stock === 0
        ? "Produto sem estoque"
        : `Quantidade de ${product.nome}`;

    const quantityCell = document.createElement("td");
    quantityCell.append(quantityInput);
    row.append(quantityCell);
    return row;
}

function updateSummary() {
    summaryItems.replaceChildren();

    let totalUnits = 0;
    let totalCents = 0;

    for (const [productId, selection] of selectedProducts) {
        const priceCents = Math.round(Number(selection.product.preco) * 100);
        const subtotalCents = priceCents * selection.quantity;
        const item = document.createElement("li");
        const name = document.createElement("span");
        const subtotal = document.createElement("span");

        item.className = "order-summary-item";
        name.className = "order-summary-item-name";
        subtotal.className = "order-summary-item-value";
        name.textContent = `${selection.quantity} × ${selection.product.nome}`;
        subtotal.textContent = formatPrice(subtotalCents / 100);
        item.dataset.productId = String(productId);
        item.append(name, subtotal);
        summaryItems.append(item);

        totalUnits += selection.quantity;
        totalCents += subtotalCents;
    }

    summaryEmpty.hidden = selectedProducts.size > 0;
    summaryQuantity.textContent = String(totalUnits);
    orderTotal.textContent = formatPrice(totalCents / 100);
    updateFinalizeButton();
}

function updateFinalizeButton() {
    const hasPaymentMethod = document.querySelector(
        'input[name="pagamento"]:checked',
    ) !== null;
    finalizeButton.disabled = selectedProducts.size === 0 || !hasPaymentMethod;
}

function updateSelectedProduct(row, input) {
    const productId = Number(row.dataset.productId);
    const selection = selectedProducts.get(productId);
    if (!selection) return;

    const quantity = Number(input.value);
    const maxQuantity = Number(input.max);
    const normalizedQuantity = Math.max(
        0,
        Math.min(Number.isFinite(quantity) ? Math.floor(quantity) : 0, maxQuantity),
    );

    if (Number(input.value) !== normalizedQuantity) {
        input.value = String(normalizedQuantity);
    }

    if (normalizedQuantity === 0) {
        selectedProducts.delete(productId);
        renderSelectedProducts();
    } else {
        selection.quantity = normalizedQuantity;
    }

    updateSummary();
}

function showSearchMessage(message) {
    const status = document.createElement("p");
    status.className = "order-search-message";
    status.textContent = message;
    searchResultsElement.replaceChildren(status);
    searchResultsElement.hidden = false;
}

function renderSearchResults(products) {
    searchResults = products;
    if (products.length === 0) {
        showSearchMessage(EMPTY_MESSAGE);
        return;
    }

    const buttons = products.map((product) => {
        const productId = Number(product.id);
        const stock = Number(product.estoque);
        const selected = selectedProducts.get(productId);
        const button = document.createElement("button");
        const details = document.createElement("span");
        const name = document.createElement("strong");
        const description = document.createElement("span");
        const price = document.createElement("span");

        button.type = "button";
        button.className = "order-search-result";
        button.dataset.addProduct = String(productId);
        button.disabled = stock === 0 || (selected?.quantity ?? 0) >= stock;

        name.className = "order-search-result-name";
        name.textContent = product.nome;
        description.className = "order-search-result-description";
        description.textContent = `ID ${productId} · ${stock} unidades em estoque`;
        details.className = "order-search-result-details";
        details.append(name, description);

        price.className = "order-search-result-price";
        price.textContent = selected
            ? `${formatPrice(product.preco)} · ${selected.quantity} no pedido`
            : `${formatPrice(product.preco)} · Adicionar`;

        button.append(details, price);
        return button;
    });

    searchResultsElement.replaceChildren(...buttons);
    searchResultsElement.hidden = false;
}

function addProduct(product) {
    const productId = Number(product.id);
    const stock = Number(product.estoque);
    if (stock <= 0) return;

    const selected = selectedProducts.get(productId);
    const quantity = Math.min(stock, (selected?.quantity ?? 0) + 1);
    selectedProducts.set(productId, { product, quantity });

    productSearch.value = "";
    searchResults = [];
    searchResultsElement.hidden = true;
    successMessage.hidden = true;
    renderSelectedProducts();
    updateSummary();
    productSearch.focus();
}

async function loadProducts(term, requestId) {
    showSearchMessage("Buscando produtos...");

    try {
        const query = `?${new URLSearchParams({ busca: term })}`;
        const products = await apiRequest(`/produtos${query}`);
        if (requestId !== searchRequestId) return;

        for (const product of products) {
            const productId = Number(product.id);
            const selected = selectedProducts.get(productId);
            if (!selected) continue;

            selected.product = product;
            selected.quantity = Math.min(
                selected.quantity,
                Number(product.estoque),
            );
            if (selected.quantity === 0) {
                selectedProducts.delete(productId);
            }
        }

        renderSelectedProducts();
        updateSummary();
        renderSearchResults(products);
    } catch (error) {
        if (requestId !== searchRequestId) return;
        searchResults = [];
        showSearchMessage(error.message);
    }
}

function searchProductsImmediately() {
    window.clearTimeout(searchTimeoutId);
    const term = productSearch.value.trim();
    if (!term) {
        searchRequestId += 1;
        searchResults = [];
        searchResultsElement.hidden = true;
        return;
    }

    const requestId = ++searchRequestId;
    void loadProducts(term, requestId);
}

function scheduleProductSearch() {
    window.clearTimeout(searchTimeoutId);
    const term = productSearch.value.trim();

    if (!term) {
        searchRequestId += 1;
        searchResults = [];
        searchResultsElement.hidden = true;
        return;
    }

    const requestId = ++searchRequestId;
    searchResults = [];
    showSearchMessage("Buscando produtos...");
    searchTimeoutId = window.setTimeout(
        () => void loadProducts(term, requestId),
        250,
    );
}

productSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchProductsImmediately();
    } else if (event.key === "Escape") {
        searchResultsElement.hidden = true;
    }
});

searchResultsElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-product]");
    if (!button) return;

    const productId = Number(button.dataset.addProduct);
    const product = searchResults.find((item) => Number(item.id) === productId);
    if (product) addProduct(product);
});

productsList.addEventListener("input", (event) => {
    const input = event.target.closest(".order-quantity");
    if (!input) return;
    updateSelectedProduct(input.closest("tr"), input);
});

document.addEventListener("click", (event) => {
    if (!orderSearch.contains(event.target)) {
        searchResultsElement.hidden = true;
    }
});

function resetOrder() {
    selectedProducts.clear();
    window.clearTimeout(searchTimeoutId);
    searchRequestId += 1;
    searchResults = [];
    productSearch.value = "";
    searchResultsElement.replaceChildren();
    searchResultsElement.hidden = true;
    for (const input of paymentInputs) {
        input.checked = false;
    }

    renderSelectedProducts();
    updateSummary();
    successMessage.textContent = "Pedido salvo com sucesso. Pronto para um novo pedido.";
    successMessage.hidden = false;
    productSearch.focus();
}

function setFinalizingOrder(isFinalizing) {
    isFinalizingOrder = isFinalizing;
    confirmOrderButton.disabled = isFinalizing;
    cancelOrderButton.disabled = isFinalizing;
    confirmOrderButton.textContent = isFinalizing
        ? "Registrando pedido..."
        : "Confirmar pedido";
}

function verifyOrderQuantitiesCapability() {
    if (!orderQuantitiesCapability) {
        orderQuantitiesCapability = apiRequest("/openapi.json")
            .then((specification) => {
                const requestSchema = specification?.paths?.["/pedidos"]
                    ?.post?.requestBody?.content?.["application/json"]?.schema;
                const schemaName = requestSchema?.$ref?.split("/").at(-1);
                const orderSchema = schemaName
                    ? specification.components?.schemas?.[schemaName]
                    : requestSchema;

                if (!orderSchema?.properties?.quantidades) {
                    throw new Error(
                        "A API precisa ser atualizada para salvar as quantidades do pedido.",
                    );
                }
            })
            .catch((error) => {
                orderQuantitiesCapability = null;
                throw error;
            });
    }

    return orderQuantitiesCapability;
}

async function finalizeOrder() {
    if (finalizeButton.disabled || isFinalizingOrder) return;

    const pagamento = document.querySelector(
        'input[name="pagamento"]:checked',
    )?.value;
    if (!pagamento) return;

    const items = [...selectedProducts.entries()];
    if (items.length === 0) return;

    setFinalizingOrder(true);
    confirmationFeedback.textContent = "Registrando pedido...";

    try {
        await verifyOrderQuantitiesCapability();
        const session = await apiRequest("/auth/me");
        const vendedorId = Number(session?.usuario?.id);
        if (!Number.isSafeInteger(vendedorId) || vendedorId <= 0) {
            throw new Error("Não foi possível identificar o vendedor autenticado.");
        }

        const payload = {
            pagamento,
            vendedorId,
            produtos: items.map(([productId]) => productId),
            quantidades: items.map(([, selection]) => selection.quantity),
        };
        await apiRequest("/pedidos", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        confirmationDialog.close();
        confirmationFeedback.textContent = "";
        resetOrder();
    } catch (error) {
        confirmationFeedback.textContent = error.message;
    } finally {
        setFinalizingOrder(false);
    }
}

productSearch.addEventListener("input", () => {
    successMessage.hidden = true;
    scheduleProductSearch();
});

for (const input of paymentInputs) {
    input.addEventListener("change", () => {
        successMessage.hidden = true;
        updateFinalizeButton();
    });
}

finalizeButton.addEventListener("click", () => {
    if (!finalizeButton.disabled) {
        confirmationFeedback.textContent = "";
        confirmationDialog.showModal();
    }
});

cancelOrderButton.addEventListener("click", () => {
    confirmationDialog.close();
});

confirmOrderButton.addEventListener("click", finalizeOrder);
confirmationDialog.addEventListener("cancel", (event) => {
    if (isFinalizingOrder) {
        event.preventDefault();
    }
});

renderSelectedProducts();
updateSummary();
