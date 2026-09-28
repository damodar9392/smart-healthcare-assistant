import os
import secrets

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ml.engine import get_engine
from app.routers import analysis, assistant, metrics, predict

load_dotenv()

app = FastAPI(title="Smart Healthcare Assistant AI Service")

INTERNAL_TOKEN = os.getenv("AI_INTERNAL_TOKEN", "").strip()

if not INTERNAL_TOKEN:
    raise RuntimeError(
        "AI_INTERNAL_TOKEN is not set. The AI service is a private model-serving layer "
        "and must only be reachable by the backend. Set it in ai-service/.env."
    )

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


async def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    if not secrets.compare_digest(x_internal_token, INTERNAL_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid or missing internal token.")


@app.get("/health")
def health():
    engine = get_engine()
    if not engine.ready:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts are not loaded. Run `python -m training.train` first.",
        )
    return {
        "status": "ok",
        "model": engine.meta.get("model_name"),
    }


app.include_router(analysis.router, dependencies=[Depends(require_internal_token)])
app.include_router(predict.router, dependencies=[Depends(require_internal_token)])
app.include_router(assistant.router, dependencies=[Depends(require_internal_token)])
app.include_router(metrics.router, dependencies=[Depends(require_internal_token)])