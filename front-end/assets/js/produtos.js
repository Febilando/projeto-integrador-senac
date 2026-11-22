import { apiRequest } from "./api.js";

const PRODUCT_IMAGE_FALLBACK = "../assets/Senac_logo.svg.webp";
const PRODUCT_NAME_MAX_LENGTH = 150;
const PRODUCT_BARCODE_MAX_LENGTH = 100;
const PRODUCT_IMAGE_MAX_LENGTH = 500;
const MAXIMUM_STOCK_VALUE = 2_147_483_647;
const MINIMUM_STOCK_VALUE = 0;
const MINIMUM_RESTOCK_VALUE = 1;
const EMPTY_MESSAGE = "Nenhum produto encontrado.";
const LOW_STOCK_LABEL = "Estoque baixo";
const AVAILABLE_LABEL = "Em estoque";
const UNAVAILABLE_LABEL = "Sem estoque";
const SORT_ASCENDING = "asc";
const SORT_DESCENDING = "desc";

const rowsElement = document.querySelector("#products-rows");
const countElement = document.querySelector("#products-count");
const feedbackElement = document.querySelector("#products-feedback");
const searchElement = document.querySelector("#products-search");
const maximumStockElement = document.querySelector("#max-stock");
const refreshButton = document.querySelector("#refresh-products");
const newProductButton = document.querySelector("#new-product");
const sortButtons = document.querySelectorAll("[data-sort]");
const productDialog = document.querySelector("#product-dialog");
const productForm = document.querySelector("#product-form");
const productDialogTitle = document.querySelector("#product-dialog-title");
const productFormFeedback = document.querySelector("#product-form-feedback");
const productNameInput = document.querySelector("#product-name");
const productBarcodeInput = document.querySelector("#product-barcode");
const productStockInput = document.querySelector("#product-stock");
const productPriceInput = document.querySelector("#product-price");
const productImageInput = document.querySelector("#product-image");
const restockDialog = document.querySelector("#restock-dialog");
const restockForm = document.querySelector("#restock-form");
const restockFormFeedback = document.querySelector("#restock-form-feedback");
const restockQuantityInput = document.querySelector("#restock-quantity");

let products = [];
let lowStockProductIds = new Set();
let sortField = "nome";
let sortDirection = SORT_ASCENDING;
let activeProductId = null;

productNameInput.maxLength = PRODUCT_NAME_MAX_LENGTH;
productBarcodeInput.maxLength = PRODUCT_BARCODE_MAX_LENGTH;
productImageInput.maxLength = PRODUCT_IMAGE_MAX_LENGTH;
productStockInput.max = String(MAXIMUM_STOCK_VALUE);
restockQuantityInput.max = String(MAXIMUM_STOCK_VALUE);

function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
}

function formatPrice(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(value));
}

function getAvailability(product) {
    if (product.estoque === 0) {
        return { label: UNAVAILABLE_LABEL, className: "table-status--unavailable" };
    }

    if (lowStockProductIds.has(product.id)) {
        return { label: LOW_STOCK_LABEL, className: "table-status--low" };
    }

    return { label: AVAILABLE_LABEL, className: "table-status--available" };
}

function createProductRow(product) {
    const row = document.createElement("tr");
    const imageCell = document.createElement("td");
    const image = document.createElement("img");

    image.className = "table-image";
    image.alt = "";
    image.loading = "lazy";
    image.src = product.img || PRODUCT_IMAGE_FALLBACK;
    image.addEventListener("error", () => {
        image.src = PRODUCT_IMAGE_FALLBACK;
    }, { once: true });
    imageCell.append(image);

    const availability = getAvailability(product);
    const status = document.createElement("span");
    status.className = `table-status ${availability.className}`;
    status.textContent = availability.label;

    const statusCell = document.createElement("td");
    statusCell.append(status);

    const actionsCell = document.createElement("td");
    actionsCell.className = "product-actions";
    const actions = [
        { action: "edit", label: "Editar", className: "product-action-button" },
        { action: "restock", label: "Repor", className: "product-action-button" },
        { action: "delete", label: "Excluir", className: "product-action-button product-action-button--danger" },
    ];

    for (const action of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.className;
        button.dataset.productAction = action.action;
        button.dataset.productId = String(product.id);
        button.textContent = action.label;
        button.setAttribute("aria-label", `${action.label} ${product.nome}`);
        actionsCell.append(button);
    }

    row.append(
        imageCell,
        createCell(String(product.id), "table-id"),
        createCell(product.nome, "table-name"),
        createCell(product.cod_barras || "—"),
        createCell(formatPrice(product.preco)),
        createCell(`${product.estoque} unidades`),
        statusCell,
        actionsCell,
    );

    return row;
}

