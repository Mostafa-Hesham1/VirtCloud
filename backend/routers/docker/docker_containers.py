from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict
import docker
import time
import uuid
from datetime import datetime
from database import db
from ..auth import get_current_user
from .docker_common import get_docker_client

router = APIRouter()

# Models specific to container operations
class DockerContainerCreateRequest(BaseModel):
    image: str = Field(..., description="Image name to use (e.g., 'nginx:latest')")
    container_name: Optional[str] = Field(None, description="Name for the container")
    ports: Optional[Dict[str, str]] = Field(None, description="Port mappings (e.g., {'80/tcp': 8080})")
    environment: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    volumes: Optional[Dict[str, Dict[str, str]]] = Field(None, description="Volume mappings")
    command: Optional[str] = Field(None, description="Command to run")
    detach: bool = Field(True, description="Run container in background")

class DockerContainerStopRequest(BaseModel):
    container_id: str = Field(..., description="ID or name of the container to stop")
    timeout: int = Field(10, description="Timeout in seconds before killing the container")

class DockerContainerDeleteRequest(BaseModel):
    container_id: str = Field(..., description="ID or name of the container to delete")
    force: bool = Field(False, description="Force removal of the container")

# Create and run a container
@router.post("/create")
async def create_container(
    req: DockerContainerCreateRequest,
    user=Depends(get_current_user)
):
    """Create and run a Docker container"""
    try:
        client = get_docker_client()
        
        # Check if the image exists
        try:
            client.images.get(req.image)
        except docker.errors.ImageNotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Image '{req.image}' not found. Please pull it first."
            )
            
        # Prepare container options
        container_options = {
            "image": req.image,
            "detach": req.detach
        }
        
        # Handle container name conflicts by adding a suffix if needed
        if req.container_name:
            try:
                # Check if a container with this name already exists
                existing = client.containers.list(all=True, filters={"name": req.container_name})
                if existing:
                    # Add timestamp suffix to make name unique
                    timestamp = int(time.time())
                    container_options["name"] = f"{req.container_name}-{timestamp}"
                    print(f"Container name conflict detected. Using {container_options['name']} instead.")
                else:
                    container_options["name"] = req.container_name
            except Exception as e:
                print(f"Error checking for container name conflicts: {str(e)}")
                # Just use the requested name and handle any conflicts in the try/except below
                container_options["name"] = req.container_name
        
        if req.ports:
            container_options["ports"] = req.ports
            
        if req.environment:
            container_options["environment"] = req.environment
            
        if req.volumes:
            container_options["volumes"] = req.volumes
            
        if req.command:
            container_options["command"] = req.command
            
        # Create and start the container
        try:
            container = client.containers.run(**container_options)
        except docker.errors.APIError as e:
            if "Conflict" in str(e):
                # Handle container name conflict by generating a unique name
                unique_suffix = str(uuid.uuid4())[:8]
                if "name" in container_options:
                    container_options["name"] = f"{container_options['name']}-{unique_suffix}"
                else:
                    container_options["name"] = f"container-{unique_suffix}"
                
                # Try again with the new name
                container = client.containers.run(**container_options)
            else:
                raise
        
        # Save container record in database
        container_record = {
            "user_email": user["email"],
            "container_id": container.id,
            "container_name": container.name,
            "image": req.image,
            "created_at": datetime.utcnow(),
            "status": "running",
            "metadata": {
                "ports": req.ports,
                "environment": req.environment,
                "volumes": req.volumes,
                "command": req.command
            }
        }
        
        await db.docker_containers.insert_one(container_record)
        
        return {
            "message": "Container created and started successfully",
            "container_id": container.id,
            "container_name": container.name,
            "status": "running"
        }
        
    except HTTPException:
        raise
    except docker.errors.APIError as e:
        if "Conflict" in str(e):
            raise HTTPException(
                status_code=409,
                detail=f"Container name conflict: {str(e)}. Please use a different name."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Docker API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create container: {str(e)}"
        )

