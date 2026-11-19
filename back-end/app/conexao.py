import sys
from contextlib import contextmanager
from pathlib import Path


PASTA_BANCO = Path(__file__).resolve().parents[1] / "banco de dados"

if str(PASTA_BANCO) not in sys.path:
    sys.path.insert(0, str(PASTA_BANCO))

from conexao_banco import obter_conexao


@contextmanager
def conectar_banco():
    conexao = obter_conexao()
    try:
        yield conexao
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise
    finally:
        conexao.close()
