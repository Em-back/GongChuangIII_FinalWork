// backend/static/audio.js
class AudioManager {
    constructor() {
        this.bgm = new Audio('/music/bgm.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5; // 默认50%音量

        this.sounds = {}; // 音效字典
    }

    // 背景音乐
    playBGM() {
        this.bgm.play().catch(err => console.log("BGM播放错误:", err));
    }

    pauseBGM() {
        this.bgm.pause();
    }

    setBGMVolume(vol) {
        this.bgm.volume = vol; // 0~1
    }

    // 音效管理
    loadSound(name, path) {
        const audio = new Audio(path);
        this.sounds[name] = audio;
    }

    playSound(name) {
        if (this.sounds[name]) {
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(err => console.log("音效播放错误:", err));
        }
    }
}

// 创建全局对象
window.audioManager = new AudioManager();

// 页面交互示例
document.addEventListener('click', () => {
    audioManager.playBGM();
    audioManager.loadSound('click', '/music/click.mp3');
});