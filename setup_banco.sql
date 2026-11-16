
CREATE DATABASE BancoIAPecas;
GO


USE BancoIAPecas;
GO


CREATE TABLE historico_analise (
    id_analise INT IDENTITY(1,1) PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    resultado_ia VARCHAR(100) NOT NULL,
    data_hora DATETIME DEFAULT GETDATE()
);
GO
