
CREATE DATABASE GerenciadorPedidos;
GO


USE GerenciadorPedidos;
GO


CREATE TABLE Usuario (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(150) NOT NULL,
    funcao NVARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL
        CONSTRAINT DF_Usuario_status DEFAULT 'ativo'
);
GO


CREATE TABLE Produto (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(150) NOT NULL,
    estoque INT NOT NULL
        CONSTRAINT CK_Produto_estoque CHECK (estoque >= 0),
    img NVARCHAR(500) NULL
);
GO


CREATE TABLE Pedido (
    id INT IDENTITY(1,1) PRIMARY KEY,
    horario DATETIME2 NOT NULL
        CONSTRAINT DF_Pedido_horario DEFAULT SYSDATETIME(),
    pagamento NVARCHAR(50) NOT NULL,
    compradorId INT NOT NULL,
    vendedorId INT NOT NULL,
    CONSTRAINT FK_Pedido_Comprador FOREIGN KEY (compradorId)
        REFERENCES Usuario(id),
    CONSTRAINT FK_Pedido_Vendedor FOREIGN KEY (vendedorId)
        REFERENCES Usuario(id)
);
GO


CREATE TABLE ProdutosPedido (
    pedidoId INT NOT NULL,
    produtoId INT NOT NULL,
    CONSTRAINT PK_ProdutosPedido PRIMARY KEY (pedidoId, produtoId),
    CONSTRAINT FK_ProdutosPedido_Pedido FOREIGN KEY (pedidoId)
        REFERENCES Pedido(id),
    CONSTRAINT FK_ProdutosPedido_Produto FOREIGN KEY (produtoId)
        REFERENCES Produto(id)
);
GO


CREATE TABLE historico_analise (
    id_analise INT IDENTITY(1,1) PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    resultado_ia VARCHAR(100) NOT NULL,
    data_hora DATETIME DEFAULT GETDATE()
);
GO
