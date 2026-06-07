let currentPath = "";

async function loadFiles(path = "") {

    currentPath = path;

    document
        .getElementById(
            "currentPath"
        )
        .innerText =
            "/" + currentPath;

    try {

        const res =
            await fetch(
                `/api/files/list?path=${encodeURIComponent(path)}`
            );

        const data =
            await res.json();

        const tbody =
            document.getElementById(
                "fileTableBody"
            );

        tbody.innerHTML = "";

        data.items.forEach(item => {

            const tr =
                document.createElement(
                    "tr"
                );

            let fullPath =
                currentPath
                ? `${currentPath}/${item.name}`
                : item.name;

            // 名称
            const nameTd =
                document.createElement(
                    "td"
                );

            if (item.is_dir) {

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = "#";

                link.innerText =
                    "📁 " + item.name;

                link.onclick = e => {

                    e.preventDefault();

                    loadFiles(
                        fullPath
                    );
                };

                nameTd.appendChild(
                    link
                );

            } else {

                nameTd.innerText =
                    "📄 " + item.name;
            }

            tr.appendChild(
                nameTd
            );

            // 类型
            const typeTd =
                document.createElement(
                    "td"
                );

            typeTd.innerText =
                item.is_dir
                ? "文件夹"
                : "文件";

            tr.appendChild(
                typeTd
            );

            // 大小
            const sizeTd =
                document.createElement(
                    "td"
                );

            sizeTd.innerText =
                item.size || "";

            tr.appendChild(
                sizeTd
            );

            // 操作
            const actionTd =
                document.createElement(
                    "td"
                );

            if (!item.is_dir) {

                const downloadBtn =
                    document.createElement(
                        "button"
                    );

                downloadBtn.className =
                    "btn btn-primary btn-sm me-1";

                downloadBtn.innerText =
                    "下载";

                downloadBtn.onclick =
                    () => {

                    window.open(
                        `/api/files/download?path=${encodeURIComponent(fullPath)}`
                    );

                };

                actionTd.appendChild(
                    downloadBtn
                );
            }
            
            const renameBtn =
                document.createElement(
                    "button"
                );

            renameBtn.className =
                "btn btn-warning btn-sm me-1";

            renameBtn.innerText =
                "重命名";

            renameBtn.onclick =
                () => {

                renameItem(
                    fullPath,
                    item.name
                );

            };

            actionTd.appendChild(
                renameBtn
            );

            const deleteBtn =
                document.createElement(
                    "button"
                );

            deleteBtn.className =
                "btn btn-danger btn-sm";

            deleteBtn.innerText =
                "删除";

            deleteBtn.onclick =
                async () => {

                if (
                    !confirm(
                        `删除 ${item.name} ?`
                    )
                ) {
                    return;
                }

                await fetch(
                    `/api/files/delete?path=${encodeURIComponent(fullPath)}`,
                    {
                        method: "DELETE"
                    }
                );

                loadFiles(
                    currentPath
                );
            };

            actionTd.appendChild(
                deleteBtn
            );

            tr.appendChild(
                actionTd
            );

            tbody.appendChild(
                tr
            );
        });

    } catch (err) {

        console.error(err);

    }
}

function goUp() {

    if (!currentPath) {
        return;
    }

    const parts =
        currentPath.split("/");

    parts.pop();

    loadFiles(
        parts.join("/")
    );
}

async function uploadFile() {

    const input =
        document.getElementById(
            "fileUploadInput"
        );

    if (
        input.files.length === 0
    ) {
        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        input.files[0]
    );

    await fetch(
        `/api/files/upload?path=${encodeURIComponent(currentPath)}`,
        {
            method: "POST",
            body: formData
        }
    );

    input.value = "";

    loadFiles(
        currentPath
    );
}

async function createFolder() {

    const name =
        prompt(
            "请输入文件夹名称"
        );

    if (!name) {
        return;
    }

    await fetch(
        `/api/files/mkdir?name=${encodeURIComponent(name)}&path=${encodeURIComponent(currentPath)}`,
        {
            method: "POST"
        }
    );

    loadFiles(
        currentPath
    );
}

async function createFile() {

    const name =
        prompt(
            "请输入文件名"
        );

    if(!name){
        return;
    }

    await fetch(
        `/api/files/newfile?name=${encodeURIComponent(name)}&path=${encodeURIComponent(currentPath)}`,
        {
            method:"POST"
        }
    );

    loadFiles(
        currentPath
    );
}

async function renameItem(
    oldPath,
    oldName
){

    const newName =
        prompt(
            "新的名称",
            oldName
        );

    if(
        !newName
        ||
        newName === oldName
    ){
        return;
    }

    await fetch(
        `/api/files/rename?old_path=${encodeURIComponent(oldPath)}&new_name=${encodeURIComponent(newName)}`,
        {
            method:"POST"
        }
    );

    loadFiles(
        currentPath
    );
}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadFiles();

    }
);