from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth import get_current_user
from app.config import settings
from app.conexao import conectar_banco
from app.models.auth import LoginEntrada, SessaoResposta, UsuarioAutenticado
from app.security import criar_sessao, novo_token_csrf, verificar_senha


router = APIRouter(prefix="/auth", tags=["Autenticação"])
INVALID_CREDENTIALS_MESSAGE = "ID ou senha inválidos."


def validar_origem(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in settings.cors_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origem não permitida.",
        )


def usuario_resposta(user: dict) -> UsuarioAutenticado:
    return UsuarioAutenticado(
        id=user["id"],
        nome=user["nome"],
        funcao=user["funcao"],
    )


@router.post(
    "/login",
    response_model=SessaoResposta,
    summary="Iniciar sessão",
    responses={401: {"description": "Credenciais inválidas ou usuário inativo."}},
)
def login(credenciais: LoginEntrada, request: Request, response: Response):
    validar_origem(request)
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                """SELECT u.id, u.nome, u.senha, u.status, f.nome AS funcao
                   FROM Usuario AS u
                   INNER JOIN funcao AS f ON f.id = u.funcao
                   WHERE u.id = %s""",
                (credenciais.id,),
            )
            user = cursor.fetchone()
    except Exception as erro:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível autenticar agora. Tente novamente.",
        ) from erro

    if (
        user is None
        or user["status"].strip().lower() != "ativo"
        or not verificar_senha(
            credenciais.senha.get_secret_value(), user["senha"] if user else ""
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_MESSAGE,
        )

    duration = (
        settings.remembered_session_duration_seconds
        if credenciais.lembrar
        else settings.session_duration_seconds
    )
    csrf_token = novo_token_csrf()
    session_token = criar_sessao(user["id"], csrf_token, duration)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        max_age=duration if credenciais.lembrar else None,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_same_site,
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return SessaoResposta(
        usuario=usuario_resposta(user),
        csrf_token=csrf_token,
    )


@router.get(
    "/me",
    response_model=SessaoResposta,
    summary="Consultar sessão atual",
)
def sessao_atual(user: dict = Depends(get_current_user)):
    return SessaoResposta(
        usuario=usuario_resposta(user),
        csrf_token=user["csrf_token"],
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Encerrar sessão",
)
def logout(
    response: Response,
    _user: dict = Depends(get_current_user),
):
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_same_site,
    )
    response.headers["Cache-Control"] = "no-store"