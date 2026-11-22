from pydantic import BaseModel, Field, field_validator

MINIMUM_PRODUCT_NAME_LENGTH = 1
MINIMUM_PRODUCT_STOCK = 0
MINIMUM_RESTOCK_QUANTITY = 1
MAXIMUM_PRODUCT_STOCK = 2_147_483_647
MAXIMUM_PRODUCT_NAME_LENGTH = 150
MAXIMUM_PRODUCT_IMAGE_LENGTH = 500
MAXIMUM_PRODUCT_BARCODE_LENGTH = 100


class ProdutoEntrada(BaseModel):
    nome: str = Field(
        min_length=MINIMUM_PRODUCT_NAME_LENGTH,
        max_length=MAXIMUM_PRODUCT_NAME_LENGTH,
        description="Nome do produto.",
        examples=["Caderno universitário"],
    )
    estoque: int = Field(
        ge=MINIMUM_PRODUCT_STOCK,
        le=MAXIMUM_PRODUCT_STOCK,
        description="Quantidade atual em estoque.",
        examples=[25],
    )
    img: str | None = Field(
        default=None,
        max_length=MAXIMUM_PRODUCT_IMAGE_LENGTH,
        description="URL ou caminho da imagem do produto.",
        examples=["/assets/caderno.jpg"],
    )
    cod_barras: str | None = Field(
        default=None,
        min_length=1,
        max_length=MAXIMUM_PRODUCT_BARCODE_LENGTH,
        description="Código de barras usado para localizar o produto.",
        examples=["7891234567890"],
    )

    @field_validator("nome", mode="before")
    @classmethod
    def normalizar_nome(cls, valor):
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("cod_barras", mode="before")
    @classmethod
    def normalizar_codigo_barras(cls, valor):
        if not isinstance(valor, str):
            return valor
        codigo = valor.strip()
        return codigo or None


class ProdutoResposta(BaseModel):
    id: int = Field(description="Identificador único do produto.")
    nome: str = Field(description="Nome do produto.")
    estoque: int = Field(description="Quantidade atual em estoque.")
    img: str | None = Field(
        default=None,
        description="URL ou caminho da imagem do produto.",
    )
    cod_barras: str | None = Field(
        default=None,
        description="Código de barras do produto.",
    )


class ReposicaoEntrada(BaseModel):
    quantidade: int = Field(
        ge=MINIMUM_RESTOCK_QUANTITY,
        le=MAXIMUM_PRODUCT_STOCK,
        description="Quantidade positiva a adicionar ao estoque.",
        examples=[5],
    )
