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
    format: str     # Disk format: "qcow2" or "raw"

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

class CreateVMRequest(BaseModel):  # Request model for creating a VM
    disk_name: str          # name of a disk file in store (e.g., "ubuntu_disk.qcow2")
    iso_path: Optional[str] = None  # optional path to an ISO file
    memory_mb: int          # RAM in MB
    cpu_count: int          # number of CPUs
    display: Optional[str] = "sdl"  # display type

class VMActionRequest(BaseModel):
    vm_id: str  # MongoDB ID for the VM
    include_iso: bool = False  # Optional parameter to include ISO or not

class UpdateVMResourcesRequest(BaseModel):
    vm_id: str            # MongoDB ID for the VM
    cpu_count: int        # New CPU count
    memory_mb: int        # New memory in MB

class RenameDiskRequest(BaseModel):
    current_name: str       # Current disk filename (with extension)
    new_name: str           # New disk name (without extension)

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

@router.post("/disk-info")
def disk_info(req: DiskInfoRequest):
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

@router.post("/convert-disk")
async def convert_disk(req: ConvertDiskRequest, user=Depends(get_current_user)):
    """
    Converts a disk image from one format to another using qemu-img.
    """
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
        # Remove original disk file to clean up old format
        try:
            os.remove(input_path)
        except Exception:
            pass
        # Update database: change disk_name for this user's VMs
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

@router.post("/resize-disk")
def resize_disk(req: ResizeDiskRequest):
    """
    Increase the size of an existing disk image using qemu-img resize.
    """
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

@router.post("/create-vm")
async def create_vm(req: CreateVMRequest, user=Depends(get_current_user)):
    """
    Launch a QEMU x86_64 VM using specified disk, ISO, memory, CPU, and display.
    """
    # Locate qemu-system binary
    exe = shutil.which("qemu-system-x86_64")
    if exe is None:
        default_path = r"C:\Program Files\qemu\qemu-system-x86_64.exe"
        if os.path.exists(default_path):
            exe = default_path
        else:
            raise HTTPException(status_code=500, detail="❌ qemu-system-x86_64 not found. Install QEMU or adjust PATH.")

    # Resolve disk path
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    store_dir = os.path.join(base_dir, "store")
    disk_path = os.path.join(store_dir, req.disk_name)
    if not os.path.exists(disk_path):
        raise HTTPException(status_code=404, detail=f"Disk '{req.disk_name}' not found in store.")
    # Build base QEMU command
    cmd = [
        exe,
        "-drive", f"file={disk_path},format={'qcow2' if req.disk_name.endswith('.qcow2') else 'raw'}",
        "-m", str(req.memory_mb),
        "-smp", str(req.cpu_count),
        "-display", req.display
    ]
    # Append ISO if provided
    if req.iso_path:
        if not os.path.exists(req.iso_path):
            raise HTTPException(status_code=404, detail=f"ISO '{req.iso_path}' not found.")
        cmd += ["-cdrom", req.iso_path, "-boot", "d"]

    try:
        # Launch VM process in background
        process = subprocess.Popen(cmd)
        # Record VM in database for this user
        await db.vms.insert_one({
            "user_email": user["email"],
            "disk_name": req.disk_name,
            "iso_path": req.iso_path,
            "memory_mb": req.memory_mb,
            "cpu_count": req.cpu_count,
            "display": req.display,
            "pid": process.pid,
            "created_at": datetime.utcnow()
        })
        print("✅ VM launched with PID", process.pid)
        return {
            "message": "✅ VM launched successfully",
            "pid": process.pid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"💥 {str(e)}")

