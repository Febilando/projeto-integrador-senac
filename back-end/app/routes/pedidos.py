from pymysql.err import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import ADMIN_ROLE, get_current_user
from app.conexao import conectar_banco
from app.models.pedido import PedidoEntrada

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])
MAXIMUM_ORDER_ITEM_QUANTITY = 2_147_483_647


def pedido_dict(linha, produtos, quantidades):
    return {
        "id": linha["id"],
        "horario": linha["horario"],
        "pagamento": linha["pagamento"],
        "vendedorId": linha["vendedorId"],
        "produtos": produtos,
        "quantidades": quantidades,
    }


def validar_produtos(produtos):
    if len(set(produtos)) != len(produtos):
        raise HTTPException(status_code=422, detail="A lista de produtos contém IDs repetidos.")


def validar_quantidades(pedido):
    if pedido.quantidades is None:
        return [1] * len(pedido.produtos)
    if len(pedido.quantidades) != len(pedido.produtos):
        raise HTTPException(
            status_code=422,
            detail="Informe uma quantidade para cada produto.",
        )
    if any(
        quantidade < 1 or quantidade > MAXIMUM_ORDER_ITEM_QUANTITY
        for quantidade in pedido.quantidades
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Cada quantidade deve ser um inteiro entre 1 e "
                f"{MAXIMUM_ORDER_ITEM_QUANTITY}."
            ),
        )
    return pedido.quantidades


def buscar_pedidos(cursor, pedido_id=None, vendedor_id=None):
    consulta = """SELECT p.id, p.horario, p.pagamento, p.vendedorId,
                         pp.produtoId, pp.quantidade
                  FROM Pedido AS p
                  LEFT JOIN ProdutosPedido AS pp ON pp.pedidoId = p.id"""
    filtros = []
    parametros = []
    if pedido_id is not None:
        filtros.append("p.id = %s")
        parametros.append(pedido_id)
    if vendedor_id is not None:
        filtros.append("p.vendedorId = %s")
        parametros.append(vendedor_id)
    if filtros:
        consulta += " WHERE " + " AND ".join(filtros)
    consulta += " ORDER BY p.id DESC, pp.produtoId"
    cursor.execute(consulta, tuple(parametros))

    pedidos = {}
    for linha in cursor.fetchall():
        if linha["id"] not in pedidos:
            pedidos[linha["id"]] = pedido_dict(linha, [], [])
        if linha["produtoId"] is not None:
            pedidos[linha["id"]]["produtos"].append(linha["produtoId"])
            pedidos[linha["id"]]["quantidades"].append(linha["quantidade"])
    return list(pedidos.values())


def validar_referencias(cursor, pedido):
    cursor.execute("SELECT id FROM Usuario WHERE id = %s", (pedido.vendedorId,))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=422, detail="O vendedor informado não existe.")

    placeholders = ", ".join("%s" for _ in pedido.produtos)
    cursor.execute(
        f"SELECT id FROM Produto WHERE id IN ({placeholders})",
        tuple(pedido.produtos),
    )
    encontrados = {linha["id"] for linha in cursor.fetchall()}
    if encontrados != set(pedido.produtos):
        raise HTTPException(status_code=422, detail="Um ou mais produtos não existem.")


def descontar_estoque(cursor, produtos, quantidades):
    placeholders = ", ".join("%s" for _ in produtos)
    cursor.execute(
        f"""SELECT id, nome, estoque FROM Produto
            WHERE id IN ({placeholders}) ORDER BY id FOR UPDATE""",
        tuple(produtos),
    )
    produtos_encontrados = {
        produto["id"]: produto for produto in cursor.fetchall()
    }
    if produtos_encontrados.keys() != set(produtos):
        raise HTTPException(status_code=422, detail="Um ou mais produtos não existem.")

    for produto_id, quantidade in zip(produtos, quantidades):
        produto = produtos_encontrados[produto_id]
        if produto["estoque"] < quantidade:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Estoque insuficiente para o produto '{produto['nome']}'. "
                    f"Disponível: {produto['estoque']}; solicitado: {quantidade}."
                ),
            )

    for produto_id, quantidade in zip(produtos, quantidades):
        cursor.execute(
            "UPDATE Produto SET estoque = estoque - %s WHERE id = %s",
            (quantidade, produto_id),
        )


