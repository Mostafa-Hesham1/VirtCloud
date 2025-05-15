from fastapi import APIRouter, Depends
from .auth import get_current_user
from .docker_common import docker_available

router = APIRouter()

@router.get("/status")
async def get_docker_status(user=Depends(get_current_user)):
    """Get Docker daemon status."""
    return {"status": "available" if docker_available else "unavailable"}
