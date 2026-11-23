# Gerenciador de Pedidos
Sistema web para vendas e gerenciamento de pedidos, produtos, estoque e usuários e uma API desenvolvida com FastAPI.

## Grupo 38

- Felipe Xavier Marques
- Henrique Xavier Marques
- João Pedro Costa
- Leonardo Dantas Albano
- Matheus de Castro Souza
- Pedro Braz Leite
- Thiago Malta Magalhães
- Wagner Matos Costa



## Configuração do ambiente

Na pasta back-end, utilize o arquivo .env.example para criar o seu .env:

```powershell
cd .\back-end\
Copy-Item .env.example .env
```

## Primeiro administrador

Ao iniciar, a API cria automaticamente um administrador somente se ainda não
existir nenhum usuário com a função `admin`.

O administrador inicial usa o ID `100`. Acesse
<http://localhost:5500/> e entre com esse ID e o valor definido em
`INITIAL_ADMIN_PASSWORD` no arquivo `.env`.

## Execução com Docker (recomendado)

### Requisitos

- Docker Desktop.
- Portas `5500`, `8000` disponíveis.

### Opção 1: usar um MySQL local

Configure `DB_HOST` e `DB_PORT` no `back-end\.env` para apontar para o MySQL
local. Quando o banco estiver em execução na máquina, use na raiz do repositório:

```powershell
docker compose up --build
```

As variáveis
`MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD`
devem estar configuradas no `back-end\.env`

Nesse modo, a API usa o banco local.

URLs disponíveis:

- Frontend: <http://localhost:5500>
- API: <http://localhost:8000>
- Documentação: <http://localhost:8000/docs>

### Opção 2: usar o MySQL do Docker

Na raiz do repositório, inicie o frontend, a API e o MySQL juntos:

```powershell
docker compose -f docker-compose.yml -f docker-compose.db.yml up --build
```

Nesse modo, o Docker cria o banco MySQL na porta `3306`. As credenciais irão seguir o 
`MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD`,
que devem estar configuradas no `back-end\.env`

URLs disponíveis:

- Frontend: <http://localhost:5500>
- API: <http://localhost:8000>
- Documentação: <http://localhost:8000/docs>

Para encerrar os serviços executados pelo Compose padrão:

```powershell
docker compose down
```

Para encerrar todos os serviços do modo com banco no Docker:

```powershell
docker compose -f docker-compose.yml -f docker-compose.db.yml down
```

## Execução local

### Requisitos

- Python 3.11 ou superior.
- MySQL 8.4 ou superior em execução local.
- Portas `5500`, `8000` disponíveis.

### Preparar o ambiente Python

Na raiz do repositório, crie e ative o ambiente virtual e instale as
dependências:

```powershell
cd .\back-end\
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Configure o banco local no `back-end\.env`, incluindo `DB_HOST=localhost`,
`DB_PORT=3306`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`,
`INITIAL_ADMIN_PASSWORD` e `AUTH_SESSION_SECRET`.

Depois, volte para `back-end` e inicie a API em um terminal:

```powershell
cd .\back-end\
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Em outro terminal, na raiz do repositório, inicie o frontend estático:

```powershell
cd .\front-end\
python -m http.server 5500
```

URLs disponíveis:

- Frontend: <http://localhost:5500>
- API: <http://localhost:8000>
- Documentação: <http://localhost:8000/docs>

Para encerrar a API e o frontend, pressione `Ctrl+C` nos respectivos terminais.

## Permissões

- Apenas administradores acessam o dashboard, o gerenciamento de usuários e as
  operações administrativas de produtos e pedidos.
- Vendedores acessam seus próprios pedidos e podem criar novos pedidos.
- Vendedores podem consultar produtos, mas não podem editá-los ou repor estoque.

## Principais rotas

### Autenticação

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Usuários

- `GET /usuarios`
- `GET /usuarios/funcoes`
- `GET /usuarios/{usuario_id}`
- `POST /usuarios`
- `PUT /usuarios/{usuario_id}`
- `DELETE /usuarios/{usuario_id}`

### Produtos

- `GET /produtos?busca=<termo>`
- `GET /produtos/{produto_id}`
- `GET /produtos/codigo-barras/{cod_barras}`
- `GET /produtos/estoque-baixo?limite=<valor>`
- `POST /produtos`
- `PUT /produtos/{produto_id}`
- `POST /produtos/{produto_id}/reposicao`
- `DELETE /produtos/{produto_id}`

### Pedidos

- `GET /pedidos`
- `GET /pedidos/{pedido_id}`
- `POST /pedidos`
- `PUT /pedidos/{pedido_id}`
- `DELETE /pedidos/{pedido_id}`
