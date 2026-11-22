from pymysql.err import IntegrityError
from fastapi import APIRouter, HTTPException, Path, Query, Response, status

from app.config import settings
from app.conexao import conectar_banco
from app.models.produto import (
    MAXIMUM_PRODUCT_BARCODE_LENGTH,
    MAXIMUM_PRODUCT_STOCK,
    MINIMUM_PRODUCT_STOCK,
    ProdutoEntrada,
    ProdutoResposta,
    ReposicaoEntrada,
)

router = APIRouter(prefix="/produtos", tags=["Produtos"])


def produto_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "estoque": linha["estoque"],
        "img": linha["img"],
        "cod_barras": linha["cod_barras"],
    }


@router.get(
    "",
    response_model=list[ProdutoResposta],
    summary="Listar produtos",
    description="Retorna os produtos cadastrados em ordem crescente de identificador.",
)
def listar_produtos():
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto ORDER BY id"
            )
            return [produto_dict(linha) for linha in cursor.fetchall()]
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao listar produtos.") from erro


@router.get(
    "/estoque-baixo",
    response_model=list[ProdutoResposta],
    summary="Listar produtos com estoque baixo",
)
def listar_estoque_baixo(
    limite: int = Query(
        default=settings.low_stock_limit,
        ge=MINIMUM_PRODUCT_STOCK,
        description="Estoque máximo para considerar um produto com estoque baixo.",
    ),
):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto "
                "WHERE estoque <= %s ORDER BY estoque, id",
                (limite,),
            )
            return [produto_dict(linha) for linha in cursor.fetchall()]
    except Exception as erro:
        raise HTTPException(
            status_code=500, detail="Erro ao listar produtos com estoque baixo."
        ) from erro


@router.get(
    "/codigo-barras/{cod_barras}",
    response_model=ProdutoResposta,
    summary="Buscar produto pelo código de barras",
    responses={404: {"description": "Produto não encontrado."}},
)
def buscar_produto_por_codigo_barras(
    cod_barras: str = Path(
        min_length=1,
        max_length=MAXIMUM_PRODUCT_BARCODE_LENGTH,
        description="Código de barras exato do produto.",
    ),
):
    codigo = cod_barras.strip()
    if not codigo:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto "
                "WHERE cod_barras = %s",
                (codigo,),
            )
            linha = cursor.fetchone()
            if linha is None:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
            return produto_dict(linha)
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(
            status_code=500, detail="Erro ao buscar produto pelo código de barras."
        ) from erro


@router.get(
    "/{produto_id}",
    response_model=ProdutoResposta,
    summary="Buscar produto",
    responses={404: {"description": "Produto não encontrado."}},
)
def buscar_produto(produto_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto WHERE id = %s",
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


@router.post(
    "",
    response_model=ProdutoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar produto",
)
def criar_produto(produto: ProdutoEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                """INSERT INTO Produto (nome, estoque, img, cod_barras)
                   VALUES (%s, %s, %s, %s)""",
                (produto.nome, produto.estoque, produto.img, produto.cod_barras),
            )
            produto_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto WHERE id = %s",
                (produto_id,),
            )
            return produto_dict(cursor.fetchone())
    except IntegrityError as erro:
        if erro.args and erro.args[0] == 1062:
            raise HTTPException(
                status_code=409, detail="Código de barras já cadastrado."
            ) from erro
        raise HTTPException(status_code=500, detail="Erro ao criar produto.") from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao criar produto.") from erro


@router.put(
    "/{produto_id}",
    response_model=ProdutoResposta,
    summary="Atualizar produto",
    responses={404: {"description": "Produto não encontrado."}},
)
def atualizar_produto(produto_id: int, produto: ProdutoEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT id FROM Produto WHERE id = %s", (produto_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
            cursor.execute(
                """UPDATE Produto
                   SET nome = %s, estoque = %s, img = %s, cod_barras = %s
                   WHERE id = %s""",
                (
                    produto.nome,
                    produto.estoque,
                    produto.img,
                    produto.cod_barras,
                    produto_id,
                ),
            )
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto WHERE id = %s",
                (produto_id,),
            )
            return produto_dict(cursor.fetchone())
    except HTTPException:
        raise
    except IntegrityError as erro:
        if erro.args and erro.args[0] == 1062:
            raise HTTPException(
                status_code=409, detail="Código de barras já cadastrado."
            ) from erro
        raise HTTPException(status_code=500, detail="Erro ao atualizar produto.") from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao atualizar produto.") from erro


@router.delete(
    "/{produto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir produto",
    responses={
        404: {"description": "Produto não encontrado."},
        409: {"description": "Produto associado a pedidos."},
    },
)
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


@router.post(
    "/{produto_id}/reposicao",
    response_model=ProdutoResposta,
    summary="Repor estoque",
    responses={404: {"description": "Produto não encontrado."}},
)
def repor_estoque(produto_id: int, reposicao: ReposicaoEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT estoque FROM Produto WHERE id = %s FOR UPDATE",
                (produto_id,),
            )
            produto = cursor.fetchone()
            if produto is None:
                raise HTTPException(status_code=404, detail="Produto não encontrado.")
            if produto["estoque"] > MAXIMUM_PRODUCT_STOCK - reposicao.quantidade:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="A reposição ultrapassa o limite máximo de estoque.",
                )
            cursor.execute(
                "UPDATE Produto SET estoque = estoque + %s WHERE id = %s",
                (reposicao.quantidade, produto_id),
            )
            cursor.execute(
                "SELECT id, nome, estoque, img, cod_barras FROM Produto WHERE id = %s",
                (produto_id,),
            )
            return produto_dict(cursor.fetchone())
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao repor estoque.") from erro
