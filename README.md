# Gerenciador de Pedidos

## Grupo 38:
* Felipe Xavier Marques 
* Henrique Xavier Marques 
* João Pedro Costa
* Leonardo Dantas Albano 
* Matheus de Castro Souza 
* Pedro Braz Leite 
* Thiago Malta Magalhães 
* Wagner Matos Costa


### Importante:

Na pasta `back-end`, crie o arquivo local de configuração e defina senhas próprias nele:

Defina as váriaveis de ambiente no .env

(Se ainda não tiver um `.env`, utilize como base o `.env.example` e crie um `.env`)


## Primeiro administrador

Ao iniciar, a API cria automaticamente um administrador se ainda não
existir nenhum. 

O ID de login é `100`; defina a senha inicial no `.env` (é uma solução para esse contexto acadêmico, sabemos que não é segura)

Acesse <http://localhost:5500/> com ID `100` e a senha configurada.


## Execução com Docker
Na raiz do repositório, inicie o frontend, a API e o MySQL pelo comando:

```powershell
docker compose up --build
```

Frontend: <http://localhost:5500>.

API: <http://localhost:8000>.

Documentação interativa: <http://localhost:8000/docs>.

Para parar o container, pressione `Ctrl+C` para parar a execução e em seguida, a partir da raiz do repositório digite:

```powershell
docker compose down
```

para encerrar os containers.


## Execução local

#### Requisitos para execução local
- Python 3.11 ou superior.
- MySQL 8.4 ou superior localmente, ou Docker para iniciar o banco do projeto.
- Navegador moderno com suporte a JavaScript.
- Portas `5500` e `8000` disponíveis.


### Preparar o backend

A partir da raiz do repositório, crie o ambiente virtual e instale
as dependências:

```powershell
cd .\back-end\
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Defina as váriaveis de ambiente no .env
(Se ainda não tiver um `.env`, utilize como base o `.env.example` e crie um `.env` para de suas senhas)

#### Iniciar o MySQL

Se não tiver um MySQL local já configurado com as credenciais do `.env`, abra
um terminal na raiz do repositório e inicie somente o banco pelo Docker Compose:

```powershell
docker compose up -d db
```

O serviço usa `back-end\.env` e inicializa o banco com o script SQL do projeto.

Se já houver um MySQL em execução, pule este passo e confirme que o `.env` contém as credenciais correspondentes.

### Iniciar a API e o frontend

Em um terminal, na pasta `back-end`, ative o ambiente virtual e inicie a API:

```powershell
cd .\back-end\
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Em outro terminal, na raiz do repositório, inicie o servidor estático:

```powershell
cd .\front-end\
python -m http.server 5500
```

Frontend: <http://localhost:5500>.
API: <http://localhost:8000>.
Documentação interativa: <http://localhost:8000/docs>.

Para encerrar, use `Ctrl+C` nos terminais da API e do frontend.

Se iniciou o
MySQL pelo Compose, pare o banco a partir da raiz do projeto:

```powershell
docker compose stop db
```

### Permissões
O dashboard, lista completa de pedidos e produtos (incluindo edição e reposição) só podem ser acessados por administradores.

Vendedores tem acesso a seus próprios pedidos, lista de produtos (sem edição) e página de novo pedido.


## Rotas

- `GET /usuarios`, `GET /usuarios/{id}`, `POST /usuarios`, `PUT /usuarios/{id}` e `DELETE /usuarios/{id}`
- `GET /produtos?busca=<termo>` (busca por código de barras exato ou parte do nome; sem termo, lista todos)
- `GET /produtos/{id}`, `POST /produtos`, `PUT /produtos/{id}` e `DELETE /produtos/{id}`
- `GET /produtos/codigo-barras/{cod_barras}` (busca pelo código de barras)
- `GET /produtos/estoque-baixo?limite=<valor>` (produtos com estoque menor ou igual ao limite; padrão configurável por `LOW_STOCK_LIMIT`)
- `POST /produtos/{id}/reposicao` (soma a quantidade informada ao estoque)
- `GET /pedidos`, `GET /pedidos/{id}`, `POST /pedidos`, `PUT /pedidos/{id}` e `DELETE /pedidos/{id}`

