from app.config import settings
from app.conexao import conectar_banco
from app.security import hash_senha


ADMIN_ID = 100
ADMIN_NAME = "admin"
ADMIN_ROLE_NAME = "admin"
ACTIVE_USER_STATUS = "ativo"
MINIMUM_ADMIN_PASSWORD_LENGTH = 8
MAXIMUM_ADMIN_PASSWORD_LENGTH = 128
ADMIN_BOOTSTRAP_LOCK = "gerenciador-pedidos-admin-bootstrap"


def garantir_administrador_inicial():
    with conectar_banco() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT GET_LOCK(%s, %s) AS obtido", (ADMIN_BOOTSTRAP_LOCK, 30))
        if cursor.fetchone()["obtido"] != 1:
            raise RuntimeError("Não foi possível obter o lock para criar o administrador.")

        try:
            cursor.execute(
                """SELECT u.id
                   FROM Usuario AS u
                   INNER JOIN funcao AS f ON f.id = u.funcao
                   WHERE f.nome = %s
                   LIMIT 1""",
                (ADMIN_ROLE_NAME,),
            )
            if cursor.fetchone() is not None:
                return

            senha = settings.initial_admin_password
            if not (
                MINIMUM_ADMIN_PASSWORD_LENGTH
                <= len(senha)
                <= MAXIMUM_ADMIN_PASSWORD_LENGTH
            ):
                raise RuntimeError(
                    "Defina INITIAL_ADMIN_PASSWORD com uma senha entre "
                    f"{MINIMUM_ADMIN_PASSWORD_LENGTH} e "
                    f"{MAXIMUM_ADMIN_PASSWORD_LENGTH} caracteres para criar o administrador."
                )

            cursor.execute("SELECT id FROM funcao WHERE nome = %s", (ADMIN_ROLE_NAME,))
            funcao = cursor.fetchone()
            if funcao is None:
                raise RuntimeError("A função admin não está cadastrada no banco.")

            cursor.execute("SELECT id FROM Usuario WHERE id = %s", (ADMIN_ID,))
            if cursor.fetchone() is not None:
                raise RuntimeError(
                    "Não foi possível criar o administrador: o ID 100 já está ocupado."
                )

            cursor.execute(
                """INSERT INTO Usuario (id, nome, senha, funcao, status)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    ADMIN_ID,
                    ADMIN_NAME,
                    hash_senha(senha),
                    funcao["id"],
                    ACTIVE_USER_STATUS,
                ),
            )
            # O próximo processo só deve obter o lock depois de o admin estar visível.
            conexao.commit()
        finally:
            cursor.execute("SELECT RELEASE_LOCK(%s)", (ADMIN_BOOTSTRAP_LOCK,))
