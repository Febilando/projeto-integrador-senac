from pydantic import BaseModel, Field


class PedidoEntrada(BaseModel):
    pagamento: str = Field(min_length=1, max_length=50)
    vendedorId: int = Field(gt=0)
    produtos: list[int] = Field(min_length=1)
    quantidades: list[int] | None = Field(
        default=None,
        min_length=1,
        description="Quantidade de cada produto, na mesma ordem de produtos.",
    )