function showTableMessage(message) {
    const row = document.createElement("tr");
    const cell = createCell(message);
    cell.colSpan = 8;
    cell.className = "table-message";
    row.append(cell);
    rowsElement.replaceChildren(row);
}

function getFilteredProducts() {
    const searchTerm = searchElement.value.trim().toLocaleLowerCase("pt-BR");
    const maximumStock = maximumStockElement.value === ""
        ? null
        : Number(maximumStockElement.value);
    const direction = sortDirection === SORT_ASCENDING ? 1 : -1;

    return products
        .filter((product) => {
            const matchesSearch = product.nome
                .toLocaleLowerCase("pt-BR")
                .includes(searchTerm)
                || String(product.id).includes(searchTerm);
            const matchesStock = maximumStock === null
                || product.estoque <= maximumStock;
            return matchesSearch && matchesStock;
        })
        .sort((first, second) => {
            const comparison = sortField === "estoque"
                ? first.estoque - second.estoque
                : first.nome.localeCompare(second.nome, "pt-BR");
            return comparison * direction;
        });
}

function renderProducts() {
    const visibleProducts = getFilteredProducts();
    countElement.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "produto" : "produtos"}`;

    if (visibleProducts.length === 0) {
        showTableMessage(products.length === 0 ? EMPTY_MESSAGE : "Nenhum produto corresponde aos filtros.");
        return;
    }

    rowsElement.replaceChildren(...visibleProducts.map(createProductRow));
}

function updateSortButtons() {
    for (const button of sortButtons) {
        const isActive = button.dataset.sort === sortField;
        button.setAttribute("aria-pressed", String(isActive));
        if (isActive) {
            button.textContent = `${button.dataset.label} ${sortDirection === SORT_ASCENDING ? "↑" : "↓"}`;
        }
    }
}

async function loadProducts(successMessage = null) {
    rowsElement.setAttribute("aria-busy", "true");
    feedbackElement.textContent = "Carregando produtos...";
    refreshButton.disabled = true;
    showTableMessage("Carregando produtos...");

    try {
        const [loadedProducts, lowStockProducts] = await Promise.all([
            apiRequest("/produtos"),
            apiRequest("/produtos/estoque-baixo"),
        ]);
        products = loadedProducts;
        lowStockProductIds = new Set(lowStockProducts.map((product) => product.id));
        feedbackElement.textContent = successMessage || "Produtos carregados do banco de dados.";
        renderProducts();
    } catch (error) {
        products = [];
        lowStockProductIds = new Set();
        countElement.textContent = "";
        showTableMessage("Não foi possível carregar os produtos.");
        feedbackElement.textContent = error.message;
    } finally {
        rowsElement.setAttribute("aria-busy", "false");
        refreshButton.disabled = false;
    }
}

function openProductDialog(product = null) {
    activeProductId = product?.id ?? null;
    productForm.reset();
    productFormFeedback.textContent = "";
    productDialogTitle.textContent = product ? "Editar produto" : "Novo produto";
    productForm.querySelector("[type=submit]").textContent = product
        ? "Salvar alterações"
        : "Salvar produto";

    if (product) {
        productNameInput.value = product.nome;
        productBarcodeInput.value = product.cod_barras ?? "";
        productStockInput.value = String(product.estoque);
        productPriceInput.value = String(product.preco);
        productImageInput.value = product.img ?? "";
    }

    productDialog.showModal();
    productNameInput.focus();
}

function openRestockDialog(product) {
    activeProductId = product.id;
    restockForm.reset();
    restockFormFeedback.textContent = "";
    document.querySelector("#restock-dialog-title").textContent = `Repor estoque — ${product.nome}`;
    restockDialog.showModal();
    restockQuantityInput.focus();
}

function setFormBusy(form, isBusy) {
    const submitButton = form.querySelector("[type=submit]");
    submitButton.disabled = isBusy;
}

function getIntegerInputValue(input, minimum, maximum, fieldLabel) {
    const value = Number(input.value);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${fieldLabel} deve ser um número inteiro válido entre ${minimum} e ${maximum}.`);
    }
    return value;
}

productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = productNameInput.value.trim();
    if (!nome) {
        productFormFeedback.textContent = "Informe um nome para o produto.";
        productNameInput.focus();
        return;
    }

    let estoque;
    try {
        estoque = getIntegerInputValue(
            productStockInput,
            MINIMUM_STOCK_VALUE,
            MAXIMUM_STOCK_VALUE,
            "Estoque",
        );
    } catch (error) {
        productFormFeedback.textContent = error.message;
        productStockInput.focus();
        return;
    }

    const payload = {
        nome,
        cod_barras: productBarcodeInput.value.trim() || null,
        estoque,
        preco: Number(productPriceInput.value),
        img: productImageInput.value.trim() || null,
    };
    const isEditing = activeProductId !== null;
    const endpoint = isEditing ? `/produtos/${activeProductId}` : "/produtos";
    const method = isEditing ? "PUT" : "POST";

    setFormBusy(productForm, true);
    productFormFeedback.textContent = isEditing ? "Salvando alterações..." : "Cadastrando produto...";

    try {
        await apiRequest(endpoint, { method, body: JSON.stringify(payload) });
        productDialog.close();
        await loadProducts(isEditing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    } catch (error) {
        productFormFeedback.textContent = error.message;
    } finally {
        setFormBusy(productForm, false);
    }
});

restockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let quantidade;
    try {
        quantidade = getIntegerInputValue(
            restockQuantityInput,
            MINIMUM_RESTOCK_VALUE,
            MAXIMUM_STOCK_VALUE,
            "Quantidade",
        );
    } catch (error) {
        restockFormFeedback.textContent = error.message;
        restockQuantityInput.focus();
        return;
    }

    setFormBusy(restockForm, true);
    restockFormFeedback.textContent = "Atualizando estoque...";

    try {
        await apiRequest(`/produtos/${activeProductId}/reposicao`, {
            method: "POST",
            body: JSON.stringify({ quantidade }),
        });
        restockDialog.close();
        await loadProducts("Estoque atualizado com sucesso.");
    } catch (error) {
        restockFormFeedback.textContent = error.message;
    } finally {
        setFormBusy(restockForm, false);
    }
});

rowsElement.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-product-action]");
    if (!button) return;

    const productId = Number(button.dataset.productId);
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    if (button.dataset.productAction === "edit") {
        openProductDialog(product);
        return;
    }

    if (button.dataset.productAction === "restock") {
        openRestockDialog(product);
        return;
    }

    if (button.dataset.productAction !== "delete") return;
    const confirmed = window.confirm(`Deseja excluir o produto “${product.nome}”?`);
    if (!confirmed) return;

    button.disabled = true;
    feedbackElement.textContent = `Excluindo ${product.nome}...`;
    try {
        await apiRequest(`/produtos/${product.id}`, { method: "DELETE" });
        await loadProducts("Produto excluído com sucesso.");
    } catch (error) {
        feedbackElement.textContent = error.message;
        button.disabled = false;
    }
});

newProductButton.addEventListener("click", () => openProductDialog());

document.querySelectorAll("[data-close-product-dialog]").forEach((button) => {
    button.addEventListener("click", () => productDialog.close());
});

document.querySelectorAll("[data-close-restock-dialog]").forEach((button) => {
    button.addEventListener("click", () => restockDialog.close());
});

for (const button of sortButtons) {
    button.addEventListener("click", () => {
        if (sortField === button.dataset.sort) {
            sortDirection = sortDirection === SORT_ASCENDING
                ? SORT_DESCENDING
                : SORT_ASCENDING;
        } else {
            sortField = button.dataset.sort;
            sortDirection = SORT_ASCENDING;
        }

        updateSortButtons();
        renderProducts();
    });
}

searchElement.addEventListener("input", renderProducts);
maximumStockElement.addEventListener("input", renderProducts);
refreshButton.addEventListener("click", loadProducts);

updateSortButtons();
loadProducts();
