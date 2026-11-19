# GerenciadorPedidosApi

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

