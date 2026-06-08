import json
import logging
from pathlib import Path
from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI

logger = logging.getLogger("ai_service")

class AIConfig:
    def __init__(self, config_path: str = "config/ai_config.json"):
        with open(config_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        self.api_key = self.data["api_key"]
        self.base_url = self.data["base_url"]
        self.default_model = self.data["default_model"]
        self.models = self.data["models"]
        self.default_persona = self.data.get("default_persona", "assistant")
        self.persona_dir = self.data.get("persona_dir", "data/personas")

    def get_model_params(self, model_name: str = None) -> dict:
        name = model_name or self.default_model
        if name not in self.models:
            logger.warning(f"模型 {name} 未找到，使用默认 {self.default_model}")
            name = self.default_model
        return self.models[name]

class PersonaManager:
    def __init__(self, persona_dir: str):
        self.persona_dir = Path(persona_dir)
        self._cache = {}

    def load_persona(self, name: str) -> str:
        if name in self._cache:
            return self._cache[name]
        file_path = self.persona_dir / f"{name}.txt"
        if not file_path.exists():
            logger.warning(f"人设文件 {file_path} 不存在，使用默认 assistant")
            file_path = self.persona_dir / "assistant.txt"
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
        self._cache[name] = content
        return content

class AIService:
    def __init__(self):
        self.config = AIConfig()
        self.persona_mgr = PersonaManager(self.config.persona_dir)
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url
        )
    
    async def generate_summary(self, conversation_text: str, max_tokens: int = 500) -> str:
        """将对话文本压缩为不超过 max_tokens 的摘要"""
        messages = [
            {"role": "system", "content": "你是一个对话摘要助手，请用简洁的语言总结以下对话，保留关键信息，总字数不超过500字。"},
            {"role": "user", "content": f"请总结：\n{conversation_text}\n摘要："}
        ]
        try:
            response = await self.client.chat.completions.create(
                model=self.config.default_model,
                messages=messages,
                temperature=0.3,
                max_tokens=max_tokens,
                stream=False
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"生成摘要失败: {e}")
            return "（摘要生成失败）"

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = None,
        top_p: float = None,
        max_tokens: int = None
    ) -> AsyncGenerator[str, None]:
        model_params = self.config.get_model_params(model)
        temp = temperature if temperature is not None else model_params.get("temperature", 0.7)
        tp = top_p if top_p is not None else model_params.get("top_p", 1.0)
        mt = max_tokens if max_tokens is not None else model_params.get("max_tokens", 2048)

        response = await self.client.chat.completions.create(
            model=model_params["model_id"],
            messages=messages,
            temperature=temp,
            top_p=tp,
            max_tokens=mt,
            stream=True
        )
        async for chunk in response:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
