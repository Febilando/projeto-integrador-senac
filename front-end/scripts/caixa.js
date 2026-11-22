const linhasProdutos = [...document.querySelectorAll("#products-list tr")];
const resumoItens = document.querySelector("#summary-items");
const resumoVazio = document.querySelector("#summary-empty");
const resumoQuantidade = document.querySelector("#summary-quantity");
const totalPedido = document.querySelector("#order-total");
const quantidades = [...document.querySelectorAll(".order-quantity")];
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

function atualizarResumo() {
    resumoItens.replaceChildren();

    let totalUnidades = 0;
    let totalCentavos = 0;
    let itensSelecionados = 0;

    for (const linha of linhasProdutos) {
        const campo = linha.querySelector(".order-quantity");
        const maximo = Number(campo.max);
        const quantidadeInformada = Number(campo.value) || 0;
        const quantidade = Math.max(0, Math.min(Math.floor(quantidadeInformada), maximo));

        if (quantidadeInformada !== quantidade) {
            campo.value = String(quantidade);
        }

        if (quantidade === 0) continue;

        const nome = linha.querySelector(".table-name").textContent;

        const precoCentavos = Math.round(Number(linha.dataset.price) * 100);
        const subtotalCentavos = precoCentavos * quantidade;

        const item = document.createElement("li");
        const nomeItem = document.createElement("span");
        const subtotalItem = document.createElement("span");

        item.className = "order-summary-item";
        nomeItem.className = "order-summary-item-name";
        subtotalItem.className = "order-summary-item-value";
        nomeItem.textContent = `${quantidade} × ${nome}`;

        subtotalItem.textContent = formatadorMoeda.format(subtotalCentavos / 100);
        
        item.append(nomeItem, subtotalItem);
        resumoItens.append(item);

        totalUnidades += quantidade;
        totalCentavos += subtotalCentavos;
        itensSelecionados += 1;
    }

    resumoVazio.hidden = itensSelecionados > 0;
    resumoQuantidade.textContent = String(totalUnidades);
    totalPedido.textContent = formatadorMoeda.format(totalCentavos / 100);
}

for (const campo of quantidades) {
    campo.addEventListener("input", atualizarResumo);
}