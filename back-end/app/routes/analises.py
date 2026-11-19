import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException

PASTA_BANCO = Path(__file__).resolve().parents[2] / "banco de dados"

if str(PASTA_BANCO) not in sys.path:
    sys.path.insert(0, str(PASTA_BANCO))

from conexao_banco import obter_conexao

from app.models.analise import AnaliseEntrada

router = APIRouter(prefix="/analises", tags=["Análises"])


@router.get("")
def listar_analises():
    try:
        with obter_conexao() as conexao:
            cursor = conexao.cursor()
            cursor.execute("""
                SELECT id_analise, nome_arquivo, resultado_ia, data_hora
                FROM historico_analise
                ORDER BY id_analise DESC
            """)

            return [
                {
                    "id": linha.id_analise,
                    "nome_arquivo": linha.nome_arquivo,
                    "resultado_ia": linha.resultado_ia,
                    "data_hora": linha.data_hora,
                }
                for linha in cursor.fetchall()
            ]
    except Exception as erro:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar análises: {erro}")


@router.post("", status_code=201)
def criar_analise(analise: AnaliseEntrada):
    try:
        with obter_conexao() as conexao:
            cursor = conexao.cursor()
            cursor.execute("""
                INSERT INTO historico_analise (nome_arquivo, resultado_ia)
                OUTPUT INSERTED.id_analise, INSERTED.nome_arquivo,
                       INSERTED.resultado_ia, INSERTED.data_hora
                VALUES (?, ?)
            """, analise.nome_arquivo, analise.resultado_ia)

            linha = cursor.fetchone()
            conexao.commit()

            return {
                "id": linha.id_analise,
                "nome_arquivo": linha.nome_arquivo,
                "resultado_ia": linha.resultado_ia,
                "data_hora": linha.data_hora,
            }
    except Exception as erro:
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar análise: {erro}")
