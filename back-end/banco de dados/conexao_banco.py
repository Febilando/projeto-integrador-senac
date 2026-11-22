import pymysql
from pymysql.cursors import DictCursor

from app.config import settings


def obter_conexao():
    return pymysql.connect(
        host=settings.database_host,
        port=settings.database_port,
        user=settings.database_user,
        password=settings.database_password,
        database=settings.database_name,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )
