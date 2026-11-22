from app.conexao import conectar_banco


NOME_LOCK_MIGRACOES = "gerenciador-pedidos-migracoes"
TEMPO_ESPERA_LOCK_SEGUNDOS = 30


def executar_migracoes():
    # Atualiza bancos existentes sem apagá-los nem perder os dados cadastrados.
    with conectar_banco() as conexao:
        cursor = conexao.cursor()
        cursor.execute(
            "SELECT GET_LOCK(%s, %s) AS obtido",
            (NOME_LOCK_MIGRACOES, TEMPO_ESPERA_LOCK_SEGUNDOS),
        )
        if cursor.fetchone()["obtido"] != 1:
            raise RuntimeError("Não foi possível obter o lock para as migrações.")

        try:
            cursor.execute(
                """SELECT COUNT(*) AS quantidade
                   FROM information_schema.columns
                   WHERE table_schema = DATABASE()
                     AND table_name = 'Produto'
                     AND column_name = 'cod_barras'"""
            )
            if cursor.fetchone()["quantidade"] == 0:
                cursor.execute(
                    "ALTER TABLE Produto ADD COLUMN cod_barras VARCHAR(100) NULL"
                )

            cursor.execute(
                """SELECT COUNT(*) AS quantidade
                   FROM information_schema.statistics
                   WHERE table_schema = DATABASE()
                     AND table_name = 'Produto'
                     AND index_name = 'UQ_Produto_cod_barras'"""
            )
            if cursor.fetchone()["quantidade"] == 0:
                cursor.execute(
                    """ALTER TABLE Produto
                       ADD CONSTRAINT UQ_Produto_cod_barras UNIQUE (cod_barras)"""
                )

            cursor.execute(
                """SELECT COUNT(*) AS quantidade
                   FROM information_schema.columns
                   WHERE table_schema = DATABASE()
                     AND table_name = 'Produto'
                     AND column_name = 'preco'"""
            )
            if cursor.fetchone()["quantidade"] == 0:
                cursor.execute(
                    """ALTER TABLE Produto
                       ADD COLUMN preco DECIMAL(10, 2) NOT NULL DEFAULT 0.00"""
                )

            cursor.execute(
                """SELECT COUNT(*) AS quantidade
                   FROM information_schema.columns
                   WHERE table_schema = DATABASE()
                     AND table_name = 'ProdutosPedido'
                     AND column_name = 'quantidade'"""
            )
            if cursor.fetchone()["quantidade"] == 0:
                cursor.execute(
                    """ALTER TABLE ProdutosPedido
                       ADD COLUMN quantidade INT NOT NULL DEFAULT 1"""
                )
        finally:
            cursor.execute("SELECT RELEASE_LOCK(%s)", (NOME_LOCK_MIGRACOES,))
