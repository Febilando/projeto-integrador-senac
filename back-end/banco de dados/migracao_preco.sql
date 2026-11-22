-- Para bancos existentes; a migracao automatica tambem aplica esta alteracao.
-- Remover este script ao final do projeto, junto das demais migracoes temporarias.
ALTER TABLE Produto
    ADD COLUMN preco DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
