import base64
import hashlib
import secrets


_ITERACOES_PBKDF2 = 600_000


def hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    derivacao = hashlib.pbkdf2_hmac(
        "sha256",
        senha.encode("utf-8"),
        salt,
        _ITERACOES_PBKDF2,
    )
    salt_codificado = base64.b64encode(salt).decode("ascii")
    derivacao_codificada = base64.b64encode(derivacao).decode("ascii")
    return f"pbkdf2_sha256${_ITERACOES_PBKDF2}${salt_codificado}${derivacao_codificada}"
