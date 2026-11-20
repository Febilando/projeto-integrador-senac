import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor

ARQUIVO_ENV = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ARQUIVO_ENV)


def obter_conexao():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "gerenciador"),
        password=os.environ["MYSQL_PASSWORD"],
        database=os.getenv("MYSQL_DATABASE", "GerenciadorPedidos"),
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )
