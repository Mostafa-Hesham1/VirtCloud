from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import vm, auth, billing
from database import db  # import Mongo client database
from pymongo import ReadPreference

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

@app.on_event("startup")
async def check_mongo_connection():
    try:
        # Ping MongoDB (allow secondary in case primary is down)
        db_secondary = db.with_options(read_preference=ReadPreference.SECONDARY_PREFERRED)
        await db_secondary.command({"ping": 1})
        print("✅ Connected to MongoDB successfully (secondaryPreferred)")
    except Exception as e:
        print("⚠️ MongoDB ping failed (primary might be down), continuing without primary:", e)

@app.get("/")
def root():
    return {"message": "VirtCloud backend is running 🚀"}
