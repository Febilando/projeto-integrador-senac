
CREATE TABLE funcao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);


INSERT INTO funcao (nome)
VALUES ('admin'), ('vendedor');


CREATE TABLE Usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    funcao INT NOT NULL,
    status VARCHAR(20) NOT NULL
        DEFAULT 'ativo',
    CONSTRAINT FK_Usuario_funcao FOREIGN KEY (funcao)
        REFERENCES funcao(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE Produto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    estoque INT NOT NULL
        CHECK (estoque >= 0),
    img VARCHAR(500) NULL,
    cod_barras VARCHAR(100) NULL,
    preco DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT UQ_Produto_cod_barras UNIQUE (cod_barras)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE Pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    horario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pagamento VARCHAR(50) NOT NULL,
    vendedorId INT NOT NULL,
    CONSTRAINT FK_Pedido_Vendedor FOREIGN KEY (vendedorId)
        REFERENCES Usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE ProdutosPedido (
    pedidoId INT NOT NULL,
    produtoId INT NOT NULL,
    CONSTRAINT PK_ProdutosPedido PRIMARY KEY (pedidoId, produtoId),
    CONSTRAINT FK_ProdutosPedido_Pedido FOREIGN KEY (pedidoId)
        REFERENCES Pedido(id),
    CONSTRAINT FK_ProdutosPedido_Produto FOREIGN KEY (produtoId)
        REFERENCES Produto(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


