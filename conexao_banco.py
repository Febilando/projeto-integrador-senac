import pyodbc

# Configuração de ligação exata para o seu servidor local
dados_conexao = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=localhost;" 
    "Database=BancoIAPecas;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)

conexao = pyodbc.connect(dados_conexao)
cursor = conexao.cursor()

# Teste de inserção de dados
cursor.execute('''
    INSERT INTO historico_analise (nome_arquivo, resultado_ia) 
    VALUES (?, ?)
''', ('peca_01.jpg', 'Defeito detectado'))

conexao.commit()
conexao.close()