def inserir_produtos(cursor, pedido_id, produtos, quantidades):
    cursor.executemany(
        """INSERT INTO ProdutosPedido (pedidoId, produtoId, quantidade)
           VALUES (%s, %s, %s)""",
        [
            (pedido_id, produto_id, quantidade)
            for produto_id, quantidade in zip(produtos, quantidades)
        ],
    )


def validar_acesso_vendedor(user, vendedor_id):
    if user["funcao"].strip().lower() != ADMIN_ROLE and user["id"] != vendedor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendedores só podem operar pedidos próprios.",
        )


@router.get("")
def listar_pedidos(user: dict = Depends(get_current_user)):
    try:
        with conectar_banco() as conexao:
            vendedor_id = (
                None
                if user["funcao"].strip().lower() == ADMIN_ROLE
                else user["id"]
            )
            return buscar_pedidos(conexao.cursor(), vendedor_id=vendedor_id)
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao listar pedidos.") from erro


@router.get("/{pedido_id}")
def buscar_pedido(pedido_id: int, user: dict = Depends(get_current_user)):
    try:
        with conectar_banco() as conexao:
            vendedor_id = (
                None
                if user["funcao"].strip().lower() == ADMIN_ROLE
                else user["id"]
            )
            pedidos = buscar_pedidos(
                conexao.cursor(), pedido_id, vendedor_id=vendedor_id
            )
            if not pedidos:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")
            return pedidos[0]
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao buscar pedido.") from erro


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_pedido(
    pedido: PedidoEntrada,
    user: dict = Depends(get_current_user),
):
    validar_acesso_vendedor(user, pedido.vendedorId)
    validar_produtos(pedido.produtos)
    quantidades = validar_quantidades(pedido)
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            validar_referencias(cursor, pedido)
            descontar_estoque(cursor, pedido.produtos, quantidades)
            cursor.execute(
                "INSERT INTO Pedido (pagamento, vendedorId) VALUES (%s, %s)",
                (pedido.pagamento, pedido.vendedorId),
            )
            pedido_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, horario, pagamento, vendedorId FROM Pedido WHERE id = %s",
                (pedido_id,),
            )
            linha = cursor.fetchone()
            inserir_produtos(cursor, pedido_id, pedido.produtos, quantidades)
            return pedido_dict(linha, pedido.produtos, quantidades)
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao criar pedido.") from erro


@router.put("/{pedido_id}")
def atualizar_pedido(
    pedido_id: int,
    pedido: PedidoEntrada,
    user: dict = Depends(get_current_user),
):
    validar_acesso_vendedor(user, pedido.vendedorId)
    validar_produtos(pedido.produtos)
    quantidades = validar_quantidades(pedido)
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, vendedorId FROM Pedido WHERE id = %s", (pedido_id,)
            )
            pedido_atual = cursor.fetchone()
            if pedido_atual is None:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")
            validar_acesso_vendedor(user, pedido_atual["vendedorId"])
            validar_referencias(cursor, pedido)

            cursor.execute(
                "UPDATE Pedido SET pagamento = %s, vendedorId = %s WHERE id = %s",
                (pedido.pagamento, pedido.vendedorId, pedido_id),
            )
            cursor.execute("DELETE FROM ProdutosPedido WHERE pedidoId = %s", (pedido_id,))
            inserir_produtos(cursor, pedido_id, pedido.produtos, quantidades)
            pedidos = buscar_pedidos(cursor, pedido_id)
            return pedidos[0]
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao atualizar pedido.") from erro


@router.delete("/{pedido_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_pedido(pedido_id: int, user: dict = Depends(get_current_user)):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT vendedorId FROM Pedido WHERE id = %s", (pedido_id,)
            )
            pedido_atual = cursor.fetchone()
            if pedido_atual is None:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")
            validar_acesso_vendedor(user, pedido_atual["vendedorId"])
            cursor.execute("DELETE FROM ProdutosPedido WHERE pedidoId = %s", (pedido_id,))
            cursor.execute("DELETE FROM Pedido WHERE id = %s", (pedido_id,))
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except IntegrityError as erro:
        raise HTTPException(status_code=409, detail="Não foi possível excluir o pedido.") from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao excluir pedido.") from erro
