from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.analises import router as analises_router

app = FastAPI(title="GerenciadorPedidos", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analises_router)


@app.get("/")
def raiz():
    return {"mensagem": "GerenciadorPedidos está ativa"}
