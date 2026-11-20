from pymysql.err import IntegrityError
from fastapi import APIRouter, HTTPException, Response, status

from app.conexao import conectar_banco
from app.models.produto import ProdutoEntrada

router = APIRouter(prefix="/produtos", tags=["Produtos"])


def produto_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "estoque": linha["estoque"],
        "img": linha["img"],
    }


@router.get("")
def listar_produtos():
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT id, nome, estoque, img FROM Produto ORDER BY id")
            return [produto_dict(linha) for linha in cursor.fetchall()]
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao listar produtos.") from erro


@router.get("/{produto_id}")
def buscar_produto(produto_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, estoque, img FROM Produto WHERE id = %s",
                (produto_id,),
            )
            linha = cursor.fetchone()
            if linha is None:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
            return produto_dict(linha)
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao buscar produto.") from erro


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_produto(produto: ProdutoEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO Produto (nome, estoque, img)
                   VALUES (%s, %s, %s)""",
                (produto.nome, produto.estoque, produto.img),
            )
            produto_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, nome, estoque, img FROM Produto WHERE id = %s",
                (produto_id,),
            )
            return produto_dict(cursor.fetchone())
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao criar produto.") from erro


@router.put("/{produto_id}")
def atualizar_produto(produto_id: int, produto: ProdutoEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT id FROM Produto WHERE id = %s", (produto_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
            cursor.execute(
                """UPDATE Produto
                   SET nome = %s, estoque = %s, img = %s
                   WHERE id = %s""",
                (produto.nome, produto.estoque, produto.img, produto_id),
            )
            cursor.execute(
                "SELECT id, nome, estoque, img FROM Produto WHERE id = %s",
                (produto_id,),
            )
            return produto_dict(cursor.fetchone())
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao atualizar produto.") from erro


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_produto(produto_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("DELETE FROM Produto WHERE id = %s", (produto_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except IntegrityError as erro:
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir um produto associado a pedidos.",
        ) from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao excluir produto.") from erro
