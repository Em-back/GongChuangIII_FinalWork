// backend/static/js/music.js

let player;

// 等页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {

    player = document.getElementById("audioPlayer");

    if (!player) {
        console.error("未找到 audioPlayer");
        return;
    }

    // 更新进度条
    player.addEventListener("timeupdate", () => {

        const progressBar =
            document.getElementById("progressBar");

        if (!progressBar) return;

        const progress =
            player.duration
                ? player.currentTime /
                player.duration * 100
                : 0;

        progressBar.value = progress;
    });

    // 拖动进度条
    const progressBar =
        document.getElementById("progressBar");

    if (progressBar) {

        progressBar.addEventListener(
            "input",
            (e) => {

                if (!player.duration) return;

                player.currentTime =
                    player.duration *
                    e.target.value / 100;
            }
        );
    }

    // 音量控制条
    const volumeBar =
        document.getElementById("volumeBar");

    if (volumeBar) {

        player.volume = 0.5;

        volumeBar.addEventListener(
            "input",
            (e) => {

                const volume =
                    e.target.value / 100;

                player.volume = volume;

                document.getElementById(
                    "volumeText"
                ).innerText =
                    e.target.value + "%";
            }
        );
    }

    // 加载音乐列表
    loadMusicList();

});

// 加载音乐列表
async function loadMusicList() {

    try {

        const res =
            await fetch("/api/music/list");

        const data =
            await res.json();

        const ul =
            document.getElementById(
                "musicList"
            );

        if (!ul) return;

        ul.innerHTML = "";

        data.music.forEach(name => {

            const li =
                document.createElement("li");

            li.className =
                "list-group-item list-group-item-action";

            li.innerText = name;

            li.onclick = () => {

                player.src =
                    "/music/" + name;

                document.getElementById(
                    "currentMusic"
                ).innerText = name;

                player.play()
                    .catch(err =>
                        console.error(
                            "播放失败:",
                            err
                        )
                    );
            };

            ul.appendChild(li);
        });

    } catch (err) {

        console.error(
            "加载音乐列表失败:",
            err
        );
    }

}

// 播放 / 暂停
function togglePlay() {

    if (!player) return;

    if (player.paused) {

        player.play()
            .catch(err =>
                console.error(
                    "播放失败:",
                    err
                )
            );

    } else {

        player.pause();
    }

}

// 音量增加
function volumeUp() {

    if (!player) return;

    player.volume =
        Math.min(
            1,
            player.volume + 0.1
        );

    const value =
        Math.round(
            player.volume * 100
        );

    document.getElementById(
        "volumeBar"
    ).value = value;

    document.getElementById(
        "volumeText"
    ).innerText =
        value + "%";
}

// 音量减少
function volumeDown() {

    if (!player) return;

    player.volume =
        Math.max(
            0,
            player.volume - 0.1
        );

    const value =
        Math.round(
            player.volume * 100
        );

    document.getElementById(
        "volumeBar"
    ).value = value;

    document.getElementById(
        "volumeText"
    ).innerText =
        value + "%";
}

// 上传音乐
async function uploadMusic() {

    const fileInput =
        document.getElementById(
            "musicUpload"
        );

    if (
        !fileInput ||
        fileInput.files.length === 0
    ) {
        alert("请选择音乐文件");
        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    try {

        const res =
            await fetch(
                "/api/music/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await res.json();

        if (data.success) {

            alert("上传成功");

            fileInput.value = "";

            await loadMusicList();

        } else {

            alert("上传失败");
        }

    } catch (err) {

        console.error(
            "上传失败:",
            err
        );

        alert("上传失败");
    }

}
