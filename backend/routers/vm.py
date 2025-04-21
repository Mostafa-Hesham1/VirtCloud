from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import shutil
import os

router = APIRouter()

# Request schema for disk creation
class CreateDiskRequest(BaseModel):
    name: str       # Disk name (without extension)
    size: str       # Size in format like "10G", "500M"
    format: str     # Disk format: "qcow2" or "raw"

@router.post("/create-disk")
def create_disk(req: CreateDiskRequest):
    """
    Creates a virtual disk image using qemu-img based on user input.
    """

    # Step 1: Locate qemu-img executable
    qemu_img_path = shutil.which("qemu-img")

    # Fallback for Windows typical install path (if not in PATH)
    if qemu_img_path is None:
        default_windows_path = r"C:\Program Files\qemu\qemu-img.exe"
        if os.path.exists(default_windows_path):
            qemu_img_path = default_windows_path
        else:
            raise HTTPException(
                status_code=500,
                detail="❌ 'qemu-img' not found. Please install QEMU or set the correct path."
            )

    # Step 2: Construct the full disk path
    disk_filename = f"{req.name}.{req.format}"
    project_base = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    store_folder = os.path.join(project_base, "store")
    os.makedirs(store_folder, exist_ok=True)
    full_disk_path = os.path.join(store_folder, disk_filename)

    print(f"📦 Creating virtual disk at: {full_disk_path}")

    # Step 3: Build the qemu-img command
    command = [
        qemu_img_path, "create",
        "-f", req.format,
        full_disk_path,
        req.size
    ]

    # Step 4: Run the command using subprocess
    try:
        result = subprocess.run(command, capture_output=True, text=True)

        print("✅ Command output:", result.stdout.strip())
        print("⚠️  Command errors:", result.stderr.strip())

        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip())

        return {
            "message": "✅ Virtual disk created successfully!",
            "path": full_disk_path,
            "format": req.format,
            "size": req.size
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="❌ qemu-img executable not found at runtime. Check installation."
        )

    except Exception as e:
        print("💥 Unexpected error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
