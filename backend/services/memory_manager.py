import json
import logging
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger("memory_manager")

class MemoryManager:
    def __init__(self, storage_path: str = "data/chat_memory.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.storage_path.exists():
            self._write_data({})

    def _make_key(self, model: str, persona: str) -> str:
        """生成唯一存储键：模型::人设"""
        return f"{model}::{persona}"

    def _read_data(self) -> dict:
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _write_data(self, data: dict):
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_messages(self, model: str, persona: str, system_prompt: str) -> List[Dict[str, str]]:
        """
        加载指定模型+人设的历史消息。
        若无历史，则返回仅包含 system prompt 的新列表。
        """
        data = self._read_data()
        key = self._make_key(model, persona)
        if key in data:
            messages = data[key]
            # 确保最新的 system prompt 在第一条
            if messages and messages[0]["role"] == "system":
                messages[0]["content"] = system_prompt
            else:
                messages.insert(0, {"role": "system", "content": system_prompt})
            return messages
        # 无历史，返回新列表
        return [{"role": "system", "content": system_prompt}]

    def save_messages(self, model: str, persona: str, messages: List[Dict[str, str]]):
        """保存指定模型+人设的对话历史"""
        data = self._read_data()
        key = self._make_key(model, persona)
        data[key] = messages
        self._write_data(data)

    def clear(self, model: str = None, persona: str = None):
        """
        清除记忆：
        - 同时提供 model 和 persona：只清除该组合
        - 仅提供 model：清除该模型的所有人设记录
        - 都不提供：清除所有历史
        """
        data = self._read_data()
        if model and persona:
            key = self._make_key(model, persona)
            if key in data:
                del data[key]
        elif model:
            to_delete = [k for k in data if k.startswith(f"{model}::")]
            for k in to_delete:
                del data[k]
        else:
            data = {}
        self._write_data(data)
