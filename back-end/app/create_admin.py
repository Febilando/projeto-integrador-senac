from getpass import getpass

from app.conexao import conectar_banco
from app.security import hash_senha


MINIMUM_ADMIN_PASSWORD_LENGTH = 8
MAXIMUM_ADMIN_PASSWORD_LENGTH = 128
ADMIN_ROLE_NAME = "admin"
ACTIVE_USER_STATUS = "ativo"


def main() -> None:
    nome = input("Nome do administrador: ").strip()
    if not nome:
        raise SystemExit("O nome não pode ficar vazio.")

    senha = getpass("Senha do administrador (não será exibida): ")
    confirmacao = getpass("Confirme a senha: ")
    if senha != confirmacao:
        raise SystemExit("As senhas não conferem.")
    if not MINIMUM_ADMIN_PASSWORD_LENGTH <= len(senha) <= MAXIMUM_ADMIN_PASSWORD_LENGTH:
        raise SystemExit(
            "A senha deve ter entre "
            f"{MINIMUM_ADMIN_PASSWORD_LENGTH} e {MAXIMUM_ADMIN_PASSWORD_LENGTH} caracteres."
        )

    with conectar_banco() as conexao:
        cursor = conexao.cursor()
        cursor.execute(
            "SELECT id FROM funcao WHERE nome = %s",
            (ADMIN_ROLE_NAME,),
        )
        role = cursor.fetchone()
        if role is None:
            raise SystemExit("A função de administrador não está cadastrada no banco.")

        cursor.execute(
            "SELECT id FROM Usuario WHERE funcao = %s LIMIT 1",
            (role["id"],),
        )
        if cursor.fetchone() is not None:
            raise SystemExit(
                "Já existe um administrador. Use a gestão de usuários autenticada."
            )

        cursor.execute(
            """INSERT INTO Usuario (nome, senha, funcao, status)
               VALUES (%s, %s, %s, %s)""",
            (nome, hash_senha(senha), role["id"], ACTIVE_USER_STATUS),
        )
        admin_id = cursor.lastrowid

    print(f"Administrador criado com sucesso. ID para login: {admin_id}")


if __name__ == "__main__":
    main()