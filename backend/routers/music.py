from pathlib import Path
from fastapi import APIRouter, UploadFile, File
import shutil

router = APIRouter()

MUSIC_DIR = Path("backend/static/music")
MUSIC_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/list")
def list_music():
    music = []

    for f in MUSIC_DIR.iterdir():
        if f.suffix.lower() in [
            ".mp3",
            ".wav",
            ".ogg"
        ]:
            music.append(f.name)

    return {"music": music}

@router.post("/upload")
async def upload_music(
    file: UploadFile = File(...)
):
    target = MUSIC_DIR / file.filename

    with open(target, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {"success": True}