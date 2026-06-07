from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import shutil

router = APIRouter()

# backend/static/files
BASE_DIR = (
    Path(__file__).parent.parent
    / "static"
    / "files"
).resolve()

BASE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


def safe_path(rel_path: str = ""):

    target = (
        BASE_DIR / rel_path
    ).resolve()

    if not str(target).startswith(
        str(BASE_DIR)
    ):
        raise HTTPException(
            status_code=400,
            detail="非法路径"
        )

    return target


@router.get("/list")
def list_files(path: str = ""):

    target = safe_path(path)

    if not target.exists():
        raise HTTPException(
            status_code=404,
            detail="目录不存在"
        )

    if not target.is_dir():
        raise HTTPException(
            status_code=400,
            detail="不是目录"
        )

    items = []

    for item in sorted(
        target.iterdir(),
        key=lambda x: (
            not x.is_dir(),
            x.name.lower()
        )
    ):

        items.append(
            {
                "name": item.name,
                "is_dir": item.is_dir(),
                "size":
                    item.stat().st_size
                    if item.is_file()
                    else None
            }
        )

    return {
        "path": path,
        "items": items
    }


@router.post("/upload")
def upload_file(
    path: str = "",
    file: UploadFile = File(...)
):

    target_dir = safe_path(path)

    target_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = (
        target_dir
        / file.filename
    )

    with open(
        file_path,
        "wb"
    ) as f:

        shutil.copyfileobj(
            file.file,
            f
        )

    return {
        "status": "ok"
    }


@router.get("/download")
def download_file(path: str):

    file_path = safe_path(path)

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="文件不存在"
        )

    return FileResponse(
        file_path,
        filename=file_path.name
    )


@router.delete("/delete")
def delete_file(path: str):

    target = safe_path(path)

    if not target.exists():

        raise HTTPException(
            status_code=404,
            detail="不存在"
        )

    if target.is_file():

        target.unlink()

    else:

        try:

            target.rmdir()

        except OSError:

            raise HTTPException(
                status_code=400,
                detail="目录非空"
            )

    return {
        "status": "ok"
    }


@router.post("/mkdir")
def make_dir(name: str, path: str = ""):

    target = safe_path(path)

    (
        target / name
    ).mkdir(
        exist_ok=True
    )

    return {
        "status": "ok"
    }

@router.post("/newfile")
def create_file(
    name: str,
    path: str = ""
):

    target_dir = safe_path(path)

    file_path = (
        target_dir / name
    )

    if file_path.exists():

        raise HTTPException(
            status_code=400,
            detail="文件已存在"
        )

    file_path.touch()

    return {
        "status": "ok"
    }

@router.post("/rename")
def rename_file(
    old_path: str,
    new_name: str
):

    target = safe_path(old_path)

    if not target.exists():

        raise HTTPException(
            status_code=404,
            detail="不存在"
        )

    new_path = (
        target.parent
        / new_name
    )

    if new_path.exists():

        raise HTTPException(
            status_code=400,
            detail="目标已存在"
        )

    target.rename(
        new_path
    )

    return {
        "status": "ok"
    }