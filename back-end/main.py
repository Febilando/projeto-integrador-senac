from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.pedidos import router as pedidos_router
from app.routes.produtos import router as produtos_router
from app.routes.usuarios import router as usuarios_router

app = FastAPI(title="GerenciadorPedidos", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios_router)
app.include_router(pedidos_router)
app.include_router(produtos_router)


@app.get("/")
def raiz():
    return {"mensagem": "GerenciadorPedidos está ativa"}
