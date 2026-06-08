import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.ai_service import AIService
from backend.services.memory_manager import MemoryManager

logger = logging.getLogger("ai_chat_router")
router = APIRouter()
ai_service = AIService()
memory_manager = MemoryManager()

MAX_UNCOMPRESSED_MSGS = 16  # user+assistant 消息达到此数量时触发压缩

def count_conversation_turns(messages):
    """返回 user 和 assistant 的消息总数（不含 system）"""
    return sum(1 for msg in messages if msg["role"] in ("user", "assistant"))

async def maybe_compress_and_save(model_name: str, persona_name: str, messages: list):
    """检查消息数量，若超过阈值则压缩旧一半，保存并返回新消息列表"""
    # 分离 system 消息与其他
    system_msgs = []
    other_msgs = []
    for i, msg in enumerate(messages):
        if msg["role"] == "system":
            system_msgs.append((i, msg))
        else:
            other_msgs.append(msg)

    if len(other_msgs) < MAX_UNCOMPRESSED_MSGS:
        memory_manager.save_messages(model_name, persona_name, messages)
        return messages

    # 压缩前一半对话
    split_idx = len(other_msgs) // 2
    to_compress = other_msgs[:split_idx]
    remaining = other_msgs[split_idx:]

    # 构建上下文（包含旧摘要）
    context = ""
    for idx, msg in system_msgs:
        if idx == 0:
            continue  # 跳过人设（第一条 system）
        if msg["content"].startswith("[对话摘要]"):
            old_summary = msg["content"][len("[对话摘要]"):].strip()
            context += f"之前的对话摘要：{old_summary}\n"
    for msg in to_compress:
        context += f"{msg['role']}: {msg['content']}\n"

    summary_text = await ai_service.generate_summary(context)

    # 重建消息列表
    new_messages = []
    if system_msgs:
        new_messages.append(system_msgs[0][1])  # 人设
    new_messages.append({"role": "system", "content": f"[对话摘要] {summary_text}"})
    new_messages.extend(remaining)

    memory_manager.save_messages(model_name, persona_name, new_messages)
    return new_messages

def build_history_payload(messages):
    """
    从消息列表中提取 user、assistant 和带摘要的 system 消息，
    返回适合前端渲染的数组。
    """
    history = []
    for msg in messages:
        if msg["role"] in ("user", "assistant"):
            history.append(msg)
        elif msg["role"] == "system" and msg["content"].startswith("[对话摘要]"):
            history.append(msg)
    return history

@router.websocket("/ws/chat")
async def ai_chat_websocket(websocket: WebSocket):
    await websocket.accept()
    model_name = ai_service.config.default_model
    persona_name = ai_service.config.default_persona
    system_prompt = ai_service.persona_mgr.load_persona(persona_name)

    # 加载当前模型+人设的历史
    messages = memory_manager.load_messages(model_name, persona_name, system_prompt)

    # 首次连接推送历史
    await websocket.send_text(json.dumps({
        "type": "history",
        "messages": build_history_payload(messages)
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            action = data.get("action", "chat")

            if action == "switch_persona":
                new_persona = data.get("persona", persona_name)
                # 保存当前人设对话
                memory_manager.save_messages(model_name, persona_name, messages)
                # 切换
                persona_name = new_persona
                system_prompt = ai_service.persona_mgr.load_persona(persona_name)
                messages = memory_manager.load_messages(model_name, persona_name, system_prompt)
                # 推送新人设历史，前端会清空界面
                await websocket.send_text(json.dumps({
                    "type": "history",
                    "messages": build_history_payload(messages)
                }))
                continue

            elif action == "switch_model":
                new_model = data.get("model", model_name)
                memory_manager.save_messages(model_name, persona_name, messages)
                model_name = new_model
                messages = memory_manager.load_messages(model_name, persona_name, system_prompt)
                await websocket.send_text(json.dumps({
                    "type": "history",
                    "messages": build_history_payload(messages)
                }))
                continue

            elif action == "chat":
                user_msg = data.get("message", "")
                if not user_msg.strip():
                    continue

                messages.append({"role": "user", "content": user_msg})

                full_reply = ""
                await websocket.send_text(json.dumps({"type": "start"}))
                try:
                    async for token in ai_service.chat_stream(messages=messages, model=model_name):
                        full_reply += token
                        await websocket.send_text(json.dumps({"type": "token", "content": token}))
                except Exception as e:
                    logger.error(f"AI 生成错误: {e}")
                    await websocket.send_text(json.dumps({"type": "error", "content": f"生成回复失败: {str(e)}"}))
                    messages.pop()  # 移除失败的用户消息
                    continue

                messages.append({"role": "assistant", "content": full_reply})
                await websocket.send_text(json.dumps({"type": "end"}))

                # 压缩 + 持久化
                messages = await maybe_compress_and_save(model_name, persona_name, messages)

            else:
                await websocket.send_text(json.dumps({"type": "error", "content": f"未知操作: {action}"}))

    except WebSocketDisconnect:
        logger.info("AI 聊天 WebSocket 断开")
        if count_conversation_turns(messages) > 0:
            memory_manager.save_messages(model_name, persona_name, messages)
    except Exception as e:
        logger.error(f"AI 聊天异常: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "content": str(e)}))
        except:
            pass
