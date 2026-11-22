from pymysql.err import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import require_admin
from app.conexao import conectar_banco
from app.models.usuario import UsuarioEntrada
from app.security import hash_senha

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuários"],
    dependencies=[Depends(require_admin)],
)


def usuario_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "funcao": linha["funcao"],
        "status": linha["status"],
    }


def validar_funcao(cursor, funcao_id):
    cursor.execute("SELECT id FROM funcao WHERE id = %s", (funcao_id,))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=422, detail="A função informada não existe.")


@router.get("")
def listar_usuarios():
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT id, nome, funcao, status FROM Usuario ORDER BY id")
            return [usuario_dict(linha) for linha in cursor.fetchall()]
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao listar usuários.") from erro


@router.get("/{usuario_id}")
def buscar_usuario(usuario_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute(
                "SELECT id, nome, funcao, status FROM Usuario WHERE id = %s",
                (usuario_id,),
            )
            linha = cursor.fetchone()
            if linha is None:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            return usuario_dict(linha)
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao buscar usuário.") from erro


@router.post("", status_code=status.HTTP_201_CREATED)
def criar_usuario(usuario: UsuarioEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            validar_funcao(cursor, usuario.funcao)
            cursor.execute(
                """INSERT INTO Usuario (nome, senha, funcao, status)
                   VALUES (%s, %s, %s, %s)""",
                (usuario.nome, hash_senha(usuario.senha), usuario.funcao, usuario.status),
            )
            usuario_id = cursor.lastrowid
            cursor.execute(
                "SELECT id, nome, funcao, status FROM Usuario WHERE id = %s",
                (usuario_id,),
            )
            return usuario_dict(cursor.fetchone())
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário.") from erro


@router.put("/{usuario_id}")
def atualizar_usuario(usuario_id: int, usuario: UsuarioEntrada):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            validar_funcao(cursor, usuario.funcao)
            cursor.execute("SELECT id FROM Usuario WHERE id = %s", (usuario_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            cursor.execute(
                """UPDATE Usuario
                   SET nome = %s, senha = %s, funcao = %s, status = %s
                   WHERE id = %s""",
                (usuario.nome, hash_senha(usuario.senha), usuario.funcao, usuario.status, usuario_id),
            )
            cursor.execute(
                "SELECT id, nome, funcao, status FROM Usuario WHERE id = %s",
                (usuario_id,),
            )
            return usuario_dict(cursor.fetchone())
    except HTTPException:
        raise
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário.") from erro


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_usuario(usuario_id: int):
    try:
        with conectar_banco() as conexao:
            cursor = conexao.cursor()
            cursor.execute("DELETE FROM Usuario WHERE id = %s", (usuario_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except IntegrityError as erro:
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir um usuário associado a pedidos.",
        ) from erro
    except Exception as erro:
        raise HTTPException(status_code=500, detail="Erro ao excluir usuário.") from erro