# Stop a container
@router.post("/stop")
async def stop_container(
    req: DockerContainerStopRequest,
    user=Depends(get_current_user)
):
    """Stop a running Docker container"""
    try:
        client = get_docker_client()
        
        # Check if container exists
        try:
            container = client.containers.get(req.container_id)
        except docker.errors.NotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Container '{req.container_id}' not found"
            )
            
        # Check if the user owns this container
        db_container = await db.docker_containers.find_one({
            "container_id": container.id,
            "user_email": user["email"]
        })
        
        if not db_container:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to stop this container"
            )
            
        # Stop the container
        container.stop(timeout=req.timeout)
        
        # Update container status in database
        await db.docker_containers.update_one(
            {"container_id": container.id},
            {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
        )
        
        return {
            "message": "Container stopped successfully",
            "container_id": container.id,
            "container_name": container.name,
            "status": "stopped"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop container: {str(e)}"
        )

# Delete a container
@router.post("/delete")
async def delete_container(
    req: DockerContainerDeleteRequest,
    user=Depends(get_current_user)
):
    """Delete a Docker container"""
    try:
        client = get_docker_client()
        
        # Check if container exists
        try:
            container = client.containers.get(req.container_id)
        except docker.errors.NotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Container '{req.container_id}' not found"
            )
            
        # Check if the user owns this container or if it's system container
        db_container = await db.docker_containers.find_one({
            "container_id": container.id,
            "user_email": user["email"]
        })
        
        # Delete the container
        try:
            container.remove(force=req.force)
        except docker.errors.APIError as e:
            if "running" in str(e).lower():
                raise HTTPException(
                    status_code=400,
                    detail="Container is running. Stop it first or use force=true."
                )
            raise HTTPException(
                status_code=500,
                detail=f"Docker API error: {str(e)}"
            )
        
        # Remove container from database if it exists there
        if db_container:
            await db.docker_containers.delete_one({"container_id": container.id})
        
        return {
            "message": "Container deleted successfully",
            "container_id": container.id,
            "container_name": container.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete container: {str(e)}"
        )

# List running containers
@router.get("/list")
async def list_containers(user=Depends(get_current_user)):
    """List all Docker containers"""
    try:
        client = get_docker_client()
        
        # Get all containers (not just running ones)
        containers = client.containers.list(all=True)
        
        # Add debug print
        print(f"Found {len(containers)} containers to process")
        
        result = []
        for container in containers:
            try:
                # Format the base container info with defensive coding
                container_info = {
                    "id": container.id,
                    "short_id": getattr(container, 'short_id', container.id[:12]),
                    "name": getattr(container, 'name', 'unnamed'),
                    "status": getattr(container, 'status', 'unknown')
                }
                
                # Safely handle image information
                try:
                    if hasattr(container, 'image'):
                        image = container.image
                        if hasattr(image, 'tags') and image.tags:
                            container_info["image"] = image.tags[0]
                        else:
                            container_info["image"] = getattr(image, 'id', 'unknown-image')[:12]
                    else:
                        container_info["image"] = "unknown-image"
                except Exception as img_err:
                    print(f"Error processing container image: {str(img_err)}")
                    container_info["image"] = "error-accessing-image"
                
                # Safely handle created timestamp
                try:
                    if hasattr(container, 'attrs') and 'Created' in container.attrs:
                        created = container.attrs['Created']
                        container_info["created"] = datetime.fromtimestamp(created) if isinstance(created, (int, float)) else datetime.fromisoformat(created.replace('Z', '+00:00'))
                    else:
                        container_info["created"] = datetime.utcnow()
                except Exception as date_err:
                    print(f"Error processing creation date: {str(date_err)}")
                    container_info["created"] = datetime.utcnow()
                
                # Safely handle ports
                try:
                    container_info["ports"] = getattr(container, 'ports', {})
                except Exception as ports_err:
                    print(f"Error processing ports: {str(ports_err)}")
                    container_info["ports"] = {}
                
                # Safely handle command
                try:
                    if hasattr(container, 'attrs') and 'Config' in container.attrs and 'Cmd' in container.attrs['Config']:
                        container_info["command"] = container.attrs['Config']['Cmd']
                    else:
                        container_info["command"] = []
                except Exception as cmd_err:
                    print(f"Error processing command: {str(cmd_err)}")
                    container_info["command"] = []
                
                # Determine if container is running
                container_info["running"] = container_info["status"] == "running"
                
                # Lookup database record for this container
                db_container = await db.docker_containers.find_one({
                    "container_id": container.id,
                    "user_email": user["email"]
                })
                
                if db_container:
                    container_info["owned"] = True
                    container_info["metadata"] = db_container.get("metadata", {})
                else:
                    container_info["owned"] = False
                    
                result.append(container_info)
            except Exception as container_err:
                print(f"Error processing container {getattr(container, 'id', 'unknown-id')}: {str(container_err)}")
                # Continue to next container instead of failing completely
                continue
            
        return {"containers": result}
        
    except HTTPException:
        raise
    except docker.errors.APIError as e:
        print(f"Docker API error in list_containers: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Docker API error: {str(e)}. Please check Docker service status."
        )
    except docker.errors.DockerException as e:
        print(f"Docker Exception in list_containers: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Docker service error: {str(e)}. Please ensure Docker is running and accessible."
        )
    except Exception as e:
        print(f"Unexpected error in list_containers: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list containers: {str(e)}"
        )
