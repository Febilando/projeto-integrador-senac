from contextlib import contextmanager
from unittest import TestCase
from unittest.mock import patch

from fastapi import HTTPException

from app.models.pedido import PedidoEntrada
from app.routes import pedidos


class CursorFalso:
    def __init__(self, produtos):
        self.produtos = produtos
        self.resultado = None
        self.resultados = []
        self.lastrowid = 0
        self.pedido_criado = False

    def execute(self, consulta, parametros=()):
        consulta = " ".join(consulta.split())
        if consulta.startswith("SELECT id FROM Usuario"):
            self.resultado = {"id": parametros[0]}
        elif consulta.startswith("SELECT id FROM Produto"):
            self.resultados = [
                {"id": produto_id}
                for produto_id in parametros
                if produto_id in self.produtos
            ]
        elif consulta.startswith("SELECT id, nome, estoque FROM Produto"):
            self.resultados = [
                self.produtos[produto_id]
                for produto_id in sorted(parametros)
                if produto_id in self.produtos
            ]
        elif consulta.startswith("UPDATE Produto SET estoque = estoque -"):
            quantidade, produto_id = parametros
            self.produtos[produto_id]["estoque"] -= quantidade
        elif consulta.startswith("INSERT INTO Pedido"):
            self.pedido_criado = True
            self.lastrowid = 101
        elif consulta.startswith("SELECT id, horario, pagamento, vendedorId FROM Pedido"):
            self.resultado = {
                "id": 101,
                "horario": "2026-11-22 17:00:00",
                "pagamento": "Pix",
                "vendedorId": 7,
            }
        else:
            raise AssertionError(f"Consulta inesperada: {consulta}")

    def fetchone(self):
        return self.resultado

    def fetchall(self):
        return self.resultados

    def executemany(self, consulta, parametros):
        if not consulta.strip().startswith("INSERT INTO ProdutosPedido"):
            raise AssertionError(f"Consulta inesperada: {consulta}")


class ConexaoFalsa:
    def __init__(self, produtos):
        self._cursor = CursorFalso(produtos)
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self._cursor


class PedidosEstoqueTests(TestCase):
    def criar_pedido(self, estoque, quantidade):
        produtos = {31: {"id": 31, "nome": "Caderno", "estoque": estoque}}
        conexao = ConexaoFalsa(produtos)

        @contextmanager
        def conectar_falso():
            try:
                yield conexao
                conexao.committed = True
            except Exception:
                conexao.rolled_back = True
                raise

        pedido = PedidoEntrada(
            pagamento="Pix",
            vendedorId=7,
            produtos=[31],
            quantidades=[quantidade],
        )
        with patch.object(pedidos, "conectar_banco", conectar_falso):
            resposta = pedidos.criar_pedido(
                pedido,
                {"id": 7, "funcao": "vendedor"},
            )
        return resposta, conexao, produtos

    def test_criar_pedido_desconta_quantidade_do_estoque(self):
        resposta, conexao, produtos = self.criar_pedido(estoque=8, quantidade=3)

        self.assertEqual(resposta["quantidades"], [3])
        self.assertEqual(produtos[31]["estoque"], 5)
        self.assertTrue(conexao.committed)
        self.assertFalse(conexao.rolled_back)

    def test_estoque_insuficiente_nao_cria_pedido_nem_desconta(self):
        produtos = {31: {"id": 31, "nome": "Caderno", "estoque": 2}}
        conexao = ConexaoFalsa(produtos)

        @contextmanager
        def conectar_falso():
            try:
                yield conexao
                conexao.committed = True
            except Exception:
                conexao.rolled_back = True
                raise

        pedido = PedidoEntrada(
            pagamento="Pix",
            vendedorId=7,
            produtos=[31],
            quantidades=[3],
        )
        with patch.object(pedidos, "conectar_banco", conectar_falso):
            with self.assertRaises(HTTPException) as erro:
                pedidos.criar_pedido(pedido, {"id": 7, "funcao": "vendedor"})

        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(produtos[31]["estoque"], 2)
        self.assertFalse(conexao._cursor.pedido_criado)
        self.assertTrue(conexao.rolled_back)
