ALTER TABLE Produto
    ADD COLUMN cod_barras VARCHAR(100) NULL,
    ADD CONSTRAINT UQ_Produto_cod_barras UNIQUE (cod_barras);
