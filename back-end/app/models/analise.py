from pydantic import BaseModel, Field


class AnaliseEntrada(BaseModel):
    nome_arquivo: str = Field(min_length=1, max_length=255)
    resultado_ia: str = Field(min_length=1, max_length=100)
