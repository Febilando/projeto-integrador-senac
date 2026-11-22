import hmac

from fastapi import Depends, HTTPException, Request, status

from app.config import settings
from app.conexao import conectar_banco
from app.security import ler_sessao


SAFE_HTTP_METHODS = {"GET", "HEAD", "OPTIONS"}
ADMIN_ROLE = "admin"


def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get(settings.session_cookie_name)
    session = ler_sessao(session_token)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária.",
        )

    if request.method.upper() not in SAFE_HTTP_METHODS:
        csrf_token = request.headers.get("X-CSRF-Token", "")
        if not csrf_token or not hmac.compare_digest(csrf_token, session["csrf"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token CSRF inválido ou ausente.",
            )

    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                """SELECT u.id, u.nome, u.status, f.nome AS funcao
                   FROM Usuario AS u
                   INNER JOIN funcao AS f ON f.id = u.funcao
                   WHERE u.id = %s""",
                (session["sub"],),
            )
            user = cursor.fetchone()
    except Exception as erro:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar a sessão agora.",
        ) from erro

    if user is None or user["status"].strip().lower() != "ativo":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A sessão não é mais válida.",
        )

    return {
        "id": user["id"],
        "nome": user["nome"],
        "funcao": user["funcao"],
        "csrf_token": session["csrf"],
    }


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["funcao"].strip().lower() != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta operação exige perfil administrador.",
        )
    return user