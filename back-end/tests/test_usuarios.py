import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.routes.usuarios import atualizar_usuario
from app.models.usuario import UsuarioAtualizacao, UsuarioEntrada


class FakeCursor:
    def __init__(self):
        self.query = ""
        self.params = ()
        self.update_call = None

    def execute(self, query, params=()):
        self.query = query
        self.params = params
        if query.lstrip().startswith("UPDATE Usuario"):
            self.update_call = (query, params)

    def fetchone(self):
        if "FROM funcao" in self.query:
            return {"id": 2}
        if self.query.startswith("SELECT id FROM Usuario"):
            return {"id": 10}
        return {
            "id": 10,
            "nome": "Ana Souza",
            "funcao": 2,
            "funcaoNome": "vendedor",
            "status": "ativo",
        }


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return self._cursor


class UsuarioEntradaTests(unittest.TestCase):
    def test_atualizacao_pode_manter_senha_existente(self):
        usuario = UsuarioAtualizacao(
            nome="Ana Souza",
            funcao=2,
            status="ativo",
        )

        self.assertIsNone(usuario.senha)

    def test_atualizacao_valida_senha_informada(self):
        with self.assertRaises(ValidationError):
            UsuarioAtualizacao(
                nome="Ana Souza",
                senha="curta",
                funcao=2,
                status="ativo",
            )

    def test_cadastro_exige_senha(self):
        with self.assertRaises(ValidationError):
            UsuarioEntrada(
                nome="Ana Souza",
                funcao=2,
            )

    def test_atualizacao_sem_senha_preserva_senha_existente(self):
        cursor = FakeCursor()
        usuario = UsuarioAtualizacao(nome="Ana Souza", funcao=2, status="ativo")

        with patch("app.routes.usuarios.conectar_banco", return_value=FakeConnection(cursor)):
            with patch("app.routes.usuarios.hash_senha") as hash_password:
                resultado = atualizar_usuario(10, usuario)

        hash_password.assert_not_called()
        query, params = cursor.update_call
        self.assertIn("SET nome = %s, funcao = %s, status = %s", query)
        self.assertEqual(params, ("Ana Souza", 2, "ativo", 10))
        self.assertEqual(resultado["funcaoNome"], "vendedor")

    def test_atualizacao_com_senha_usa_hash(self):
        cursor = FakeCursor()
        usuario = UsuarioAtualizacao(
            nome="Ana Souza",
            senha="novasenha123",
            funcao=1,
            status="ativo",
        )

        with patch("app.routes.usuarios.conectar_banco", return_value=FakeConnection(cursor)):
            with patch("app.routes.usuarios.hash_senha", return_value="hash-seguro") as hash_password:
                atualizar_usuario(10, usuario)

        hash_password.assert_called_once_with("novasenha123")
        query, params = cursor.update_call
        self.assertIn("senha = %s", query)
        self.assertEqual(params, ("Ana Souza", "hash-seguro", 1, "ativo", 10))
