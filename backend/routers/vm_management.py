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

class DeductCreditsRequest(BaseModel):
    vm_id: str       # ID of the VM
    amount: float    # credits to deduct
    deduction_period: Optional[str] = "second"  # "second", "minute", or "hour"

class DeleteVMRequest(BaseModel):
    vm_id: str  # MongoDB ID for the VM
    delete_disk: bool = True  # Whether to delete the associated disk file

@router.post("/create")#M
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

    # Build command args
    cmd = [
        exe,
        "-drive", f"file={disk_path},format={'qcow2' if req.disk_name.endswith('.qcow2') else 'raw'}",
        "-m", str(req.memory_mb),
        "-smp", str(req.cpu_count),
        "-display", req.display
    ]
    # Add ISO boot if provided
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
            "status": "running",
            "started_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        })
        print("✅ VM launched with PID", process.pid)
        return {
            "message": "✅ VM launched successfully",
            "pid": process.pid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"💥 {str(e)}")

@router.post("/stop")#Molla
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
                
                # Deduct credits for ALL users (removed the plan check)
                user_info = await db.users.find_one({"email": user["email"]})
                if user_info:
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
                    "session_cost": session_cost  # Removed the plan condition
                }
            
            # Update VM status in DB (fallback if no start time)
            await db.vms.update_one(
                {"_id": ObjectId(req.vm_id)},
                {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
            )
            
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

@router.post("/start")#Molla
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

@router.post("/update-resources")#M
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

@router.post("/deduct-credits")#K
async def deduct_credits(req: DeductCreditsRequest, user=Depends(get_current_user)):
    """Deduct credits from user's balance for VM runtime"""
    try:
        # Get minimum deduction amount to ensure it's significant enough
        deduction_amount = max(req.amount, 0.01)  # minimum deduction of 0.01 credits
        
        # Use MongoDB's findOneAndUpdate for atomic operations
        # This makes the read and update operation atomic, preventing race conditions
        result = await db.users.find_one_and_update(
            {
                "email": user["email"],
                "credits": {"$gte": deduction_amount}  # Only proceed if user has sufficient credits
            },
            {
                "$inc": {"credits": -deduction_amount}  # Use $inc for atomic decrement
            },
            return_document=True  # Return the updated document
        )
        
        if not result:
            # Either user not found or insufficient credits
            user_data = await db.users.find_one({"email": user["email"]})
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # User found but insufficient credits
            current_credits = user_data.get("credits", 0)
            print(f"Insufficient credits for user {user['email']}: Current={current_credits}, Required={deduction_amount}")
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient credits. Current balance: {current_credits}, Required: {deduction_amount}"
            )
            
        # Get values for logging and response
        new_balance = result.get("credits", 0)
        previous_balance = new_balance + deduction_amount
        
        # Log the successful credit deduction
        print(f"CREDIT DEDUCTION: User={user['email']}, Before={previous_balance}, Deduct={deduction_amount}, After={new_balance}")
        
        # Record billing transaction
        await db.billing.insert_one({
            "user_email": user["email"],
            "vm_id": req.vm_id,
            "action": "runtime_charge",
            "cost": deduction_amount,
            "timestamp": datetime.utcnow(),
            "details": {
                "deduction_period": req.deduction_period,
                "previous_balance": previous_balance,
                "new_balance": new_balance
            }
        })

        return {
            "status": "success", 
            "deducted": deduction_amount,
            "previous_balance": previous_balance,
            "new_balance": new_balance
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in deduct_credits: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Credit deduction error: {str(e)}")

@router.post("/delete")#3
async def delete_vm(req: DeleteVMRequest, user=Depends(get_current_user)):
    """
    Delete a VM and optionally its associated disk file
    """
    try:
        # Verify VM exists and belongs to user
        vm = await db.vms.find_one({"_id": ObjectId(req.vm_id), "user_email": user["email"]})
        if not vm:
            raise HTTPException(status_code=404, detail="VM not found or doesn't belong to you")

        # If VM is still running, stop it first
        if vm.get("status") == "running":
            pid = vm.get("pid")
            if pid:
                try:
                    # Stop the process
                    if os.name == 'nt':
                        subprocess.run(["taskkill", "/F", "/PID", str(pid)], check=True)
                    else:
                        import signal
                        os.kill(pid, signal.SIGTERM)
                except Exception as e:
                    print(f"Failed to stop VM process: {str(e)}")
                    # Continue with deletion even if stopping fails

        # Get disk name for deletion
        disk_name = vm.get("disk_name")
        
        # Delete VM from database
        delete_result = await db.vms.delete_one({"_id": ObjectId(req.vm_id)})
        
        # Delete associated disk file if requested
        disk_deleted = False
        if req.delete_disk and disk_name:
            try:
                # Check if any other VMs use this disk (to avoid deleting shared disks)
                disk_usage_count = await db.vms.count_documents({
                    "disk_name": disk_name,
                    "user_email": user["email"]
                })
                
                # Only delete if this was the only VM using it
                if disk_usage_count == 0:
                    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
                    store_dir = os.path.join(base_dir, "store")
                    disk_path = os.path.join(store_dir, disk_name)
                    
                    if os.path.exists(disk_path):
                        os.remove(disk_path)
                        disk_deleted = True
            except Exception as e:
                print(f"Failed to delete disk file: {str(e)}")
                # Continue even if disk deletion fails
        
        return {
            "message": "VM deleted successfully",
            "vm_deleted": delete_result.deleted_count > 0,
            "disk_deleted": disk_deleted,
            "disk_name": disk_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete VM: {str(e)}")

@router.get("/list")#3
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
