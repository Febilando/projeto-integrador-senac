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
Para autenticação, defina `AUTH_SESSION_SECRET` com uma chave aleatória de pelo menos
32 caracteres e mantenha `SESSION_COOKIE_SECURE=false` somente no desenvolvimento local.
Em produção, use HTTPS e configure `SESSION_COOKIE_SECURE=true`.

Para parar os serviços, use `Ctrl+C` e depois:

```powershell
docker compose down
```

para encerrar os containers.

## Primeiro administrador

Ao iniciar, a API cria automaticamente um administrador se ainda não
existir nenhum. O ID de login é `100`; defina a senha inicial no `.env`. Solução para contexto acadêmico, sabemos que não é segura.
Acesse <http://localhost:5500/pages/login.html> com ID `100` e a senha configurada.

As rotas de Produtos e Usuários exigem sessão. Leitura de Produtos exige usuário
ativo; criação, edição, reposição e exclusão exigem perfil `admin`. Vendedores
autenticados podem consultar e operar somente os próprios pedidos.


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

a inicialização, a API verifica e aplica automaticamente as alterações do banco sem apagar bancos existentes. Esses scripts são temporários e devem ser removidos ao final do projeto.

## Rotas

- `GET /usuarios`, `GET /usuarios/{id}`, `POST /usuarios`, `PUT /usuarios/{id}` e `DELETE /usuarios/{id}`
- `GET /produtos?busca=<termo>` (busca por código de barras exato ou parte do nome; sem termo, lista todos)
- `GET /produtos/{id}`, `POST /produtos`, `PUT /produtos/{id}` e `DELETE /produtos/{id}`
- `GET /produtos/codigo-barras/{cod_barras}` (busca pelo código de barras)
- `GET /produtos/estoque-baixo?limite=<valor>` (produtos com estoque menor ou igual ao limite; padrão configurável por `LOW_STOCK_LIMIT`)
- `POST /produtos/{id}/reposicao` (soma a quantidade informada ao estoque)
- `GET /pedidos`, `GET /pedidos/{id}`, `POST /pedidos`, `PUT /pedidos/{id}` e `DELETE /pedidos/{id}`

