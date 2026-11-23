from typing import Optional

from pydantic import BaseModel, Field


class UsuarioEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    senha: str = Field(min_length=8, max_length=128)
    funcao: int = Field(gt=0)
    status: str = Field(default="ativo", min_length=1, max_length=20)


class UsuarioAtualizacao(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    senha: Optional[str] = Field(default=None, min_length=8, max_length=128)
    funcao: int = Field(gt=0)
    status: str = Field(min_length=1, max_length=20)
