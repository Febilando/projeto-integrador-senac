import pyodbc
from fastapi import APIRouter, HTTPException, Response, status

from app.conexao import conectar_banco
from app.models.pedido import PedidoEntrada

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def pedido_dict(linha, produtos):
    return {
        "id": linha.id,
        "horario": linha.horario,
        "pagamento": linha.pagamento,
        "vendedorId": linha.vendedorId,
        "produtos": produtos,
    }


def validar_produtos(produtos):
    if len(set(produtos)) != len(produtos):
        raise HTTPException(status_code=422, detail="A lista de produtos contém IDs repetidos.")


def buscar_pedidos(cursor, pedido_id=None):
    consulta = """SELECT p.id, p.horario, p.pagamento, p.vendedorId, pp.produtoId
                  FROM Pedido AS p
                  LEFT JOIN ProdutosPedido AS pp ON pp.pedidoId = p.id"""
    parametros = ()
    if pedido_id is not None:
        consulta += " WHERE p.id = ?"
        parametros = (pedido_id,)
    consulta += " ORDER BY p.id DESC, pp.produtoId"
    cursor.execute(consulta, *parametros)

    pedidos = {}
    for linha in cursor.fetchall():
        if linha.id not in pedidos:
            pedidos[linha.id] = pedido_dict(linha, [])
        if linha.produtoId is not None:
            pedidos[linha.id]["produtos"].append(linha.produtoId)
    return list(pedidos.values())


def validar_referencias(cursor, pedido):
    cursor.execute("SELECT id FROM Usuario WHERE id = ?", pedido.vendedorId)
    if cursor.fetchone() is None:
        raise HTTPException(status_code=422, detail="O vendedor informado não existe.")

    placeholders = ", ".join("?" for _ in pedido.produtos)
    cursor.execute(
        f"SELECT id FROM Produto WHERE id IN ({placeholders})",
        *pedido.produtos,
    )
    encontrados = {linha.id for linha in cursor.fetchall()}
    if encontrados != set(pedido.produtos):
        raise HTTPException(status_code=422, detail="Um ou mais produtos não existem.")


def inserir_produtos(cursor, pedido_id, produtos):
    cursor.executemany(
        "INSERT INTO ProdutosPedido (pedidoId, produtoId) VALUES (?, ?)",
        [(pedido_id, produto_id) for produto_id in produtos],
    )


@router.get("")
def listar_pedidos():
    try:
        with conectar_banco() as conexao:
            return buscar_pedidos(conexao.cursor())
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao listar pedidos.") from erro


@router.get("/{pedido_id}")
def buscar_pedido(pedido_id: int):
    try:
        with conectar_banco() as conexao:
            pedidos = buscar_pedidos(conexao.cursor(), pedido_id)
            if not pedidos:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")
            return pedidos[0]
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao buscar pedido.") from erro


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_pedido(pedido: PedidoEntrada):
    validar_produtos(pedido.produtos)
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            validar_referencias(cursor, pedido)
            cursor.execute(
                """INSERT INTO Pedido (pagamento, vendedorId)
                   OUTPUT INSERTED.id, INSERTED.horario, INSERTED.pagamento, INSERTED.vendedorId
                   VALUES (?, ?)""",
                pedido.pagamento,
                pedido.vendedorId,
            )
            linha = cursor.fetchone()
            inserir_produtos(cursor, linha.id, pedido.produtos)
            return pedido_dict(linha, pedido.produtos)
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao criar pedido.") from erro


@router.put("/{pedido_id}")
def atualizar_pedido(pedido_id: int, pedido: PedidoEntrada):
    validar_produtos(pedido.produtos)
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            validar_referencias(cursor, pedido)
            cursor.execute("SELECT id FROM Pedido WHERE id = ?", pedido_id)
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")

            cursor.execute(
                """UPDATE Pedido SET pagamento = ?, vendedorId = ?
                   WHERE id = ?""",
                pedido.pagamento,
                pedido.vendedorId,
                pedido_id,
            )
            cursor.execute("DELETE FROM ProdutosPedido WHERE pedidoId = ?", pedido_id)
            inserir_produtos(cursor, pedido_id, pedido.produtos)
            pedidos = buscar_pedidos(cursor, pedido_id)
            return pedidos[0]
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao atualizar pedido.") from erro


@router.delete("/{pedido_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_pedido(pedido_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("DELETE FROM ProdutosPedido WHERE pedidoId = ?", pedido_id)
            cursor.execute("DELETE FROM Pedido WHERE id = ?", pedido_id)
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except pyodbc.IntegrityError as erro:
        raise HTTPException(status_code=409, detail="Não foi possível excluir o pedido.") from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao excluir pedido.") from erro
