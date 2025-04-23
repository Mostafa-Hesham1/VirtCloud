from fastapi import FastAPI
from routers import vm
from routers import auth  # add auth router import
from database import db  # import Mongo client database

app = FastAPI(
    title="VirtCloud API",
    description="Backend system for managing VMs and Docker using QEMU and FastAPI",
    version="1.0.0"
)

# Register the VM router
app.include_router(vm.router, prefix="/vm", tags=["Virtual Machines"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])  # register auth endpoints

@app.on_event("startup")
async def check_mongo_connection():
    try:
        # Ping MongoDB to verify connection
        await db.command({"ping": 1})
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)

@app.get("/")
def root():
    return {"message": "VirtCloud backend is running 🚀"}
