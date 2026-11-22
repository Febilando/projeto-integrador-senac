import base64
import hashlib
import hmac
import json
import secrets
import time

from app.config import settings


_ITERACOES_PBKDF2 = 600_000
_ALGORITMO_SENHA = "pbkdf2_sha256"
_TAMANHO_MINIMO_SEGREDO_SESSAO = 32
_ITERACOES_PBKDF2_MAXIMAS_ACEITAS = 1_000_000


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
    return f"{_ALGORITMO_SENHA}${_ITERACOES_PBKDF2}${salt_codificado}${derivacao_codificada}"


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    try:
        algoritmo, iteracoes_texto, salt_texto, derivacao_texto = hash_armazenado.split("$")
        iteracoes = int(iteracoes_texto)
        if (
            algoritmo != _ALGORITMO_SENHA
            or iteracoes < 1
            or iteracoes > _ITERACOES_PBKDF2_MAXIMAS_ACEITAS
        ):
            return False

        salt = base64.b64decode(salt_texto, validate=True)
        derivacao_esperada = base64.b64decode(derivacao_texto, validate=True)
        derivacao_recebida = hashlib.pbkdf2_hmac(
            "sha256",
            senha.encode("utf-8"),
            salt,
            iteracoes,
        )
        return hmac.compare_digest(derivacao_recebida, derivacao_esperada)
    except (AttributeError, ValueError, TypeError):
        return False


def _session_secret() -> bytes:
    secret = settings.auth_session_secret.encode("utf-8")
    if len(secret) < _TAMANHO_MINIMO_SEGREDO_SESSAO:
        raise RuntimeError(
            "AUTH_SESSION_SECRET deve ter pelo menos 32 caracteres aleatórios."
        )
    return secret


def criar_sessao(usuario_id: int, csrf_token: str, duracao_segundos: int) -> str:
    payload = json.dumps(
        {
            "sub": usuario_id,
            "exp": int(time.time()) + duracao_segundos,
            "csrf": csrf_token,
        },
        separators=(",", ":"),
    ).encode("utf-8")
    payload_codificado = base64.urlsafe_b64encode(payload).rstrip(b"=")
    assinatura = hmac.new(
        _session_secret(), payload_codificado, hashlib.sha256
    ).digest()
    assinatura_codificada = base64.urlsafe_b64encode(assinatura).rstrip(b"=")
    return f"{payload_codificado.decode('ascii')}.{assinatura_codificada.decode('ascii')}"


def ler_sessao(token: str | None) -> dict | None:
    if not token:
        return None

    try:
        payload_codificado_texto, assinatura_codificada_texto = token.split(".", 1)
        payload_codificado = payload_codificado_texto.encode("ascii")
        assinatura_recebida = base64.urlsafe_b64decode(
            assinatura_codificada_texto + "=" * (-len(assinatura_codificada_texto) % 4)
        )
        assinatura_esperada = hmac.new(
            _session_secret(), payload_codificado, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(assinatura_recebida, assinatura_esperada):
            return None

        payload = base64.urlsafe_b64decode(
            payload_codificado_texto + "=" * (-len(payload_codificado_texto) % 4)
        )
        sessao = json.loads(payload)
        if (
            not isinstance(sessao.get("sub"), int)
            or not isinstance(sessao.get("exp"), int)
            or sessao["exp"] <= int(time.time())
            or not isinstance(sessao.get("csrf"), str)
        ):
            return None
        return sessao
    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        return None


def novo_token_csrf() -> str:
    return secrets.token_urlsafe(32)
