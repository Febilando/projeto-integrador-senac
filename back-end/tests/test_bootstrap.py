import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import bootstrap


class FakeCursor:
    def __init__(self, occupied_admin_id=None):
        self.occupied_admin_id = occupied_admin_id
        self.current_query = ""
        self.calls = []

    def execute(self, query, params=()):
        self.current_query = query
        self.calls.append((query, params))

    def fetchone(self):
        if "GET_LOCK" in self.current_query:
            return {"obtido": 1}
        if "INNER JOIN funcao" in self.current_query:
            return None
        if "FROM funcao" in self.current_query:
            return {"id": 2}
        if self.current_query.startswith("SELECT id FROM Usuario"):
            return {"id": self.occupied_admin_id} if self.occupied_admin_id else None
        return None


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True


class BootstrapTests(unittest.TestCase):
    def run_bootstrap(self, occupied_admin_id):
        cursor = FakeCursor(occupied_admin_id)
        connection = FakeConnection(cursor)
        settings = SimpleNamespace(initial_admin_password="senha-inicial-segura")

        with patch.object(bootstrap, "conectar_banco", return_value=connection):
            with patch.object(bootstrap, "settings", settings):
                with patch.object(bootstrap, "hash_senha", return_value="hash-admin"):
                    bootstrap.garantir_administrador_inicial()

        return cursor, connection

    def test_usuario_100_existente_e_atualizado_como_admin_inicial(self):
        cursor, connection = self.run_bootstrap(bootstrap.ADMIN_ID)
        updates = [
            (query, params)
            for query, params in cursor.calls
            if query.lstrip().startswith("UPDATE Usuario")
        ]

        self.assertEqual(len(updates), 1)
        self.assertEqual(
            updates[0][1],
            (
                bootstrap.ADMIN_NAME,
                "hash-admin",
                2,
                bootstrap.ACTIVE_USER_STATUS,
                bootstrap.ADMIN_ID,
            ),
        )
        self.assertFalse(any("INSERT INTO Usuario" in query for query, _ in cursor.calls))
        self.assertTrue(connection.committed)

    def test_admin_inicial_e_criado_com_id_100_quando_id_esta_disponivel(self):
        cursor, connection = self.run_bootstrap(None)
        inserts = [
            (query, params)
            for query, params in cursor.calls
            if query.lstrip().startswith("INSERT INTO Usuario")
        ]

        self.assertEqual(len(inserts), 1)
        self.assertEqual(inserts[0][1][0], bootstrap.ADMIN_ID)
        self.assertFalse(any("UPDATE Usuario" in query for query, _ in cursor.calls))
        self.assertTrue(connection.committed)
