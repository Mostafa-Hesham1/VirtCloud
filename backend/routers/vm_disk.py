from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import subprocess
import shutil
import os
from typing import Optional
from database import db
from .auth import get_current_user
from datetime import datetime
from bson.objectid import ObjectId

router = APIRouter()

# Request schema for disk creation
class CreateDiskRequest(BaseModel):
    name: str       # Disk name (without extension)
    size: str       # Size in format like "10G", "500M"
    format: str     # Disk format: "qcow2", "raw", "vmdk", "vhdx", "vdi"

class DiskInfoRequest(BaseModel):  # Request model for disk info
    name: str  # e.g., "ubuntu_disk.qcow2"

class ConvertDiskRequest(BaseModel):  # Request model for disk conversion
    source_name: str       # e.g., "ubuntu_disk.qcow2"
    source_format: str     # e.g., qcow2
    target_format: str     # e.g., raw
    target_name: str       # e.g., "ubuntu_disk.raw"

class ResizeDiskRequest(BaseModel):  # Request model for resizing disks
    name: str       # Disk filename e.g., "ubuntu_disk.qcow2"
    resize_by: str  # Amount to increase size e.g., "+5G"

class RenameDiskRequest(BaseModel):
    current_name: str       # Current disk filename (with extension)
    new_name: str           # New disk name (without extension)

@router.post("/create")
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

    # Validate disk format
    valid_formats = ["qcow2", "raw", "vmdk", "vhdx", "vdi"]
    if req.format not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disk format '{req.format}'. Supported formats: {', '.join(valid_formats)}"
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

@router.post("/info")
def disk_info(req: DiskInfoRequest):
    """Get information about a disk image"""
    # ensure qemu-img is available (or fallback)
    exe = shutil.which("qemu-img")
    if exe is None:
        default_win = r"C:\Program Files\qemu\qemu-img.exe"
        if os.path.exists(default_win):
            exe = default_win
        else:
            raise HTTPException(status_code=500, detail="qemu-img not found. Install QEMU or adjust PATH.")
    # resolve disk path
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    store_dir = os.path.join(base_dir, "store")
    disk_path = os.path.join(store_dir, req.name)
    # check existence
    if not os.path.exists(disk_path):
        raise HTTPException(status_code=404, detail=f"Disk '{req.name}' not found in store.")
    # prepare command
    command = [exe, "info", disk_path]
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        # debug logs
        print("✅ stdout:", result.stdout)
        print("❌ stderr:", result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        return {
            "message": "Disk info retrieved successfully ✅",
            "disk": req.name,
            "info": result.stdout
        }
    except Exception as e:
        # catch any errors
        raise HTTPException(status_code=500, detail=f"💥 {str(e)}")

@router.post("/convert")
async def convert_disk(req: ConvertDiskRequest, user=Depends(get_current_user)):
    """Convert a disk from one format to another"""
    # Prevent converting to the same disk/name
    if req.source_name == req.target_name:
        raise HTTPException(status_code=400, detail="Source and target disk names must differ")
    # Locate qemu-img executable (or fallback to Windows path)
    exe = shutil.which("qemu-img")
    if exe is None:
        default_path = r"C:\Program Files\qemu\qemu-img.exe"
        if os.path.exists(default_path):
            exe = default_path
        else:
            raise HTTPException(status_code=500, detail="❌ qemu-img not found. Install QEMU or adjust PATH.")

    # Resolve input and output file paths
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    store_dir = os.path.join(base_dir, "store")
    input_path = os.path.join(store_dir, req.source_name)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"Source disk '{req.source_name}' not found.")
    output_path = os.path.join(store_dir, req.target_name)

    # Build qemu-img convert command
    command = [
        exe, "convert",
        "-f", req.source_format,
        "-O", req.target_format,
        input_path,
        output_path
    ]

    try:
        result = subprocess.run(command, capture_output=True, text=True)
        # Log output for debugging
        print("✅ stdout:", result.stdout)
        print("❌ stderr:", result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        # Remove the original disk file to clean up old format
        try:
            os.remove(os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)), "store", req.source_name))
        except Exception:
            pass
        # Update database: change disk_name for all this user's VMs
        update_result = await db.vms.update_many(
            {"disk_name": req.source_name, "user_email": user["email"]},
            {"$set": {"disk_name": req.target_name}}
        )
        return {
            "message": "✅ Disk converted and database updated!",
            "source": req.source_name,
            "target": req.target_name,
            "vms_updated": update_result.modified_count,
            "info": result.stdout
        }
    except Exception as e:
        # Handle conversion errors
        raise HTTPException(status_code=500, detail=f"💥 {str(e)}")

@router.post("/resize")
def resize_disk(req: ResizeDiskRequest):
    """Resize a disk image"""
    # Locate qemu-img executable
    exe = shutil.which("qemu-img")
    if exe is None:
        default_win = r"C:\Program Files\qemu\qemu-img.exe"
        if os.path.exists(default_win):
            exe = default_win
        else:
            raise HTTPException(status_code=500, detail="❌ qemu-img not found. Install QEMU or adjust PATH.")

    # Resolve disk path in store
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    store_dir = os.path.join(base_dir, "store")
    disk_path = os.path.join(store_dir, req.name)
    if not os.path.exists(disk_path):
        raise HTTPException(status_code=404, detail=f"Disk '{req.name}' not found in store.")

    # Build qemu-img resize command
    command = [exe, "resize", disk_path, req.resize_by]
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        # Debug logs
        print("✅ stdout:", result.stdout)
        print("❌ stderr:", result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        return {
            "message": "✅ Disk resized successfully!",
            "disk": req.name,
            "resize_by": req.resize_by,
            "info": result.stdout
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"💥 {str(e)}")

@router.post("/rename")
async def rename_disk(req: RenameDiskRequest, user=Depends(get_current_user)):
    """Rename a disk and update all references"""
    try:
        # Resolve paths
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        store_dir = os.path.join(base_dir, "store")
        current_path = os.path.join(store_dir, req.current_name)
        
        # Check if disk exists
        if not os.path.exists(current_path):
            raise HTTPException(status_code=404, detail=f"Disk '{req.current_name}' not found")
        
        # Extract extension from current name
        extension = os.path.splitext(req.current_name)[1]
        new_filename = f"{req.new_name}{extension}"
        new_path = os.path.join(store_dir, new_filename)
        
        # Check if new name already exists
        if os.path.exists(new_path):
            raise HTTPException(status_code=400, detail=f"A disk with name '{new_filename}' already exists")
        
        # Verify user owns VMs using this disk
        vm_count = await db.vms.count_documents({
            "user_email": user["email"],
            "disk_name": req.current_name
        })
        
        if vm_count == 0:
            raise HTTPException(status_code=403, detail="No VMs found with this disk that belong to you")
        
        # Rename the file
        os.rename(current_path, new_path)
        
        # Update all VMs that use this disk
        update_result = await db.vms.update_many(
            {"disk_name": req.current_name, "user_email": user["email"]},
            {"$set": {"disk_name": new_filename}}
        )
        
        return {
            "message": f"Disk renamed successfully from '{req.current_name}' to '{new_filename}'",
            "vms_updated": update_result.modified_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename disk: {str(e)}")
