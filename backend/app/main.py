from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

from app.routers import ai, crypto, funds, fx, health, indices, macro, market, portfolio, screener, stocks, us

load_dotenv()  # backend/.env (GEMINI_API_KEY vb.)

app = FastAPI(title="FinansRehber API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(us.router)
app.include_router(indices.router)
app.include_router(fx.router)
app.include_router(crypto.router)
app.include_router(funds.router)
app.include_router(screener.router)
app.include_router(portfolio.router)
app.include_router(macro.router)
app.include_router(health.router)
app.include_router(ai.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "finansrehber-api", "version": "0.1.0"}
