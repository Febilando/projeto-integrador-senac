import os

import pyodbc


def criar_string_conexao():
    partes = [
        "Driver={ODBC Driver 18 for SQL Server};",
        f"Server={os.getenv('DB_SERVER', 'localhost')};",
        f"Database={os.getenv('DB_NAME', 'GerenciadorPedidos')};",
        "TrustServerCertificate=yes;",
    ]

    usuario = os.getenv("DB_USER")
    senha = os.getenv("DB_PASSWORD")

    if usuario and senha:
        partes.extend([f"UID={usuario};", f"PWD={senha};"])
    else:
        partes.append("Trusted_Connection=yes;")

    return "".join(partes)

def obter_conexao():
    return pyodbc.connect(criar_string_conexao())
