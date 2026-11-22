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
Documentação interativa: <http://localhost:8000/docs>.

O arquivo `.env` também pode configurar `CORS_ORIGINS` (origens separadas por vírgula),
`CORS_ALLOW_CREDENTIALS` e `LOW_STOCK_LIMIT`. O valor padrão de estoque baixo é
centralizado na configuração da aplicação.

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

A API utiliza as configurações de banco do `.env`. Para servir o frontend estático
durante o desenvolvimento, abra outro terminal na pasta `front-end` e execute
`python -m http.server 5500`; essa origem já está permitida pelo CORS padrão.

O script SQL de inicialização cria as tabelas no banco definido em `MYSQL_DATABASE`
pelo Docker Compose. Para aplicar o script manualmente, selecione o banco desejado
ao importar o arquivo `banco de dados/setup_banco.sql`.


## Rotas

- `GET /usuarios`, `GET /usuarios/{id}`, `POST /usuarios`, `PUT /usuarios/{id}` e `DELETE /usuarios/{id}`
- `GET /produtos`, `GET /produtos/{id}`, `POST /produtos`, `PUT /produtos/{id}` e `DELETE /produtos/{id}`
- `GET /produtos/estoque-baixo?limite=<valor>` (produtos com estoque menor ou igual ao limite; padrão configurável por `LOW_STOCK_LIMIT`)
- `POST /produtos/{id}/reposicao` (soma a quantidade informada ao estoque)
- `GET /pedidos`, `GET /pedidos/{id}`, `POST /pedidos`, `PUT /pedidos/{id}` e `DELETE /pedidos/{id}`
