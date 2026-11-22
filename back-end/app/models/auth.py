from pydantic import BaseModel, Field, SecretStr


class LoginEntrada(BaseModel):
    id: int = Field(gt=0, description="ID do usuário cadastrado.")
    senha: SecretStr = Field(min_length=1, max_length=128)
    lembrar: bool = Field(
        default=False,
        description="Mantém a sessão por mais tempo neste navegador.",
    )


class UsuarioAutenticado(BaseModel):
    id: int
    nome: str
    funcao: str


class SessaoResposta(BaseModel):
    usuario: UsuarioAutenticado
    csrf_token: str