from fastapi import APIRouter, HTTPException, Depends
from database import db
from .auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("/runtime")
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
                
                # Add to total cost for ALL users (removed plan check)
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
