from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import vm, auth, billing, vm_management, vm_disk, vm_stats
from database import db  # import Mongo client database
from pymongo import ReadPreference
from routers.auth import get_current_user
from routers.docker import router as docker_router  # Import directly from the docker module

app = FastAPI(
    title="VirtCloud API",
    description="Backend system for managing VMs and Docker using QEMU and FastAPI",
    version="1.0.0"
)

# Improved CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register the routers
app.include_router(vm.router, prefix="/vm", tags=["Virtual Machines"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(billing.router, prefix="/billing", tags=["Billing & Plans"])
app.include_router(vm_management.router, prefix="/vm", tags=["VM Management"])
app.include_router(vm_disk.router, prefix="/vm/disk", tags=["VM Disk"])
app.include_router(vm_stats.router, prefix="/vm/stats", tags=["VM Stats"])
app.include_router(docker_router, prefix="/docker", tags=["Docker"])

@app.on_event("startup")
async def check_mongo_connection():
    try:
        # Ping MongoDB (allow secondary in case primary is down)
        db_secondary = db.with_options(read_preference=ReadPreference.SECONDARY_PREFERRED)
        await db_secondary.command({"ping": 1})
        print("✅ Connected to MongoDB successfully (secondaryPreferred)")
    except Exception as e:
        print("⚠️ MongoDB ping failed (primary might be down), continuing without primary:", e)

# Add a direct route for user credits
@app.get("/user/credits")
async def get_user_credits(user=Depends(get_current_user)):
    """Get the current user's credit balance"""
    try:
        user_data = await db.users.find_one({"email": user["email"]})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"credits": user_data.get("credits", 0)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user credits: {str(e)}")

@app.get("/")
def root():
    return {"message": "VirtCloud backend is running 🚀"}

