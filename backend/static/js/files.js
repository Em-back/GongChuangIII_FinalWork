let currentPath = "";

document.addEventListener("DOMContentLoaded", () => {
    loadFiles("");
});

async function loadFiles(path = "") {
    currentPath = path;
    // 先清空显示，等拿到 base_dir 再设置
    try {
        const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
        if (!res.ok) {
            alert("加载文件列表失败");
            return;
        }
        const data = await res.json();

        // 拼接绝对路径用于显示
        const fullPath = data.base_dir + (path ? '/' + path : '');
        document.getElementById("currentPath").innerText = fullPath;

        // 以下渲染表格的代码保持不变 ...
        const tbody = document.getElementById("fileTableBody");
        tbody.innerHTML = "";
        if (data.items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">此目录为空</td></tr>`;
            return;
        }

        data.items.forEach(item => {
            const tr = document.createElement("tr");

            // 名称列（目录可点击进入）
            const nameTd = document.createElement("td");
            if (item.is_dir) {
                nameTd.innerHTML = `<a href="#" onclick="enterDir('${escapeHtml(item.name)}')">📁 ${escapeHtml(item.name)}</a>`;
            } else {
                nameTd.innerHTML = `📄 ${escapeHtml(item.name)}`;
            }
            tr.appendChild(nameTd);

            // 类型列
            const typeTd = document.createElement("td");
            typeTd.innerText = item.is_dir ? "目录" : "文件";
            tr.appendChild(typeTd);

            // 大小列
            const sizeTd = document.createElement("td");
            sizeTd.innerText = item.size !== null ? item.size : "-";
            tr.appendChild(sizeTd);

            // 操作列
            const actionTd = document.createElement("td");
            if (item.is_dir) {
                actionTd.innerHTML = `
                    <button class="btn btn-sm btn-primary" onclick="enterDir('${escapeHtml(item.name)}')">打开</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('${escapeHtml(item.name)}', true)">删除</button>
                `;
            } else {
                actionTd.innerHTML = `
                    <button class="btn btn-sm btn-success" onclick="downloadFile('${escapeHtml(item.name)}')">下载</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('${escapeHtml(item.name)}', false)">删除</button>
                `;
            }
            tr.appendChild(actionTd);

            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("加载文件列表出错:", err);
    }
}

function enterDir(dirName) {
    const newPath = currentPath ? currentPath + "/" + dirName : dirName;
    loadFiles(newPath);
}

function goUp() {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    loadFiles(parts.join("/"));
}

function downloadFile(fileName) {
    const filePath = currentPath ? currentPath + "/" + fileName : fileName;
    window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, "_blank");
}

async function deleteItem(name, isDir) {
    if (!confirm(`确定要删除 ${name} 吗？`)) return;
    const filePath = currentPath ? currentPath + "/" + name : name;
    try {
        const res = await fetch(`/api/files/delete?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
        if (res.ok) {
            loadFiles(currentPath);
        } else {
            const err = await res.json();
            alert("删除失败: " + (err.detail || "未知错误"));
        }
    } catch (err) {
        console.error("删除失败:", err);
    }
}

async function createFile() {
    const name = prompt("请输入新文件名:");
    if (!name) return;
    try {
        const res = await fetch(`/api/files/newfile?name=${encodeURIComponent(name)}&path=${encodeURIComponent(currentPath)}`, { method: "POST" });
        if (res.ok) {
            loadFiles(currentPath);
        } else {
            const err = await res.json();
            alert("创建失败: " + (err.detail || "未知错误"));
        }
    } catch (err) {
        console.error("创建文件失败:", err);
    }
}

async function createFolder() {
    const name = prompt("请输入新文件夹名:");
    if (!name) return;
    try {
        const res = await fetch(`/api/files/mkdir?name=${encodeURIComponent(name)}&path=${encodeURIComponent(currentPath)}`, { method: "POST" });
        if (res.ok) {
            loadFiles(currentPath);
        } else {
            const err = await res.json();
            alert("创建失败: " + (err.detail || "未知错误"));
        }
    } catch (err) {
        console.error("创建文件夹失败:", err);
    }
}

async function uploadFile() {
    const fileInput = document.getElementById("fileUploadInput");
    if (!fileInput || fileInput.files.length === 0) {
        alert("请选择文件");
        return;
    }
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            fileInput.value = "";
            loadFiles(currentPath);
        } else {
            const err = await res.json();
            alert("上传失败: " + (err.detail || "未知错误"));
        }
    } catch (err) {
        console.error("上传失败:", err);
    }
}

// HTML 转义，防 XSS
function escapeHtml(text) {
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
