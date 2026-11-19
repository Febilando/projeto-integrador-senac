import pyodbc
DADOS_CONEXAO = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=localhost;"
    "Database=BancoIAPecas;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)

def obter_conexao():
    return pyodbc.connect(DADOS_CONEXAO)
