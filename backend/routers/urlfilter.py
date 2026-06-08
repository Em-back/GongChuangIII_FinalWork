import json
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List

import requests
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# 导入统一配置（如果 ai_config 可用，否则需从文件读取）
try:
    from backend.services.ai_service import AIConfig
    config = AIConfig()
    API_KEY = config.api_key
    API_URL = f"{config.base_url}/v1/chat/completions"
except Exception:
    # 降级方案：直接从配置文件读取
    try:
        with open("config/ai_config.json") as f:
            cfg = json.load(f)
        API_KEY = cfg["api_key"]
        API_URL = f"{cfg['base_url']}/v1/chat/completions"
    except Exception:
        API_KEY = None

router = APIRouter()

# 本地黑名单文件路径
BLACKLIST_FILE = Path("config/url_blacklist.json")
# 检测日志文件
LOG_FILE = Path("logs/urlfilter_log.json")

# 确保日志目录存在
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# --- 黑名单加载 ---
class BlacklistManager:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.data = {"urls": [], "domains": [], "keywords": []}
        self.load()

    def load(self):
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception:
                logging.warning("加载黑名单失败，使用空规则")
        else:
            self.data = {"urls": [], "domains": [], "keywords": []}

    def check(self, url: str) -> Optional[Dict]:
        """本地匹配，命中返回结果字典，否则返回 None"""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        full_url = url.lower()

        # 精确 URL 匹配（忽略大小写）
        for bad_url in self.data.get("urls", []):
            if full_url == bad_url.lower():
                return {
                    "is_malicious": True,
                    "source": "local",
                    "detail": f"匹配黑名单URL: {bad_url}"
                }
        # 域名匹配
        for domain in self.data.get("domains", []):
            if hostname == domain.lower() or hostname.endswith("." + domain.lower()):
                return {
                    "is_malicious": True,
                    "source": "local",
                    "detail": f"匹配黑名单域名: {domain}"
                }
        # 关键词匹配（正则或包含）
        for kw in self.data.get("keywords", []):
            if re.search(kw, full_url, re.IGNORECASE):
                return {
                    "is_malicious": True,
                    "source": "local",
                    "detail": f"匹配关键词: {kw}"
                }
        return None

blacklist_mgr = BlacklistManager(BLACKLIST_FILE)

# --- 日志管理 ---
def append_log(entry: dict):
    logs = []
    if LOG_FILE.exists():
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except:
            logs = []
    logs.append(entry)
    # 只保留最近 500 条，防止文件过大
    if len(logs) > 500:
        logs = logs[-500:]
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)

def read_logs(limit: int = 20) -> List[dict]:
    if not LOG_FILE.exists():
        return []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            logs = json.load(f)
        return logs[-limit:][::-1]  # 最新的在前
    except:
        return []

# --- 请求模型 ---
class UrlCheckRequest(BaseModel):
    url: str

# --- 辅助：URL 脱敏 ---
def sanitize_url_for_ai(url: str) -> str:
    """移除敏感参数，保留域名和路径开头，避免泄露隐私"""
    from urllib.parse import urlparse, urlunparse
    parsed = urlparse(url)
    # 仅保留 scheme + host + path 的前 50 字符，去掉 query 和 fragment
    safe_path = parsed.path[:50]
    safe = urlunparse((parsed.scheme, parsed.hostname or "", safe_path, "", "", ""))
    return safe

# --- 云端分析（DeepSeek）---
def cloud_check_url(url: str) -> dict:
    if not API_KEY:
        return {"is_malicious": False, "source": "cloud", "detail": "AI 服务未配置"}
    
    sanitized = sanitize_url_for_ai(url)
    prompt = f"""你是一个网络安全专家。请判断以下网址是否安全。
网址（已脱敏）：{sanitized}

请按 JSON 格式返回（只含该 JSON，无其他文字）：
{{"is_malicious": true/false, "detail": "分类及原因（20字以内）"}}
"""
    messages = [
        {"role": "system", "content": "你是一个严格的安全分析助手，只输出 JSON。"},
        {"role": "user", "content": prompt}
    ]
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 100
    }
    try:
        resp = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        ai_reply = data["choices"][0]["message"]["content"].strip()
        # 提取 JSON
        start = ai_reply.find('{')
        end = ai_reply.rfind('}')
        if start != -1 and end != -1:
            result = json.loads(ai_reply[start:end+1])
            return {
                "is_malicious": result.get("is_malicious", False),
                "source": "cloud",
                "detail": result.get("detail", "未知")
            }
        else:
            return {"is_malicious": False, "source": "cloud", "detail": "AI 返回格式异常"}
    except Exception as e:
        logging.error(f"云端检测失败: {e}")
        return {"is_malicious": False, "source": "cloud", "detail": "云端服务暂时不可用"}

# --- API 端点 ---
@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/check")
def check_url(request: UrlCheckRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL 不能为空")

    # 1. 本地黑名单匹配
    local_result = blacklist_mgr.check(url)
    if local_result:
        # 记录日志
        log_entry = {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "url": url,
            "is_malicious": True,
            "source": "local",
            "detail": local_result["detail"]
        }
        append_log(log_entry)
        return local_result

    # 2. 云端分析
    result = cloud_check_url(url)
    log_entry = {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "url": url,
        "is_malicious": result["is_malicious"],
        "source": result["source"],
        "detail": result["detail"]
    }
    append_log(log_entry)
    return result

@router.get("/logs")
def get_logs(limit: int = Query(20, ge=1, le=100)):
    return read_logs(limit)

# 管理接口（可选）：重新加载黑名单
@router.post("/reload_blacklist")
def reload_blacklist():
    blacklist_mgr.load()
    return {"status": "ok", "message": "黑名单已重新加载"}
