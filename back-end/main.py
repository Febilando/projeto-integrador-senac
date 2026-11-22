from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import garantir_administrador_inicial
from app.config import settings
from app.routes.auth import router as auth_router
from app.routes.pedidos import router as pedidos_router
from app.routes.produtos import router as produtos_router
from app.routes.usuarios import router as usuarios_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    garantir_administrador_inicial()
    yield


app = FastAPI(
    title="GerenciadorPedidos",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

if len(settings.auth_session_secret.encode("utf-8")) < 32:
    raise RuntimeError(
        "Configure AUTH_SESSION_SECRET com ao menos 32 caracteres aleatórios."
    )
if settings.session_cookie_same_site not in {"lax", "strict", "none"}:
    raise RuntimeError("SESSION_COOKIE_SAME_SITE deve ser lax, strict ou none.")
if settings.session_cookie_same_site == "none" and not settings.session_cookie_secure:
    raise RuntimeError("Cookies SameSite=None exigem SESSION_COOKIE_SECURE=true.")

app.include_router(usuarios_router)
app.include_router(pedidos_router)
app.include_router(produtos_router)
app.include_router(auth_router)


@app.get("/")
def raiz():
    return {"mensagem": "GerenciadorPedidos está ativa"}
