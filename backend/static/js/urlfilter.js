// urlfilter.js
document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkUrlBtn');
    const urlInput = document.getElementById('urlInput');
    const urlResultDiv = document.getElementById('urlResult');
    const logContainer = document.getElementById('urlLogContainer');

    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('请输入网址');
                return;
            }
            try {
                new URL(url);
            } catch {
                alert('请输入有效的网址（以 http:// 或 https:// 开头）');
                return;
            }

            checkBtn.disabled = true;
            urlResultDiv.style.display = 'block';
            urlResultDiv.className = 'alert alert-info';
            urlResultDiv.innerHTML = '🔍 正在分析，请稍候...';

            try {
                const res = await fetch('/api/urlfilter/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || '请求失败');
                }
                const data = await res.json();

                let alertClass = data.is_malicious ? 'alert-danger' : 'alert-success';
                let icon = data.is_malicious ? '⚠️' : '✅';
                let source = data.source === 'local' ? '本地黑名单' : 'AI 云端分析';
                urlResultDiv.className = `alert ${alertClass}`;
                urlResultDiv.innerHTML = `
                    <strong>${icon} 检测结果</strong><br>
                    🔗 网址：${escapeHtml(url)}<br>
                    🛡️ 状态：${data.is_malicious ? '危险/可疑' : '安全'}<br>
                    📂 分类：${data.detail || '无'}<br>
                    🔍 来源：${source}
                `;
            } catch (error) {
                urlResultDiv.className = 'alert alert-danger';
                urlResultDiv.innerHTML = `❌ ${escapeHtml(error.message)}`;
            } finally {
                checkBtn.disabled = false;
            }
        });

        // 回车触发
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkBtn.click();
        });
    }

    // 加载最近日志（如果页面有日志容器）
    if (logContainer) {
        loadUrlLogs();
    }
});

async function loadUrlLogs(limit = 20) {
    try {
        const res = await fetch(`/api/urlfilter/logs?limit=${limit}`);
        if (!res.ok) return;
        const logs = await res.json();
        const logContainer = document.getElementById('urlLogContainer');
        logContainer.innerHTML = '';
        if (logs.length === 0) {
            logContainer.innerHTML = '<p class="text-muted">暂无检测记录</p>';
            return;
        }
        const table = document.createElement('table');
        table.className = 'table table-sm table-striped';
        table.innerHTML = `
            <thead><tr><th>时间</th><th>网址</th><th>结果</th><th>来源</th></tr></thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.time}</td>
                <td>${escapeHtml(log.url)}</td>
                <td><span class="badge ${log.is_malicious ? 'bg-danger' : 'bg-success'}">${log.is_malicious ? '恶意' : '安全'}</span></td>
                <td>${log.source === 'local' ? '本地' : '云端'}</td>
            `;
            tbody.appendChild(tr);
        });
        logContainer.appendChild(table);
    } catch (err) {
        console.error('加载日志失败:', err);
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
