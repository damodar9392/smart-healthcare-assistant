import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ml.engine import get_engine
from app.routers import analysis, assistant, metrics, predict

load_dotenv()

app = FastAPI(title="Smart Healthcare Assistant AI Service")

origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    engine = get_engine()
    return {
        "status": "ok",
        "model": engine.meta.get("model_name") if engine.ready else None,
    }


app.include_router(analysis.router)
app.include_router(predict.router)
app.include_router(assistant.router)
app.include_router(metrics.router)