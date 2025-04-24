from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import vm
from routers import auth  # add auth router import
from routers import billing  # add billing router import
from database import db  # import Mongo client database

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
        # Ping MongoDB to verify connection
        await db.command({"ping": 1})
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)

@app.get("/")
def root():
    return {"message": "VirtCloud backend is running 🚀"}
