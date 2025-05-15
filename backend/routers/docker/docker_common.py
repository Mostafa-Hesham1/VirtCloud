import docker
from fastapi import HTTPException
import os

# Initialize Docker client
try:
    docker_client = docker.from_env()
    docker_client.ping()
    docker_available = True
    print("Docker daemon connection successful ✅")
except Exception as e:
    print(f"Warning: Docker client initialization error: {str(e)}")
    docker_client = None
    docker_available = False

def get_docker_client():
    """Ensure Docker client is available and connected."""
    if not docker_client:
        raise HTTPException(
            status_code=503,
            detail="Docker service is not available. Please ensure Docker is installed and running."
        )
    try:
        docker_client.ping()
        return docker_client
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Lost connection to Docker daemon: {str(e)}. Please restart Docker and try again."
        )

def get_dockerfiles_dir():
    """Get the directory for storing Dockerfiles."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    dockerfiles_dir = os.path.join(base_dir, "dockerfiles")
    os.makedirs(dockerfiles_dir, exist_ok=True)
    return dockerfiles_dir

def handle_docker_error(e):
    """Handle Docker-related errors and raise appropriate HTTP exceptions."""
    if isinstance(e, docker.errors.APIError):
        raise HTTPException(status_code=503, detail=f"Docker API error: {str(e)}")
    elif isinstance(e, docker.errors.DockerException):
        raise HTTPException(status_code=503, detail=f"Docker service error: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail=f"Unexpected Docker error: {str(e)}")
