from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Arco FastAPI App")

@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return """<!doctype html>
<html><head><meta charset="utf-8"><title>Arco FastAPI</title>
<style>body{font-family:system-ui;display:grid;place-content:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}
main{text-align:center}code{background:#1e293b;padding:.15rem .4rem;border-radius:4px}</style>
</head><body><main><h1>Arco FastAPI</h1><p>Edit <code>main.py</code> and restart uvicorn.</p></main></body></html>"""

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
