from fastapi import FastAPI
from app.ml.engine import get_engine
from app.routers import analysis, predict

app = FastAPI(title="Smart Healthcare Assistant AI Service")


@app.get("/health")
def health():
    engine = get_engine()
    return {
        "status": "ok",
        "model": engine.meta.get("model_name") if engine.ready else None,
    }


app.include_router(analysis.router)
app.include_router(predict.router)