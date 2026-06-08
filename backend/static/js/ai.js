let aiSocket = null;
let currentReplyBubble = null;

function connectAIWebSocket() {
    if (aiSocket && aiSocket.readyState === WebSocket.OPEN) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/api/ai/ws/chat`;
    aiSocket = new WebSocket(wsUrl);

    aiSocket.onopen = () => {
        console.log('AI WebSocket 已连接');
    };

    aiSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const messagesDiv = document.getElementById('chatMessages');

        switch (data.type) {
            case 'history':
                // 清空聊天区域并重新绘制历史
                messagesDiv.innerHTML = '';
                if (!data.messages || data.messages.length === 0) {
                    // 无历史时显示默认欢迎语
                    const welcomeDiv = document.createElement('div');
                    welcomeDiv.className = 'alert alert-secondary';
                    welcomeDiv.innerHTML = '👋 你好！我是 DeepSeek 智能助手，请问有什么可以帮您？';
                    messagesDiv.appendChild(welcomeDiv);
                } else {
                    data.messages.forEach(msg => {
                        if (msg.role === 'user') {
                            const userDiv = document.createElement('div');
                            userDiv.className = 'alert alert-primary mt-2';
                            userDiv.innerHTML = `<strong>你:</strong> ${escapeHtml(msg.content)}`;
                            messagesDiv.appendChild(userDiv);
                        } else if (msg.role === 'assistant') {
                            const aiDiv = document.createElement('div');
                            aiDiv.className = 'alert alert-success mt-2';
                            aiDiv.innerHTML = `<strong>AI助手:</strong> ${escapeHtml(msg.content)}`;
                            messagesDiv.appendChild(aiDiv);
                        } else if (msg.role === 'system') {
                            // 摘要类系统消息
                            const sysDiv = document.createElement('div');
                            sysDiv.className = 'alert alert-secondary mt-2';
                            sysDiv.innerHTML = `<em>${escapeHtml(msg.content)}</em>`;
                            messagesDiv.appendChild(sysDiv);
                        }
                    });
                }
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                break;

            case 'system':
                // 通用系统通知（备用）
                const sysDiv = document.createElement('div');
                sysDiv.className = 'alert alert-info mt-2';
                sysDiv.innerHTML = `<strong>系统:</strong> ${data.content}`;
                messagesDiv.appendChild(sysDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                break;

            case 'start':
                currentReplyBubble = document.createElement('div');
                currentReplyBubble.className = 'alert alert-success mt-2';
                currentReplyBubble.innerHTML = '<strong>AI助手:</strong> ';
                messagesDiv.appendChild(currentReplyBubble);
                break;

            case 'token':
                if (currentReplyBubble) {
                    currentReplyBubble.innerHTML += data.content;
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
                break;

            case 'end':
                currentReplyBubble = null;
                break;

            case 'error':
                const errDiv = document.createElement('div');
                errDiv.className = 'alert alert-danger mt-2';
                errDiv.innerHTML = `<strong>错误:</strong> ${data.content}`;
                messagesDiv.appendChild(errDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                break;
        }
    };

    aiSocket.onclose = () => {
        const messagesDiv = document.getElementById('chatMessages');
        const closeDiv = document.createElement('div');
        closeDiv.className = 'alert alert-warning mt-2';
        closeDiv.innerHTML = '⚠️ AI 连接已断开，刷新页面重连';
        messagesDiv.appendChild(closeDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    aiSocket.onerror = (err) => {
        console.error('AI WebSocket 错误:', err);
    };
}

function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    if (!aiSocket || aiSocket.readyState !== WebSocket.OPEN) {
        alert('AI 连接未就绪，请稍候或刷新页面');
        return;
    }

    const messagesDiv = document.getElementById('chatMessages');
    const userDiv = document.createElement('div');
    userDiv.className = 'alert alert-primary mt-2';
    userDiv.innerHTML = `<strong>你:</strong> ${escapeHtml(message)}`;
    messagesDiv.appendChild(userDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    aiSocket.send(JSON.stringify({ action: 'chat', message: message }));
    input.value = '';
}

function switchPersona() {
    const persona = document.getElementById('persona-select').value;
    if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
        aiSocket.send(JSON.stringify({ action: 'switch_persona', persona: persona }));
    }
}

function switchModel() {
    const model = document.getElementById('model-select').value;
    if (aiSocket && aiSocket.readyState === WebSocket.OPEN) {
        aiSocket.send(JSON.stringify({ action: 'switch_model', model: model }));
    }
}

function escapeHtml(text) {
    return String(text).replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    connectAIWebSocket();

    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    sendBtn.addEventListener('click', sendAIMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
});
