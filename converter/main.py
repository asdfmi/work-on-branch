import subprocess
import tempfile
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import Response

app = FastAPI()


@app.post("/convert")
async def convert_to_pdf(file: UploadFile):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".pptx", ".docx", ".xlsx"):
        raise HTTPException(400, f"Unsupported file type: {suffix}")

    tmp_dir = Path(tempfile.mkdtemp())
    try:
        src = tmp_dir / f"input{suffix}"
        src.write_bytes(await file.read())

        subprocess.run(
            [
                "libreoffice",
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(tmp_dir),
                str(src),
            ],
            check=True,
            timeout=60,
        )

        pdf_path = tmp_dir / "input.pdf"
        if not pdf_path.exists():
            raise HTTPException(500, "Conversion failed")

        return Response(
            content=pdf_path.read_bytes(),
            media_type="application/pdf",
        )
    finally:
        shutil.rmtree(tmp_dir)


@app.get("/health")
async def health():
    return {"status": "ok"}
