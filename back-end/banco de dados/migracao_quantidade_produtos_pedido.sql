-- Atualiza bancos existentes sem apagar os pedidos ja cadastrados.
-- Remover este script ao final do projeto, junto das demais migracoes temporarias.
ALTER TABLE ProdutosPedido
    ADD COLUMN quantidade INT NOT NULL DEFAULT 1;