@router.post("/stop-vm")
async def stop_vm(req: VMActionRequest, user=Depends(get_current_user)):
    """
    Stop a running VM
    """
    try:
        # Verify VM exists and belongs to user
        vm = await db.vms.find_one({"_id": ObjectId(req.vm_id), "user_email": user["email"]})
        if not vm:
            raise HTTPException(status_code=404, detail="VM not found or doesn't belong to you")

        # Check if already stopped
        if vm.get("status") == "stopped":
            return {"message": "VM is already stopped"}

        # Get PID
        pid = vm.get("pid")
        if not pid:
            raise HTTPException(status_code=400, detail="VM has no associated process ID")

        try:
            # On Windows, use taskkill
            if os.name == 'nt':
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], check=True)
            # On Unix-like, use kill
            else:
                import signal
                os.kill(pid, signal.SIGTERM)
                
            # Allow time for graceful shutdown
            import time
            time.sleep(1)
            
            # Update VM status in DB
            await db.vms.update_one(
                {"_id": ObjectId(req.vm_id)},
                {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
            )
            
            # Get the stop time and calculate runtime
            stop_time = datetime.utcnow()
            runtime_minutes = 0
            
            # Calculate runtime if we have a start time
            if vm.get("started_at"):
                start_time = vm["started_at"]
                runtime_seconds = (stop_time - start_time).total_seconds()
                runtime_minutes = runtime_seconds / 60
                
                # Compute costs for this session based on VM resources
                # Use the same constants as frontend for consistency
                BASE_COST = 0.5
                CPU_COST = 0.2
                RAM_COST = 0.1
                
                hourly_rate = BASE_COST + (vm["cpu_count"] * CPU_COST) + ((vm["memory_mb"] / 1024) * RAM_COST)
                session_cost = hourly_rate * (runtime_minutes / 60)
                
                # Round to 2 decimal places
                session_cost = round(session_cost, 2)
                
                # Only deduct credits for pay-as-you-go users
                user_info = await db.users.find_one({"email": user["email"]})
                if user_info and user_info.get("plan") == "payg":
                    # Deduct credits if user has enough
                    remaining_credits = user_info.get("credits", 0) - session_cost
                    
                    # Update user credits
                    await db.users.update_one(
                        {"email": user["email"]},
                        {"$set": {"credits": max(0, remaining_credits)}}
                    )
                    
                    # Create a billing record
                    await db.billing.insert_one({
                        "user_email": user["email"],
                        "vm_id": str(vm["_id"]),
                        "disk_name": vm["disk_name"],
                        "action": "vm_usage",
                        "cost": session_cost,
                        "runtime_minutes": runtime_minutes,
                        "timestamp": stop_time,
                        "details": {
                            "cpu": vm["cpu_count"],
                            "ram_gb": vm["memory_mb"] / 1024,
                            "hourly_rate": hourly_rate
                        }
                    })
                
                # Update VM with runtime information
                await db.vms.update_one(
                    {"_id": ObjectId(req.vm_id)},
                    {
                        "$set": {
                            "status": "stopped", 
                            "stopped_at": stop_time
                        },
                        "$inc": {"total_runtime_minutes": runtime_minutes}
                    }
                )
                
                return {
                    "message": "VM stopped successfully", 
                    "status": "stopped",
                    "runtime_minutes": runtime_minutes,
                    "session_cost": session_cost if user_info.get("plan") == "payg" else 0
                }
            
            return {"message": "VM stopped successfully", "status": "stopped"}
            
        except subprocess.CalledProcessError:
            # Process likely no longer exists
            await db.vms.update_one(
                {"_id": ObjectId(req.vm_id)},
                {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
            )
            return {"message": "VM process no longer running, status updated", "status": "stopped"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to stop VM: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.post("/start-vm")
async def start_vm(req: VMActionRequest, user=Depends(get_current_user)):
    """
    Start a previously stopped VM, with option to include ISO or not
    """
    try:
        # Fetch VM from database
        vm = await db.vms.find_one({"_id": ObjectId(req.vm_id), "user_email": user["email"]})
        if not vm:
            raise HTTPException(status_code=404, detail="VM not found or doesn't belong to you")
            
        # Check if already running
        if vm.get("status") != "stopped":
            return {"message": "VM is already running"}
            
        # Locate qemu-system binary
        exe = shutil.which("qemu-system-x86_64")
        if exe is None:
            default_path = r"C:\Program Files\qemu\qemu-system-x86_64.exe"
            if os.path.exists(default_path):
                exe = default_path
            else:
                raise HTTPException(status_code=500, detail="qemu-system-x86_64 not found. Install QEMU or adjust PATH.")
                
        # Resolve disk path
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        store_dir = os.path.join(base_dir, "store")
        disk_path = os.path.join(store_dir, vm["disk_name"])
        
        if not os.path.exists(disk_path):
            raise HTTPException(status_code=404, detail=f"Disk '{vm['disk_name']}' not found in store.")
            
        # Build command args
        cmd = [
            exe,
            "-drive", f"file={disk_path},format={'qcow2' if vm['disk_name'].endswith('.qcow2') else 'raw'}",
            "-m", str(vm["memory_mb"]),
            "-smp", str(vm["cpu_count"]),
            "-display", vm["display"]
        ]
        
        # Add ISO if specified and user wants it included
        if vm.get("iso_path") and req.include_iso:
            if os.path.exists(vm["iso_path"]):
                cmd += ["-cdrom", vm["iso_path"], "-boot", "d"]
                print(f"Including ISO: {vm['iso_path']}")
            else:
                print(f"ISO file not found: {vm['iso_path']}")
        else:
            print("Starting VM without ISO")
                
        # Launch VM
        process = subprocess.Popen(cmd)
        
        # Get the current time for runtime tracking
        start_time = datetime.utcnow()
        
        # Update VM in database with start time
        await db.vms.update_one(
            {"_id": ObjectId(req.vm_id)},
            {
                "$set": {
                    "status": "running",
                    "pid": process.pid,
                    "started_at": start_time,
                    "restarted_at": start_time,
                    "iso_included": req.include_iso
                }
            }
        )
        
        return {
            "message": "VM started successfully",
            "status": "running",
            "pid": process.pid,
            "iso_included": req.include_iso
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start VM: {str(e)}")

@router.post("/update-resources")
async def update_vm_resources(req: UpdateVMResourcesRequest, user=Depends(get_current_user)):
    """
    Update the CPU and memory resources for a VM
    """
    try:
        # Verify VM exists and belongs to user
        vm = await db.vms.find_one({"_id": ObjectId(req.vm_id), "user_email": user["email"]})
        if not vm:
            raise HTTPException(status_code=404, detail="VM not found or doesn't belong to you")
            
        # Check if VM is running (we can't update resources of a running VM)
        if vm.get("status") != "stopped":
            raise HTTPException(status_code=400, detail="VM must be stopped before updating resources")
        
        # Update VM in database
        await db.vms.update_one(
            {"_id": ObjectId(req.vm_id)},
            {
                "$set": {
                    "cpu_count": req.cpu_count,
                    "memory_mb": req.memory_mb,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "message": "VM resources updated successfully",
            "cpu_count": req.cpu_count,
            "memory_mb": req.memory_mb
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update VM resources: {str(e)}")

@router.get("/list")
async def list_user_vms(user=Depends(get_current_user)):
    """List all VMs created by the current user"""
    try:
        cursor = db.vms.find({"user_email": user["email"]})
        vms = []
        async for vm in cursor:
            vm["id"] = str(vm.pop("_id"))
            vms.append(vm)
        return {"vms": vms}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch VMs: " + str(e))

@router.post("/rename-disk")
async def rename_disk(req: RenameDiskRequest, user=Depends(get_current_user)):
    """
    Rename a virtual disk and update all references in the database
    """
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

# New endpoint to get VM runtime statistics
@router.get("/runtime-stats")
async def get_runtime_stats(user=Depends(get_current_user)):
    """Get runtime statistics for all user VMs"""
    try:
        # Get all VMs for the user
        cursor = db.vms.find({"user_email": user["email"]})
        vms = []
        total_cost = 0
        
        # Get current time for calculating running VM costs
        current_time = datetime.utcnow()
        
        async for vm in cursor:
            vm_data = {
                "id": str(vm["_id"]),
                "name": vm["disk_name"].split('.')[0],
                "status": vm.get("status", "unknown"),
                "total_runtime_minutes": vm.get("total_runtime_minutes", 0),
                "cpu_count": vm["cpu_count"],
                "ram_gb": vm["memory_mb"] / 1024
            }
            
            # Calculate current session runtime if VM is running
            if vm.get("status") == "running" and vm.get("started_at"):
                current_runtime = (current_time - vm["started_at"]).total_seconds() / 60
                vm_data["current_session_minutes"] = current_runtime
                
                # Calculate current session cost
                BASE_COST = 0.5
                CPU_COST = 0.2
                RAM_COST = 0.1
                
                hourly_rate = BASE_COST + (vm["cpu_count"] * CPU_COST) + ((vm["memory_mb"] / 1024) * RAM_COST)
                current_cost = hourly_rate * (current_runtime / 60)
                vm_data["current_session_cost"] = round(current_cost, 2)
                vm_data["hourly_rate"] = round(hourly_rate, 2)
                
                # Add to total if user is on pay-as-you-go
                if user["plan"] == "payg":
                    total_cost += current_cost
            
            vms.append(vm_data)
        
        # Get user billing history
        billing_cursor = db.billing.find({"user_email": user["email"]}).sort("timestamp", -1).limit(100)
        billing_history = []
        
        async for entry in billing_cursor:
            entry["id"] = str(entry.pop("_id"))
            billing_history.append(entry)
        
        return {
            "vms": vms,
            "current_total_cost": round(total_cost, 2),
            "billing_history": billing_history
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get runtime stats: {str(e)}")

import importlib.util  # reuse initial router declared at top

# Alias endpoint for listing VMs at /vm/list for compatibility
@router.get("/list", tags=["VM Management"])
async def list_user_vms_alias(user=Depends(get_current_user)):
    from .vm_management import list_user_vms
    return await list_user_vms(user)

# Check and include sub-routers on the same router instance
try:
    from . import vm_disk, vm_management, vm_stats
    router.include_router(vm_disk.router, prefix="/disk", tags=["VM Disks"])
    router.include_router(vm_management.router, prefix="/management", tags=["VM Management"])
    router.include_router(vm_stats.router, prefix="/stats", tags=["VM Statistics"])
except ImportError as e:
    print(f"Warning: Module import error: {e}")
    print("Some VM functionalities may be unavailable")

# Add root endpoint for VM API
@router.get("/")
async def vm_root():
    return {
        "message": "VM System API",
        "endpoints": {
            "disk": "Disk operations (create, resize, convert)",
            "management": "VM lifecycle (create, start, stop, update)",
            "stats": "VM runtime statistics"
        }
    }

# Status endpoint to check component health
@router.get("/status")
async def vm_system_status():
    components = {
        "disk_management": "online" if importlib.util.find_spec("routers.vm_disk") else "offline",
        "vm_management": "online" if importlib.util.find_spec("routers.vm_management") else "offline",
        "stats": "online" if importlib.util.find_spec("routers.vm_stats") else "offline"
    }
    
    all_online = all(status == "online" for status in components.values())
    
    return {
        "status": "operational" if all_online else "degraded",
        "components": components
    }
