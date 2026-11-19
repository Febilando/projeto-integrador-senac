# GerenciadorPedidosApi

## Docker
A melhor forma de iniciar a api é com o Docker, evita configurações adicionais com o sql, dependências, etc:

## Passo a passo:
Com o Docker Desktop em execução, construa a imagem na pasta `back-end` com esse comando:
```powershell
docker build -t gerenciador-pedidos-api .
```
Em seguida, execute o container com esse comando:
```powershell
docker run --rm -p 8000:8000 `
	-e "DB_SERVER=1433" `
	-e "DB_NAME=GerenciadorPedidos" `
	-e "DB_USER=usuario" `
	-e "DB_PASSWORD=senha" `
	gerenciador-pedidos-api
```

O SQL Server precisa aceitar conexões TCP/IP e autenticação SQL. A API fica disponível em <http://localhost:8000> e a documentação em <http://localhost:8000/docs>.

## Instalação
```powershell
cd back-end
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Execução
```powershell
uvicorn main:app --reload
```
Documentação: <http://127.0.0.1:8000/docs>

## Rotas iniciais
- `GET /`
- `GET /analises`
- `POST /analises`

