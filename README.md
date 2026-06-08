# openEuler 智能工具箱（Web 版）

基于 FastAPI 的局域网可视化个人工作台，集成系统监控、AI 对话、文件管理、音乐控制、网址安全检测等功能，为 openEuler 主机提供便捷的浏览器管理界面。

## 功能特性

- 📊 **系统仪表盘**：CPU/内存/磁盘/网络实时监控，动态图表展示
- 🤖 **AI 智能助手**：基于 DeepSeek 的流式对话，支持多模型切换、人设定制、上下文记忆与持久化
- 📁 **文件管理**：浏览器内文件浏览、上传、下载、新建、删除，沙盒安全限制
- 🎵 **音乐播放**：网页控制音乐播放、音量调节、播放列表管理
- 🛡️ **网址安全检测**：本地黑名单 + DeepSeek AI 分析，拦截恶意网址并记录日志
- 🔔 **告警通知**（预留）：支持邮件/微信推送异常事件
- 🌐 **开放接口**：为 AI Agent 提供受限的系统交互 API（文件读写、命令白名单）

## 技术栈

| 层级       | 技术                          |
|------------|-------------------------------|
| 后端框架   | Python 3 + FastAPI            |
| 实时通信   | WebSocket（FastAPI 原生）      |
| 系统交互   | psutil, subprocess            |
| AI 能力    | DeepSeek API（OpenAI 兼容）    |
| 定时任务   | APScheduler（预留）            |
| 前端       | HTML5, CSS3, Bootstrap 5, Chart.js |
| 数据存储   | JSON 文件（配置、黑名单、聊天记忆） |
| 部署       | uvicorn / systemd（可选）      |

## 快速开始

### 环境要求
- Python 3.8+
- pip

### 1. 获取代码
```bash
git clone <your-repo-url>
cd smart_toolbox
```

### 2. 安装依赖
```bash
pip install -r requirements.txt
```
或手动安装：
```bash
pip install fastapi uvicorn psutil openai apscheduler python-multipart aiofiles requests
```

### 3. 配置 AI 密钥
复制配置模板并填写你的 DeepSeek API Key：
```bash
cp config/ai_config.example.json config/ai_config.json
```
编辑 `config/ai_config.json`，将 `api_key` 替换为真实密钥。  
（⚠️ 该文件已加入 `.gitignore`，不会被提交）

可选：在 `data/personas/` 下自定义 AI 人设（`.txt` 文件），前端下拉框会自动读取。

### 4. 启动服务
```bash
python main.py
```
或指定主机和端口：
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. 访问
浏览器打开 `http://<你的openEuler主机IP>:8000`，即可看到工具箱界面。  
API 文档自动生成于 `http://<IP>:8000/docs`。

## API 接口概览

| 模块     | 方法   | 路径                     | 说明                     |
|----------|--------|--------------------------|--------------------------|
| 系统监控 | GET    | `/api/system/stats`      | 获取 CPU/内存/磁盘/网络   |
| AI 助手  | WS     | `/api/ai/ws/chat`        | WebSocket 流式对话        |
| 文件管理 | GET    | `/api/files/list`        | 列出目录内容              |
|          | POST   | `/api/files/upload`      | 上传文件                  |
|          | GET    | `/api/files/download`    | 下载文件                  |
|          | DELETE | `/api/files/delete`      | 删除文件/文件夹           |
|          | POST   | `/api/files/mkdir`       | 新建文件夹                |
| 音乐     | GET    | `/api/music/list`        | 获取音乐列表              |
|          | POST   | `/api/music/upload`      | 上传音乐                  |
| 网址过滤 | POST   | `/api/urlfilter/check`   | 检查网址安全性            |
|          | GET    | `/api/urlfilter/logs`    | 最近检测日志              |
| Agent 接口（预留） | ... | `/api/agent/*`       | 受限系统交互              |

完整交互文档请运行服务后访问 `/docs`。

## 项目结构

```
smart_toolbox/
├── main.py                  # 应用入口
├── config/
│   ├── ai_config.json       # AI 密钥及参数（需自建）
│   └── url_blacklist.json   # 网址黑名单
├── data/
│   ├── personas/            # AI 人设文件（.txt）
│   └── chat_memory.json     # 聊天记忆存储
├── backend/
│   ├── routers/             # 各模块路由
│   │   ├── system.py
│   │   ├── ai.py
│   │   ├── files.py
│   │   ├── music.py
│   │   ├── urlfilter.py
│   │   └── ...
│   ├── services/            # 业务逻辑
│   │   ├── ai_service.py
│   │   └── memory_manager.py
│   └── static/              # 前端静态文件
│       ├── index.html
│       ├── js/              # JavaScript 模块
│       └── music/           # 音乐文件存储
└── requirements.txt
```

## 开发团队

本项目为课程设计作品，由小组协作完成，具体分工见项目文档。

## 注意事项

- 默认所有文件操作限制在 `backend/static/files` 沙盒内，确保系统安全。
- 首次使用 AI 助手前请务必配置 `config/ai_config.json`。
- 若需后台长期运行，建议使用 `systemd` 或 `screen` 托管。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
