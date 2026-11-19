from pydantic import BaseModel, Field


class ProdutoEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    estoque: int = Field(ge=0)
    img: str | None = Field(default=None, max_length=500)
