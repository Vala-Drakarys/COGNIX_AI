from fastapi import FastAPI
from app.config import settings
from app.agent.agent import build_agent
from app.api.routes import router, configure

app=FastAPI(title=settings.app_name,version="1.0.0")
configure(build_agent())
app.include_router(router)

@app.get("/health")
def health():
    return {"ok":True,"service":settings.app_name}
