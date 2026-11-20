# GerenciadorPedidosApi

## Docker

Na pasta `back-end`, crie o arquivo local de configuração e defina senhas próprias nele:

Não se esqueça de definir as váriaveis de ambiente no .env
(Se ainda não tiver um `.env`, utilize como base o `.env.example` e crie um `.env` para de suas senhas)

Inicie a API e o MySQL:
```powershell
docker compose up --build
```

A API fica em <http://localhost:8000>.

Para parar os serviços, use `Ctrl+C` e depois:

```powershell
docker compose down
```

para encerrar os containers.


## Execução local

Crie e ative o ambiente virtual e instale as dependências:

```powershell
cd .\back-end\
```

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Se ainda não tiver um `.env`, utilize como base o `.env.example` e crie um `.env` para de suas senhas.

```powershell
Copy-Item .env.example .env
```

Com o `.env` configurado para utilizar o MySQL, inicie a API localmente:

```powershell
uvicorn main:app --reload
```

A api irá utilizar as variáveis `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_DATABASE` do `.env`.


## Rotas

- `GET /usuarios` e `GET /usuarios/{id}`
- `GET /produtos` e `GET /produtos/{id}`
- `GET /pedidos` e `GET /pedidos/{id}`

