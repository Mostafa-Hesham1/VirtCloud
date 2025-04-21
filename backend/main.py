from fastapi import FastAPI
from routers import vm

app = FastAPI(
    title="VirtCloud API",
    description="Backend system for managing VMs and Docker using QEMU and FastAPI",
    version="1.0.0"
)

# Register the VM router
app.include_router(vm.router, prefix="/vm", tags=["Virtual Machines"])

@app.get("/")
def root():
    return {"message": "VirtCloud backend is running 🚀"}
