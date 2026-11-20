import os

import pymysql
from pymysql.cursors import DictCursor


def obter_conexao():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "gerenciador"),
        password=os.environ["DB_PASSWORD"],
        database=os.getenv("DB_NAME", "GerenciadorPedidos"),
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )
