from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# 允许局域网内任意浏览器访问（开发阶段全开）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#@app.get("/api/system/health")
def health():
    return {"status": "ok"}

# 注册各模块路由（先用占位路由让程序不报错）
from backend.routers import system, ai, agent, music, urlfilter, alarm, files
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(music.router, prefix="/api/music", tags=["music"])
app.include_router(urlfilter.router, prefix="/api/urlfilter", tags=["urlfilter"])
app.include_router(alarm.router, prefix="/api/alarm", tags=["alarm"])
app.include_router(files.router, prefix="/api/files", tags=["files"])

# 挂载静态文件（前端）
app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")
