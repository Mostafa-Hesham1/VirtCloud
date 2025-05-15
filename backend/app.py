from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers import docker, billing, vm_disk, vm_stats, vm_management
from database import db
from fastapi.responses import JSONResponse

app = FastAPI()

# Add middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add generic exception handler to ensure proper JSON responses
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    import traceback
    print(f"Unhandled exception: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Include routers
app.include_router(docker.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(vm_disk.router, prefix="/api")
app.include_router(vm_stats.router, prefix="/api")
app.include_router(vm_management.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the VirtCloud API"}